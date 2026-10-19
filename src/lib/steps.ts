/**
 * 단계 메타데이터, 품질 점검, 단계 상태, "다음 할 일" 계산
 *
 * 이 파일의 결과가 화면 위쪽 띠·단계 목록·브리핑 페이지에 똑같이 쓰인다.
 * 사람과 브라우저 AI가 같은 문장을 읽게 하기 위해서다.
 */
import { authoringOf } from '@/lib/authoring';
import { GUIDES } from '@/guides';
import type { FolderState } from '@/lib/folder';
import { pad2 } from '@/lib/testid';
import {
  SCENE_NARRATION_MAX,
  SENTENCE_MAX,
  charCount,
  flagSentences,
  namesInScenes,
  sceneCountRange,
  sentenceLength,
  targetRange,
} from '@/lib/text';
import { STEP_NUMBERS, type Project, type StepNo } from '@/types/project';

export interface Check {
  /** 고칠 곳의 이름표 (data-testid) */
  id: string;
  label: string;
  ok: boolean;
  /** 실패했을 때 고치는 방법 */
  fix: string;
}

/** 프로젝트 밖의 환경 (이 브라우저의 작업 폴더 상태) */
export interface StepEnv {
  folder: FolderState | null;
}

export type StepStatus = 'done' | 'doing' | 'waiting' | 'blocked';

export const STATUS_LABEL: Record<StepStatus, string> = {
  done: '완료',
  doing: '진행',
  waiting: '대기',
  blocked: '막힘',
};

/** 첫 번째 실패 위치를 가리키는 점검 하나 만들기 */
function firstFailing<T>(
  items: T[],
  bad: (item: T) => boolean,
  make: (index: number) => { id: string; fix: string },
  label: string,
  emptyId: string,
): Check {
  const i = items.findIndex(bad);
  if (i < 0) return { id: emptyId, label, ok: true, fix: '' };
  return { ...make(i), label, ok: false };
}

