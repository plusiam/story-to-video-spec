/**
 * 프로젝트 생성·시간·로그 도우미
 */
import { authoringErrors, authoringOf } from '@/lib/authoring';
import { SCHEMA_VERSION, type Project, type LogEntry } from '@/types/project';

/** 한국 시간(+09:00) ISO 문자열. 작업 기록이 운영자 시계와 같게 보이도록 한다 */
export function nowIso(date: Date = new Date()): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace('Z', '+09:00').replace(/\.\d{3}/, '');
}

/** "20:41" 형식 시각 */
export function clock(iso: string): string {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '';
}

/** 사람이 읽기 쉬운 짧은 ID (예: proj_k3x9a2) */
export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${rand}`;
}

export const LOG_LIMIT = 300;

/** 기본 말투: 시니어가 귀로 편하게 듣는 옛이야기 화법 */
export const DEFAULT_TONE = '할머니가 손주에게 들려주듯 다정하고 느긋한 말투. 문장 끝은 "~했단다", "~했지요", "~였어요"를 섞어 씁니다.';

/** 기본 금지 요소 (그림 안에 들어가면 안 되는 것) */
export const DEFAULT_NEGATIVES = '글자, 워터마크, 서명, 말풍선, 사실적인 사람 얼굴, 현대 물건';

export function appendLog(project: Project, event: string, guide: string | null = null): Project {
  const entry: LogEntry = { at: nowIso(), guide, event };
  return { ...project, log: [...project.log, entry].slice(-LOG_LIMIT) };
}

/** 새 프로젝트 기본값. 시니어 채널 기준값(16:9, 6분, 0.9배속, 쉼 0.6초)을 미리 넣는다 */
export function createEmptyProject(title = '제목 없는 옛이야기'): Project {
  const at = nowIso();
  const project: Project = {
    schemaVersion: SCHEMA_VERSION,
    id: newId('proj'),
    title,
    createdAt: at,
    updatedAt: at,
    source: { type: null, note: '', noCommercialBookConfirmed: false },
    target: { durationSec: 360, aspect: '16:9', series: '' },
    script: { outline: ['', '', '', ''], fullText: '', tone: DEFAULT_TONE, ownWordingConfirmed: false },
    visualDNA: {
      stylePreset: null,
      customStyle: '',
      negatives: DEFAULT_NEGATIVES,
      characters: [],
      locations: [],
    },
    scenes: [],
    voice: { service: 'typecast', voiceName: '', speed: 0.9, pauseSec: 0.6 },
    publish: { youtubeTitle: '', description: '', tags: [], aiDisclosure: true, policyChecks: {} },
    progress: {},
    log: [],
  };
  return appendLog(project, '프로젝트를 만들었습니다');
}

/**
 * 옛 버전 프로젝트를 최신 스키마로 올린다. 모르는 버전이면 그대로 돌려준다.
 * 1.0 → 1.1: 말투·원작 문장 확인 추가, 장면 장소·인물을 이름으로, 금지 요소를 글 한 줄로
 */
export function migrateProject(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.schemaVersion !== '1.0') return raw;
  const p = structuredClone(raw) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  p.script = {
    outline: p.script?.outline ?? ['', '', '', ''],
    fullText: p.script?.fullText ?? '',
    tone: DEFAULT_TONE,
    ownWordingConfirmed: false,
  };
  const negs = p.visualDNA?.negatives;
  p.visualDNA = {
    ...p.visualDNA,
    negatives: Array.isArray(negs) ? negs.join(', ') : DEFAULT_NEGATIVES,
    characters: (p.visualDNA?.characters ?? []).map((c: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      ...c,
      colors: [c.colors?.[0] ?? '#8B5A2B', c.colors?.[1] ?? '#F2E3C6', c.colors?.[2] ?? '#4A6741'],
      refSheet: { file: c.refSheet?.assetId ?? null, approved: Boolean(c.refSheet?.approved) },
    })),
  };
  p.scenes = (p.scenes ?? []).map((sc: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: sc.id,
    panel: sc.panel ?? 'ki',
    narration: sc.narration ?? '',
    visual: sc.visual ?? '',
    location: '',
    characters: '',
    emotion: sc.emotion ?? '',
    durationSec: sc.durationSec ?? 0,
    motionClip: Boolean(sc.motionClip),
    image: { file: sc.image?.assetId ?? null, checks: sc.image?.checks ?? [] },
    audio: { file: sc.audio?.assetId ?? null, measuredSec: sc.audio?.measuredSec ?? null },
  }));
  p.schemaVersion = SCHEMA_VERSION;
  p.log = [...(p.log ?? []), { at: nowIso(), guide: null, event: '프로젝트를 스키마 1.1로 올렸습니다' }];
  return p;
}

/**
 * 불러온 JSON 검사. 틀린 곳을 글로 돌려준다 (브라우저 AI가 읽고 고칠 수 있게).
 * 통과하면 errors가 빈 배열이다.
 */
export function validateProjectJson(raw: unknown): { project: Project | null; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { project: null, errors: ['JSON 최상위가 객체({ ... })가 아닙니다.'] };
  }
  const p = migrateProject(raw as Record<string, unknown>);
  if (p.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion이 "1.0" 또는 "${SCHEMA_VERSION}"이어야 합니다. 받은 값: ${JSON.stringify(p.schemaVersion)}`);
  }
  if (typeof p.id !== 'string' || !p.id) errors.push('id(문자열)가 없습니다.');
  if (typeof p.title !== 'string') errors.push('title(문자열)이 없습니다.');
  for (const key of ['source', 'target', 'script', 'visualDNA', 'voice', 'publish', 'progress'] as const) {
    if (typeof p[key] !== 'object' || p[key] === null) errors.push(`${key}(객체)가 없습니다.`);
  }
  if (!Array.isArray(p.scenes)) errors.push('scenes(배열)가 없습니다.');
  if (!Array.isArray(p.log)) errors.push('log(배열)가 없습니다.');
  if (p.authoring !== undefined) errors.push(...authoringErrors(p.authoring));
  return errors.length ? { project: null, errors } : { project: p as unknown as Project, errors };
}

