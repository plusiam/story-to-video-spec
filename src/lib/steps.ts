/**
 * 단계 메타데이터, 품질 점검, 단계 상태, "다음 할 일" 계산
 *
 * 이 파일의 결과가 화면 위쪽 띠·단계 목록·브리핑 페이지에 똑같이 쓰인다.
 * 사람과 브라우저 AI가 같은 문장을 읽게 하기 위해서다.
 */
import { GUIDES } from '@/guides';
import { STEP_NUMBERS, type Project, type StepNo } from '@/types/project';

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  /** 실패했을 때 고치는 방법 */
  fix: string;
}

export type StepStatus = 'done' | 'doing' | 'waiting' | 'blocked';

export const STATUS_LABEL: Record<StepStatus, string> = {
  done: '완료',
  doing: '진행',
  waiting: '대기',
  blocked: '막힘',
};

/** 단계별 품질 점검. 아직 화면이 없는 단계는 "준비 중" 점검 하나만 돌려준다 */
export function checksFor(step: StepNo, p: Project): Check[] {
  const guide = GUIDES[step];
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
        { id: 's0-no-commercial-book', label: '시판 그림책 미사용 확인', ok: p.source.noCommercialBookConfirmed, fix: '시판 그림책의 문장과 그림을 쓰지 않는다는 확인란에 체크하세요.' },
        { id: 's0-duration-min', label: '목표 길이 3~15분', ok: minutes >= 3 && minutes <= 15, fix: '목표 길이를 3분에서 15분 사이로 정하세요.' },
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
      return p.visualDNA.characters.some((c) => c.refSheet.assetId);
    case 5:
      return p.scenes.some((s) => s.image.assetId);
    case 6:
      return p.scenes.some((s) => s.audio.assetId);
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
 * "다음 할 일" 한 문장. 띠·브리핑 페이지·작업 기록이 모두 이 문장을 쓴다.
 * 형식: 무엇이 비었는지 + 어떻게 하는지 (이름표 포함)
 */
export function nextAction(p: Project): NextAction {
  const step = currentStep(p);
  if (step === null) return { step: null, text: '모든 단계를 완료했습니다. 묶음을 내려받아 편집하세요.' };

  const guide = GUIDES[step];
  if (!guide.implemented) {
    return {
      step,
      text: `${step}단계 「${guide.title}」 화면은 아직 준비 중입니다. 여기서 작업을 멈추고 운영자에게 알리세요.`,
    };
  }
  const failing = checksFor(step, p).find((c) => !c.ok);
  if (failing) {
    return { step, text: `${step}단계 「${guide.title}」: ${failing.fix} (이름표 ${failing.id})` };
  }
  return {
    step,
    text: `${step}단계 「${guide.title}」 점검을 모두 통과했습니다. 완료 버튼(s${step}-complete)을 누르세요.`,
  };
}
