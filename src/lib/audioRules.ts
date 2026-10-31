/**
 * 오디오 우선 제작 기록의 형식 검사와 낭독 블록 규칙.
 * 다른 lib을 가져오지 않아 project.ts·authoring.ts에서 순환 없이 쓴다.
 * 앱은 음성 생성·결제·재생·음량 측정을 하지 않는다. 사람이 외부 서비스에서 만든 결과를 기록한다.
 */
import type { AudioBlock, AudioPlan, AudioStage } from '@/types/authoring';

/** 장면표에서 필요한 부분만. SceneRecord도 그대로 들어간다 */
export interface SceneLike { id: string; narration: string; location: string }

export const AUDIO_STAGES: { value: AudioStage; label: string; who: string }[] = [
  { value: 'planned', label: '계획만 있음', who: '파일 없음' },
  { value: 'generated', label: '생성됨 (파일 등록)', who: '외부 서비스에서 만든 파일 이름을 적음' },
  { value: 'machine_checked', label: '기계 점검 (길이·원문 대조)', who: '실측 길이와 원문 일치를 기록. 들어 보았다는 뜻이 아님' },
  { value: 'human_listened', label: '사람 청취 (휴대폰 스피커)', who: '사람이 직접 듣고 발음·톤을 확인' },
  { value: 'locked', label: '잠금', who: '사람 청취 뒤 이 판본을 기준 길이로 확정' },
];
export const stageLabel = (s: AudioStage) => AUDIO_STAGES.find((x) => x.value === s)?.label ?? s;
/** 사람 청취·잠금은 파일과 실측 길이가 있어야 한다 */
export const stageNeedsMeasured = (s: AudioStage) => s === 'human_listened' || s === 'locked' || s === 'machine_checked';
export const stageNeedsFile = (s: AudioStage) => s !== 'planned';

/** 글 해시(cyrb53). 보안용이 아니라 원고·장면표가 바뀌었는지 알리는 용도 */
export function textHash(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export interface BlockView {
  /** 범위의 장면 순서 번호(1부터). 찾지 못하면 null */
  fromNo: number | null; toNo: number | null;
  text: string;
  /** 장면 ID가 없어졌거나 순서가 뒤집힘 */
  missing: boolean;
  /** 낭독문이 블록을 만들 때와 달라짐 */
  stale: boolean;
}

export function blockView(scenes: SceneLike[], b: AudioBlock): BlockView {
  const from = scenes.findIndex((s) => s.id === b.fromSceneId);
  const to = scenes.findIndex((s) => s.id === b.toSceneId);
  if (from < 0 || to < 0 || from > to) return { fromNo: from < 0 ? null : from + 1, toNo: to < 0 ? null : to + 1, text: '', missing: true, stale: true };
  const text = scenes.slice(from, to + 1).map((s) => s.narration).join('\n');
  return { fromNo: from + 1, toNo: to + 1, text, missing: false, stale: textHash(text) !== b.textHash };
}

/** 블록이 지금도 잠금 근거로 쓸 수 있는가 */
export function blockLockedAndFresh(scenes: SceneLike[], b: AudioBlock): boolean {
  const v = blockView(scenes, b);
  return b.stage === 'locked' && !v.missing && !v.stale && Boolean(b.file.trim()) && (b.measuredSec ?? 0) > 0;
}

export interface Coverage {
  /** 어떤 블록에도 들어가지 않은 장면 번호(1부터) */
  uncovered: number[];
  /** 둘 이상의 블록에 들어간 장면 번호 */
  overlapping: number[];
  /** 잠금·최신 상태인 블록의 실측 길이 합(초) */
  lockedSec: number;
  /** 실측 길이를 적은 모든 블록의 합(초) */
  measuredSec: number;
  lockedBlocks: number;
  staleBlocks: number;
}

export function coverageOf(scenes: SceneLike[], blocks: AudioBlock[]): Coverage {
  const count = new Array<number>(scenes.length).fill(0);
  let lockedSec = 0, measuredSec = 0, lockedBlocks = 0, staleBlocks = 0;
  for (const b of blocks) {
    const v = blockView(scenes, b);
    if (v.stale) staleBlocks++;
    if (!v.missing && v.fromNo && v.toNo) for (let i = v.fromNo - 1; i < v.toNo; i++) count[i]++;
    if (b.measuredSec && b.measuredSec > 0) measuredSec += b.measuredSec;
    if (blockLockedAndFresh(scenes, b)) { lockedBlocks++; lockedSec += b.measuredSec ?? 0; }
  }
  return {
    uncovered: count.map((c, i) => (c === 0 ? i + 1 : 0)).filter(Boolean),
    overlapping: count.map((c, i) => (c > 1 ? i + 1 : 0)).filter(Boolean),
    lockedSec, measuredSec, lockedBlocks, staleBlocks,
  };
}

/** 장소가 바뀌는 곳마다 나눈 시작 제안. 사람이 고칠 수 있다(장면 수·길이 고정값을 두지 않는다) */
export function suggestRanges(scenes: SceneLike[]): { fromIdx: number; toIdx: number; label: string }[] {
  const out: { fromIdx: number; toIdx: number; label: string }[] = [];
  let start = 0;
  for (let i = 1; i <= scenes.length; i++) {
    if (i === scenes.length || scenes[i].location.trim() !== scenes[start].location.trim()) {
      out.push({ fromIdx: start, toIdx: i - 1, label: scenes[start].location.trim() || '장소 미정' });
      start = i;
    }
  }
  return scenes.length ? out : [];
}

/** 백업 복원 때 오디오 기록 형식 검사 */
export function audioErrors(raw: unknown): string[] {
  const obj = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
  const str = (x: unknown) => typeof x === 'string';
  const numOrNull = (x: unknown) => x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0);
  const stage = (x: unknown) => AUDIO_STAGES.some((s) => s.value === x);
  const fail = ['authoring.audio: 오디오 기록 형식이 맞지 않습니다. 원본 백업을 보존하고 다시 확인하세요.'];
  if (!obj(raw) || !['genspark', 'other'].includes(String(raw.tool)) || !Array.isArray(raw.blocks) || !Array.isArray(raw.cues) || !obj(raw.voice) || !obj(raw.master)) return fail;
  const v = raw.voice;
  if (!['genspark', 'other'].includes(String(v.tool)) || !str(v.model) || !str(v.voiceName) || !str(v.settings) || !str(v.note)) return fail;
  const m = raw.master;
  if (!str(m.file) || !numOrNull(m.measuredSec) || !stage(m.stage) || !str(m.listeningNote) || !str(m.loudnessNote)) return fail;
  const ids = new Set<string>();
  for (const b of raw.blocks) {
    if (!obj(b) || !str(b.id) || !b.id || ids.has(b.id) || !str(b.label) || !str(b.fromSceneId) || !str(b.toSceneId) || !str(b.textHash) || !str(b.file) || !numOrNull(b.measuredSec) || !numOrNull(b.creditsShown) || !stage(b.stage) || !str(b.note)) return fail;
    ids.add(b.id);
  }
  for (const c of raw.cues) {
    if (!obj(c) || !str(c.id) || !c.id || ids.has(c.id) || !['ambience', 'point', 'music'].includes(String(c.kind)) || !str(c.anchorSceneId) || !str(c.description) || !['library', 'genspark', 'other'].includes(String(c.sourceKind)) || !str(c.sourceNote) || !str(c.licenseNote) || !str(c.file)) return fail;
    ids.add(c.id);
  }
  return [];
}

export type { AudioPlan };
