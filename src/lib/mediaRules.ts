/** 그림 꾸러미의 형식 검사와 승인 해제 규칙. 다른 lib을 가져오지 않아 project.ts·authoring.ts에서 순환 없이 쓴다. */
import type { GensparkModel } from '@/types/authoring';
import type { Project } from '@/types/project';

/** 2026-10-19 Genspark 화면·공식 도구 페이지 기준. 한도가 확인되지 않은 모델은 null */
export const GENSPARK_MODELS: { value: GensparkModel; label: string; refLimit: number | null; cost: string }[] = [
  { value: 'nano-banana-2.1', label: 'Nano Banana 2.1', refLimit: null, cost: '크레딧 0.63배' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro', refLimit: 14, cost: '크레딧 2.48배' },
  { value: 'gpt-image-2', label: 'GPT Image 2', refLimit: 16, cost: '크레딧 1배' },
  { value: 'nano-banana-2-flash-lite', label: 'Nano Banana 2 Flash Lite (Genspark 기본 선택)', refLimit: 4, cost: '크레딧 0.63배' },
  { value: 'other', label: '기타 모델 (한도 직접 확인)', refLimit: null, cost: '직접 확인' },
];
export const modelInfo = (m: GensparkModel) => GENSPARK_MODELS.find((x) => x.value === m) ?? GENSPARK_MODELS[GENSPARK_MODELS.length - 1];

/** 카드 외모·장소 설명·화풍이 바뀌면 해당 기준 이미지 승인을 푼다(3단계 기준 시트와 같은 규칙) */
export function revokeChangedReferences(previous: Project, candidate: Project): Project {
  const media = candidate.authoring?.media;
  if (!candidate.authoring || !media) return candidate;
  const changed = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  const styleChanged = changed(
    [previous.visualDNA.stylePreset, previous.visualDNA.customStyle, previous.visualDNA.negatives],
    [candidate.visualDNA.stylePreset, candidate.visualDNA.customStyle, candidate.visualDNA.negatives],
  );
  const changedChars = new Set(previous.visualDNA.characters.filter((old) => {
    const card = candidate.visualDNA.characters.find((c) => c.id === old.id);
    return !card || changed({ ...old, refSheet: undefined, elementName: undefined }, { ...card, refSheet: undefined, elementName: undefined });
  }).map((c) => c.name));
  const changedLocs = new Set(previous.visualDNA.locations.filter((old) => {
    const card = candidate.visualDNA.locations.find((l) => l.id === old.id);
    return !card || old.name !== card.name || old.desc !== card.desc;
  }).map((l) => l.name));
  let touched = false;
  const references = media.references.map((r) => {
    const hit = styleChanged || (r.kind === 'character' ? changedChars.has(r.name) : changedLocs.has(r.name));
    if (hit && r.approved) { touched = true; return { ...r, approved: false }; }
    return r;
  });
  return touched ? { ...candidate, authoring: { ...candidate.authoring, media: { ...media, references } } } : candidate;
}

/** 백업 복원 때 그림 꾸러미 형식 검사 */
export function mediaErrors(raw: unknown): string[] {
  const obj = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
  const str = (x: unknown) => typeof x === 'string';
  const fail = ['authoring.media: 그림 꾸러미 형식이 맞지 않습니다. 원본 백업을 보존하고 다시 확인하세요.'];
  if (!obj(raw) || raw.tool !== 'genspark' || !GENSPARK_MODELS.some((x) => x.value === raw.model) || !Array.isArray(raw.references) || !obj(raw.shots)) return fail;
  const ids = new Set<string>();
  for (const r of raw.references) {
    if (!obj(r) || !str(r.id) || !r.id || ids.has(r.id) || !['character', 'location'].includes(String(r.kind)) || !str(r.name) || !str(r.angle) || !str(r.file) || !Number.isInteger(r.version) || Number(r.version) < 1 || typeof r.approved !== 'boolean') return fail;
    ids.add(r.id);
  }
  for (const s of Object.values(raw.shots)) {
    if (!obj(s) || !str(s.pose) || !str(s.light) || !str(s.composition) || !str(s.avoid)) return fail;
    if (s.placement !== undefined && !['undecided', 'new', 'reuse', 'crop', 'title'].includes(String(s.placement))) return fail;
    if (s.reuseOfSceneId !== undefined && !str(s.reuseOfSceneId)) return fail;
    if (s.result !== null) {
      const r = s.result;
      if (!obj(r) || !str(r.file) || !str(r.model) || !Number.isInteger(r.attempt) || Number(r.attempt) < 1 || !str(r.reason) || !Array.isArray(r.refsUsed) || !r.refsUsed.every(str) || !str(r.recordedAt)) return fail;
    }
  }
  return [];
}