/** 내용이 바뀌면 관련 확인과 이후 단계 완료를 해제한다. 승인 값은 자동으로 만들지 않는다. */
export function invalidateEditedSteps(previous: Project, candidate: Project): Project {
  const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  const sourceChanged = changed([previous.source.type, previous.source.note], [candidate.source.type, candidate.source.note]);
  const scriptChanged = changed([previous.script.outline, previous.script.tone, previous.script.fullText], [candidate.script.outline, candidate.script.tone, candidate.script.fullText]);
  const oldAuthoring = authoringOf(previous), newAuthoring = authoringOf(candidate);
  const sourceWorkChanged = changed([oldAuthoring.scriptMode, oldAuthoring.rights, oldAuthoring.material?.id, oldAuthoring.material?.revision, oldAuthoring.material?.reviewConfirmed], [newAuthoring.scriptMode, newAuthoring.rights, newAuthoring.material?.id, newAuthoring.material?.revision, newAuthoring.material?.reviewConfirmed]);
  let from = sourceWorkChanged ? 0 : 8;
  if (sourceChanged || changed(previous.target, candidate.target) || previous.title !== candidate.title || previous.source.noCommercialBookConfirmed !== candidate.source.noCommercialBookConfirmed) from = 0;
  if (scriptChanged || previous.script.ownWordingConfirmed !== candidate.script.ownWordingConfirmed) from = Math.min(from, 1);
  if (changed(previous.scenes, candidate.scenes)) from = Math.min(from, 2);
  const textDna = (dna: Project['visualDNA']) => ({ ...dna, characters: dna.characters.map((c) => ({ ...c, refSheet: undefined })), locations: dna.locations.map((l) => ({ ...l, refImage: undefined })) });
  if (changed(textDna(previous.visualDNA), textDna(candidate.visualDNA))) from = Math.min(from, 3);
  else if (changed(previous.visualDNA, candidate.visualDNA)) from = Math.min(from, 4);
  const progress = { ...candidate.progress };
  let reset = false;
  for (const key of Object.keys(progress)) {
    if (Number(key) >= from) { delete progress[Number(key) as keyof typeof progress]; reset = true; }
  }
  const globalStyleChanged = changed([previous.visualDNA.stylePreset, previous.visualDNA.customStyle, previous.visualDNA.negatives], [candidate.visualDNA.stylePreset, candidate.visualDNA.customStyle, candidate.visualDNA.negatives]);
  const visualDNA = { ...candidate.visualDNA, characters: candidate.visualDNA.characters.map((card) => {
    const old = previous.visualDNA.characters.find((c) => c.id === card.id);
    const imageChanged = globalStyleChanged || changed({ ...old, refSheet: undefined }, { ...card, refSheet: undefined }) || old?.refSheet.file !== card.refSheet.file;
    return imageChanged && card.refSheet.approved ? { ...card, refSheet: { ...card.refSheet, approved: false } } : card;
  }) };
  const next = { ...candidate, progress, visualDNA,
    source: sourceChanged ? { ...candidate.source, noCommercialBookConfirmed: false } : candidate.source,
    script: scriptChanged ? { ...candidate.script, ownWordingConfirmed: false } : candidate.script,
  };
  return reset ? appendLog(next, from + '단계 내용 변경으로 이후 완료를 해제했습니다. 다시 확인하세요.') : next;
}