/** 단계별 품질 점검. 아직 화면이 없는 단계는 "준비 중" 점검 하나만 돌려준다 */
export function checksFor(step: StepNo, p: Project, _env: StepEnv): Check[] {
  const guide = GUIDES[step];
  const authoring = authoringOf(p);
  const narrating = authoring.scriptMode === 'original_narration';
  const rightsOk = authoring.rights.confirmed && authoring.rights.status !== 'unknown' && authoring.rights.basis.trim().length > 0;
  if (!guide.implemented) {
    return [
      {
        id: `s${step}-not-ready`,
        label: '이 단계 화면 준비',
        ok: false,
        fix: '이 단계 화면은 다음 개발 단계에서 만듭니다. 운영자에게 알리고 여기서 멈추세요.',
      },
    ];
  }

  switch (step) {
    case 0: {
      const minutes = p.target.durationSec / 60;
      return [
        { id: 's0-title', label: '제목 있음', ok: p.title.trim().length > 0 && p.title !== '제목 없는 옛이야기', fix: '영상 제목을 입력하세요.' },
        { id: 's0-source-type', label: '원작 유형 선택됨', ok: p.source.type !== null, fix: '전래 민담 또는 순수 창작을 고르세요.' },
        { id: 's0-source-note', label: '출처 메모 10자 이상', ok: p.source.note.trim().length >= 10, fix: '줄거리를 어디서 알게 되었는지 10자 이상 적으세요.' },
        narrating ? { id: 'app-source-rights-confirm', label: '원문 이용 권리 확인', ok: rightsOk, fix: '원문·분석 화면에서 이용 권리의 근거와 작가 확인을 남기세요.' } : { id: 's0-no-commercial-book', label: '시판 그림책 미사용 확인', ok: p.source.noCommercialBookConfirmed, fix: '시판 그림책의 문장과 그림을 쓰지 않는다는 확인란에 체크하세요.' },
        { id: 's0-duration-min', label: narrating ? '원문 낭독 목표 길이(양수)' : '목표 길이 3~15분', ok: Number.isFinite(minutes) && (narrating ? minutes > 0 : minutes >= 3 && minutes <= 15), fix: narrating ? '원문 낭독 목표 길이는 0보다 큰 분으로 정하세요. 추정 분량은 참고 정보입니다.' : '목표 길이를 3분에서 15분 사이로 정하세요.' },
      ];
    }

    case 1: {
      const { min, max } = targetRange(p.target.durationSec);
      const n = charCount(p.script.fullText);
      const flags = flagSentences(p.script.fullText);
      const long = flags.filter((f) => f.kind === 'long');
      const notation = flags.filter((f) => f.kind !== 'long');
      const emptyOutline = p.script.outline.findIndex((l) => !l.trim());
      return [
        {
          id: emptyOutline < 0 ? 's1-outline-01' : `s1-outline-${pad2(emptyOutline + 1)}`,
          label: narrating || authoring.episode.seriesId ? '구간 요약(원문·연재는 선택)' : '기승전결 뼈대 4줄',
          ok: narrating || Boolean(authoring.episode.seriesId) || emptyOutline < 0,
          fix: `뼈대 ${['기', '승', '전', '결'][Math.max(0, emptyOutline)]} 줄을 채우세요.`,
        },
        {
          id: 's1-full-text',
          label: narrating ? '원문 낭독 본문 있음(분량은 참고)' : `원고 분량 ${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')}자`,
          ok: narrating ? n >= 100 : n >= min && n <= max,
          fix:
            n === 0
              ? '원고를 쓰거나, AI 요청문(s1-copy-request)으로 받은 원고를 붙여 넣으세요(s1-paste).'
              : `원고가 공백 빼고 ${n.toLocaleString('ko-KR')}자입니다. ${min.toLocaleString('ko-KR')}~${max.toLocaleString('ko-KR')}자로 ${n < min ? '늘리세요' : '줄이세요'}.`,
        },
        {
          id: 's1-flags',
          label: narrating ? '긴 문장 점검은 원문 낭독 참고 경고' : `긴 문장 없음 (${SENTENCE_MAX}자 이하)`,
          ok: narrating || long.length === 0,
          fix: `${long.map((f) => f.sentenceNo).slice(0, 5).join(', ')}번째 문장 등 ${long.length}개가 ${SENTENCE_MAX}자를 넘습니다. 원고 아래 표시된 문장을 둘로 나누세요.`,
        },
        {
          id: 's1-flags',
          label: narrating ? '영어·숫자는 원문 유지·발음 확인 대상' : '영어·숫자 표기 없음',
          ok: narrating || notation.length === 0,
          fix: `${notation.map((f) => f.sentenceNo).slice(0, 5).join(', ')}번째 문장에 영어나 숫자가 있습니다. 소리 나는 대로 한글로 바꾸세요.`,
        },
        {
          id: 's1-own-wording',
          label: narrating ? '권리 확인·검토 원문과 일치' : '원작 문장을 옮기지 않음 확인',
          ok: narrating ? rightsOk && (!authoring.material || (authoring.material.reviewConfirmed && authoring.material.reviewedText.replace(/\s/g, '') === p.script.fullText.replace(/\s/g, ''))) : p.script.ownWordingConfirmed,
          fix: narrating ? '원문·분석에서 권리와 추출문을 사람이 확인하고, 검토 본문을 제작 원고로 복사하세요. 내용이 다르면 각색 모드로 바꾸세요.' : '원고를 다시 읽고, 출판된 책의 문장을 옮긴 곳이 없으면 확인란에 체크하세요.',
        },
      ];
    }

    case 2: {
      const s = p.scenes;
      const { min, max } = sceneCountRange(p.target.durationSec);
      const narrationText = s.map((x) => x.narration).join('').replace(/\s/g, '');
      const nar = narrationText.length;
      const script = charCount(p.script.fullText);
      const coverage = script ? Math.abs(nar - script) / script : 1;
      const sid = (i: number, field: string) => `s2-scene-${pad2(i + 1)}-${field}`;
      return [
        {
          id: s.length ? 's2-scene-list' : 's2-split',
          label: `장면 ${min}~${max}개`,
          ok: s.length >= min && s.length <= max,
          fix: s.length
            ? `장면이 ${s.length}개입니다. ${min}~${max}개가 되도록 ${s.length < min ? '나누세요' : '합치세요'}.`
            : '「원고에서 장면 나누기」(s2-split)를 누르거나, AI 장면표를 붙여 넣으세요(s2-paste).',
        },
        firstFailing(
          s,
          (x) => !x.narration.trim() || sentenceLength(x.narration) > SCENE_NARRATION_MAX,
          (i) => ({
            id: sid(i, 'narration'),
            fix: `${i + 1}번 장면 내레이션이 ${s[i].narration.trim() ? `${sentenceLength(s[i].narration)}자입니다. ${SCENE_NARRATION_MAX}자 이하로 줄이거나 장면을 나누세요` : '비었습니다'}.`,
          }),
          `내레이션 장면당 ${SCENE_NARRATION_MAX}자 이하`,
          's2-scene-list',
        ),
        firstFailing(s, (x) => !x.visual.trim(), (i) => ({ id: sid(i, 'visual'), fix: `${i + 1}번 장면의 화면 설명을 쓰세요.` }), '모든 장면에 화면 설명', 's2-scene-list'),
        firstFailing(s, (x) => !x.location.trim(), (i) => ({ id: sid(i, 'location'), fix: `${i + 1}번 장면의 장소를 쓰세요.` }), '모든 장면에 장소', 's2-scene-list'),
        firstFailing(
          s,
          (x) => !x.characters.trim(),
          (i) => ({ id: sid(i, 'characters'), fix: `${i + 1}번 장면의 등장인물을 쓰세요. 인물이 없으면 "없음".` }),
          '모든 장면에 등장인물(없으면 "없음")',
          's2-scene-list',
        ),
        {
          id: 's2-scene-list',
          label: '내레이션 순서·문장이 원고와 일치',
          ok: coverage <= 0.1 && narrationText === p.script.fullText.replace(/\s/g, ''),
          fix: '최신 원고와 장면표의 문장 또는 순서가 다릅니다. 최신 원고로 장면표를 다시 반영하세요.',
        },
      ];
    }

    case 3: {
      const dna = p.visualDNA;
      const names = namesInScenes(p.scenes);
      const missing = [
        ...names.characters.filter((n) => !dna.characters.some((c) => c.name === n)),
        ...names.locations.filter((n) => !dna.locations.some((l) => l.name === n)),
      ];
      const usedChars = dna.characters.filter((c) => names.characters.includes(c.name));
      const usedLocs = dna.locations.filter((l) => names.locations.includes(l.name));
      const cid = (c: { name: string }, field: string) => `s3-character-${pad2(dna.characters.findIndex((x) => x.name === c.name) + 1)}-${field}`;
      const lid = (l: { name: string }) => `s3-location-${pad2(dna.locations.findIndex((x) => x.name === l.name) + 1)}-desc`;
      const primaries = usedChars.map((c) => c.colors[0].toLowerCase());
      const dup = primaries.findIndex((c, i) => primaries.indexOf(c) !== i);
      const field = (c: (typeof usedChars)[number]) => (['age', 'face', 'hair', 'outfit'] as const).find((f) => !c[f].trim());
      return [
        {
          id: dna.stylePreset === 'custom' ? 's3-custom-style' : 's3-style-preset',
          label: '화풍 정함',
          ok: dna.stylePreset !== null && (dna.stylePreset !== 'custom' || dna.customStyle.trim().length >= 10),
          fix: dna.stylePreset === 'custom' ? '직접 쓰는 화풍 설명을 10자 이상 쓰세요.' : '화풍 프리셋을 고르세요.',
        },
        {
          id: 's3-sync-cards',
          label: '장면표의 인물·장소가 모두 카드로 있음',
          ok: missing.length === 0,
          fix: `카드가 없는 이름: ${missing.join(', ')}. 「장면표에서 카드 맞추기」(s3-sync-cards)를 누르세요.`,
        },
        firstFailing(
          usedChars,
          (c) => Boolean(field(c)),
          (i) => ({ id: cid(usedChars[i], field(usedChars[i])!), fix: `${usedChars[i].name} 카드의 나이·얼굴·머리·옷을 모두 채우세요.` }),
          '인물 카드 채움 (나이·얼굴·머리·옷)',
          's3-character-list',
        ),
        {
          id: dup < 0 ? 's3-character-list' : cid(usedChars[dup], 'color-1'),
          label: '인물마다 첫째 대표 색이 다름',
          ok: dup < 0,
          fix: dup < 0 ? '' : `${usedChars[dup].name}의 첫째 대표 색이 다른 인물과 같습니다. 구분되는 색으로 바꾸세요.`,
        },
        firstFailing(
          usedLocs,
          (l) => l.desc.trim().length < 10,
          (i) => ({ id: lid(usedLocs[i]), fix: `장소 「${usedLocs[i].name}」 설명을 10자 이상 쓰세요(시대, 계절, 주요 사물, 빛).` }),
          '장소 카드 설명 10자 이상',
          's3-location-list',
        ),
        { id: 's3-negatives', label: '금지 요소 있음', ok: dna.negatives.trim().length > 0, fix: '그림에 넣지 않을 것(글자, 워터마크 등)을 쓰세요.' },
      ];
    }

    default:
      return [];
  }
}

