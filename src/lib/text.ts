/**
 * 원고·장면 글 도구
 *
 * 분량 기준: 내레이션 1분 ≈ 250자 (공백 제외, 0.9배속 차분한 낭독 기준 추정치).
 * 첫 편을 실제로 녹음한 뒤 CHARS_PER_MIN을 보정한다.
 */
import { newId } from '@/lib/project';
import { PANEL_KEYS, type PanelKey, type SceneRecord } from '@/types/project';

export const CHARS_PER_MIN = 250;
export const SENTENCE_MAX = 40;
export const SCENE_NARRATION_MAX = 60;
export const LENGTH_TOLERANCE = 0.15;

/** 공백을 뺀 글자 수 */
export const charCount = (s: string) => s.replace(/\s/g, '').length;

/** 목표 분량 범위 (공백 제외 글자 수) */
export function targetRange(durationSec: number) {
  const target = Math.round((durationSec / 60) * CHARS_PER_MIN);
  return { target, min: Math.round(target * (1 - LENGTH_TOLERANCE)), max: Math.round(target * (1 + LENGTH_TOLERANCE)) };
}

/** 글자 수로 낭독 시간(초) 추정 */
export const estimateSec = (text: string) => Math.max(1, Math.round((charCount(text) / CHARS_PER_MIN) * 60));

/**
 * 문장 나누기: 마침표·물음표·느낌표·말줄임표 뒤, 또는 줄바꿈에서 자른다.
 * 따옴표로 끝나는 대사("…했어요.")도 한 문장으로 본다.
 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/\n+/)
    .flatMap((line) => line.match(/[^.?!…]+(?:[.?!…]+["'”’」』]?|$)/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 문장 길이 = 공백 포함 글자 수 (귀로 듣는 호흡 기준) */
export const sentenceLength = (s: string) => s.replace(/\s+/g, ' ').trim().length;

export interface TextFlag {
  kind: 'long' | 'latin' | 'digit';
  sentenceNo: number;
  sentence: string;
  detail: string;
}

/** 낭독 원고 점검: 긴 문장, 영어, 아라비아 숫자 */
export function flagSentences(text: string): TextFlag[] {
  const flags: TextFlag[] = [];
  splitSentences(text).forEach((s, i) => {
    const no = i + 1;
    const len = sentenceLength(s);
    if (len > SENTENCE_MAX) flags.push({ kind: 'long', sentenceNo: no, sentence: s, detail: `${len}자 (기준 ${SENTENCE_MAX}자 이하)` });
    const latin = s.match(/[A-Za-z]+/g);
    if (latin) flags.push({ kind: 'latin', sentenceNo: no, sentence: s, detail: `영어 표기: ${latin.join(', ')}` });
    const digits = s.match(/\d+/g);
    if (digits) flags.push({ kind: 'digit', sentenceNo: no, sentence: s, detail: `숫자 표기: ${digits.join(', ')} → 한글로 (예: 셋, 세 마리)` });
  });
  return flags;
}

/** 빈 장면 하나 */
export function emptyScene(panel: PanelKey = 'ki'): SceneRecord {
  return {
    id: newId('sc'),
    panel,
    narration: '',
    visual: '',
    location: '',
    characters: '',
    emotion: '',
    durationSec: 0,
    motionClip: false,
    image: { file: null, checks: [] },
    audio: { file: null, measuredSec: null },
  };
}

/**
 * 원고를 장면으로 자동 나누기.
 * 문장을 차례로 이어 붙이다가 내레이션이 60자를 넘기 전에 끊는다.
 * 기승전결은 원고 안 위치로 4등분해 미리 채운다(운영자가 고칠 수 있다).
 */
export function autoSplitScenes(fullText: string): SceneRecord[] {
  const sentences = splitSentences(fullText);
  const groups: string[] = [];
  let cur = '';
  for (const s of sentences) {
    const joined = cur ? `${cur} ${s}` : s;
    if (cur && sentenceLength(joined) > SCENE_NARRATION_MAX) {
      groups.push(cur);
      cur = s;
    } else {
      cur = joined;
    }
  }
  if (cur) groups.push(cur);

  const total = charCount(fullText) || 1;
  let seen = 0;
  return groups.map((g) => {
    const pos = seen / total;
    seen += charCount(g);
    const panel = PANEL_KEYS[Math.min(3, Math.floor(pos * 4))];
    const sc = emptyScene(panel);
    sc.narration = g;
    sc.durationSec = estimateSec(g);
    return sc;
  });
}

/** 장면의 등장인물 이름 목록. "없음"이면 빈 목록 */
export function characterNames(scene: Pick<SceneRecord, 'characters'>): string[] {
  const raw = scene.characters.trim();
  if (!raw || raw === '없음') return [];
  return [...new Set(raw.split(/[,，、]/).map((s) => s.trim()).filter(Boolean))];
}

/** 장면표에 나오는 모든 인물·장소 이름 (처음 나온 순서) */
export function namesInScenes(scenes: SceneRecord[]) {
  const characters: string[] = [];
  const locations: string[] = [];
  for (const sc of scenes) {
    for (const n of characterNames(sc)) if (!characters.includes(n)) characters.push(n);
    const loc = sc.location.trim();
    if (loc && !locations.includes(loc)) locations.push(loc);
  }
  return { characters, locations };
}

/** 장면 수 권장 범위: 1분당 4~7.5개 (6분 → 24~45개) */
export function sceneCountRange(durationSec: number) {
  const m = durationSec / 60;
  return { min: Math.round(m * 4), max: Math.round(m * 7.5) };
}