/** 이 단계에 무언가 입력되어 있는지 (진행/대기 구분용) */
function hasWork(step: StepNo, p: Project): boolean {
  switch (step) {
    case 0:
      return p.source.type !== null || p.source.note.length > 0 || p.title !== '제목 없는 옛이야기';
    case 1:
      return p.script.fullText.length > 0 || p.script.outline.some(Boolean);
    case 2:
      return p.scenes.length > 0;
    case 3:
      return p.visualDNA.stylePreset !== null || p.visualDNA.characters.length > 0;
    case 4:
      return (p.authoring?.audio?.blocks.length ?? 0) > 0 || p.scenes.some((s) => s.audio.file);
    case 5:
      return p.visualDNA.characters.some((c) => c.refSheet.file) || (p.authoring?.media?.references.length ?? 0) > 0;
    case 6:
      return p.scenes.some((s) => s.image.file) || Object.keys(p.authoring?.media?.shots ?? {}).length > 0;
    case 7:
      return p.publish.youtubeTitle.length > 0;
  }
}

export function isComplete(step: StepNo, p: Project): boolean {
  return Boolean(p.progress[step]?.completedAt);
}

/** 막힘 사유. 앞 단계가 끝나지 않았거나 화면이 아직 없으면 막힌다 */
export function blockReason(step: StepNo, p: Project): string | null {
  if (!GUIDES[step].implemented) return '화면 준비 중 (다음 개발 단계)';
  for (const prev of STEP_NUMBERS) {
    if (prev >= step) break;
    if (!isComplete(prev, p)) return `${prev}단계 「${GUIDES[prev].title}」을 먼저 완료해야 합니다`;
  }
  return null;
}

export function stepStatus(step: StepNo, p: Project): StepStatus {
  if (isComplete(step, p)) return 'done';
  if (blockReason(step, p)) return 'blocked';
  return hasWork(step, p) ? 'doing' : 'waiting';
}

/** 지금 해야 할 단계 = 완료되지 않은 첫 단계. 모두 완료면 null */
export function currentStep(p: Project): StepNo | null {
  return STEP_NUMBERS.find((s) => !isComplete(s, p)) ?? null;
}

export interface NextAction {
  step: StepNo | null;
  text: string;
}

/**
 * "다음 할 일" 한 문장. 띠·브리핑 페이지가 모두 이 문장을 쓴다.
 * 형식: 무엇이 비었는지 + 어떻게 하는지 (이름표 포함)
 */
/** 구버전 백업의 뒤집힌 완료 기록도 인계 준비 완료로 오인하지 않는다. */
export function completionOrderIssue(step: StepNo, p: Project): string | null {
  const at = p.progress[step]?.completedAt;
  if (!at) return null;
  const time = Date.parse(at);
  if (!Number.isFinite(time)) return step + '단계 완료 날짜를 확인하고 다시 완료하세요.';
  for (const before of STEP_NUMBERS.filter((n) => n < step)) {
    const prev = p.progress[before]?.completedAt;
    if (!prev || Date.parse(prev) > time) return before + '단계 뒤에 ' + step + '단계를 다시 검토·완료하세요.';
  }
  return null;
}

export function nextAction(p: Project, env: StepEnv): NextAction {
  const stale = ([0, 1, 2, 3] as const).find((s) => !p.progress[s]?.completedAt || completionOrderIssue(s, p) || checksFor(s, p, env).some((c) => !c.ok));
  const step = stale ?? currentStep(p);
  if (step === null) return { step: null, text: '모든 단계를 완료했습니다. 작업 폴더의 파일로 영상을 편집하세요.' };

  const guide = GUIDES[step];
  if (step === 4 && [0, 1, 2, 3].every((n) => isComplete(n as StepNo, p))) {
    if (p.authoring?.scriptMode === 'original_narration') return { step: null, text: '원문 낭독 설정을 마쳤습니다. 다음은 오디오 화면(/p/' + p.id + '/audio)에서 성우와 낭독 블록을 정하고 내레이션부터 만드세요. 그림은 오디오 길이가 나온 뒤 필요한 구간만 만듭니다. 시리즈·회차에서 권리 근거와 회차 기록을 ZIP으로 보관하세요. handoff 1.0은 원문 권리 표현이 없어 초안으로 유지합니다.' };
    return { step: null, text: '스토리·장면표·캐릭터 설정을 마쳤습니다. 다음은 오디오 화면(/p/' + p.id + '/audio)에서 성우와 낭독 블록을 정해 내레이션부터 만드세요. 그림은 오디오 길이가 나온 뒤 필요한 구간만 만듭니다. 내보내기에서 handoff.json을 복사하거나 내려받아 제작 담당에게 전달할 수도 있습니다. 유료 생성은 별도 확인이 필요합니다.' };
  }
  if (!guide.implemented) {
    return {
      step,
      text: `${step}단계 「${guide.title}」 화면은 아직 준비 중입니다. 여기서 작업을 멈추고 운영자에게 알리세요.`,
    };
  }
  const orderIssue = completionOrderIssue(step, p);
  if (orderIssue) return { step, text: orderIssue + ' (완료 취소 s' + step + '-reopen 후 재확인)' };
  const failing = checksFor(step, p, env).find((c) => !c.ok);
  if (failing) {
    return { step, text: `${step}단계 「${guide.title}」: ${failing.fix} (이름표 ${failing.id})` };
  }
  return {
    step,
    text: `${step}단계 「${guide.title}」 점검을 모두 통과했습니다. 완료 버튼(s${step}-complete)을 누르세요.`,
  };
}
