/**
 * 그림 꾸러미 (Genspark용 컷 카드)
 *
 * Genspark 이미지 화면에는 인물을 이름으로 등록해 두는 기능이 없어서(2026-10-19 화면 확인),
 * 일관성은 "매번 같은 기준 이미지를 같은 순서로 첨부"하는 방식으로 지킨다.
 * 그래서 카드는 인물 외모를 글로 다시 설명하지 않고 "N번 이미지의 인물"로 부른다.
 * 기준 이미지가 없는 인물만 글 설명으로 대신하고 경고한다.
 *
 * 이 모듈은 글을 만들기만 한다. Genspark 접속·생성·결제·승인은 하지 않는다.
 * 기존 handoff 1.0과 imagePrompt.ts(Gemini 앱용)는 바꾸지 않는다.
 */
import { authoringOf, patchAuthoring } from '@/lib/authoring';
export { GENSPARK_MODELS, modelInfo } from '@/lib/mediaRules';
import { describeCharacter, styleText } from '@/lib/imagePrompt';
import { characterNames } from '@/lib/text';
import { modelInfo } from '@/lib/mediaRules';
import type { MediaPlan, MediaReference, ShotPlan, ShotResult } from '@/types/authoring';
import type { Project, SceneRecord } from '@/types/project';

export function emptyMedia(): MediaPlan {
  return { tool: 'genspark', model: 'nano-banana-2.1', references: [], shots: {} };
}
export function emptyShot(): ShotPlan {
  return { pose: '', light: '', composition: '', avoid: '', result: null };
}
export const mediaOf = (p: Project): MediaPlan => authoringOf(p).media ?? emptyMedia();
export const shotOf = (m: MediaPlan, sceneId: string): ShotPlan => m.shots[sceneId] ?? emptyShot();
export function patchMedia(p: Project, fn: (m: MediaPlan) => MediaPlan): Project {
  return patchAuthoring(p, { media: fn(mediaOf(p)) });
}

/** 추천 파일 이름. 공백·경로 문자는 밑줄로 바꾼다 */
export function suggestedRefName(name: string, angle: string, version: number): string {
  const safe = (s: string) => s.trim().replace(/[\s/\\:*?"<>|]+/g, '_') || '미정';
  return `REF_${safe(name)}_${safe(angle)}_v${version}.png`;
}

/** 기준 이미지 하나를 고친다. 파일·각도·대상이 바뀌면 판본을 올리고 승인을 푼다 */
export function editReference(ref: MediaReference, patch: Partial<Pick<MediaReference, 'name' | 'kind' | 'angle' | 'file'>>): MediaReference {
  const next = { ...ref, ...patch };
  const changed = next.file !== ref.file || next.angle !== ref.angle || next.name !== ref.name || next.kind !== ref.kind;
  if (!changed) return ref;
  // 아직 파일을 한 번도 적지 않은 새 항목은 판본을 올리지 않는다(기록할 이전 판본이 없다)
  return { ...next, version: ref.file.trim() ? ref.version + 1 : ref.version, approved: false };
}

interface Attachment { key: string; file: string; label: string; owner: string }
interface CastLine { name: string; numbers: number[]; fallback: string | null }

/** 3단계 기준 시트가 승인되어 있으면 첫 기준 이미지로 함께 쓴다 */
function characterRefs(p: Project, m: MediaPlan, name: string): Attachment[] {
  const card = p.visualDNA.characters.find((c) => c.name === name);
  const out: Attachment[] = [];
  if (card?.refSheet.approved && card.refSheet.file) out.push({ key: `sheet:${card.id}@${card.refSheet.file}`, file: card.refSheet.file, label: '3단계 기준 시트', owner: name });
  for (const r of m.references) {
    if (r.kind === 'character' && r.name === name && r.approved && r.file.trim()) out.push({ key: `${r.id}@v${r.version}`, file: r.file.trim(), label: r.angle.trim() || '각도 미정', owner: name });
  }
  return out;
}

export interface ShotCard { text: string; attachments: Attachment[]; cast: CastLine[]; warnings: string[] }

/** 장면 하나의 컷 카드와 경고를 만든다 */
export function buildShotCard(p: Project, scene: SceneRecord, m: MediaPlan): ShotCard {
  const shot = shotOf(m, scene.id);
  const attachments: Attachment[] = [];
  const cast: CastLine[] = [];
  const warnings: string[] = [];
  for (const name of characterNames(scene)) {
    const card = p.visualDNA.characters.find((c) => c.name === name);
    const refs = characterRefs(p, m, name);
    const start = attachments.length;
    attachments.push(...refs);
    const numbers = refs.map((_, i) => start + i + 1);
    if (!card) warnings.push(`장면표의 인물 「${name}」에 맞는 인물 카드가 없습니다. 3단계에서 카드를 만들거나 장면표 이름을 고치세요.`);
    if (!refs.length) warnings.push(`「${name}」: 승인된 기준 이미지가 없어 글 설명으로 대신합니다. 회차·컷마다 모습이 달라질 수 있습니다.`);
    cast.push({ name, numbers, fallback: refs.length ? null : card ? describeCharacter(card) : name });
  }
  const locName = scene.location.trim();
  const loc = p.visualDNA.locations.find((l) => l.name === locName);
  const locStart = attachments.length;
  for (const r of m.references) {
    if (r.kind === 'location' && r.name === locName && r.approved && r.file.trim()) attachments.push({ key: `${r.id}@v${r.version}`, file: r.file.trim(), label: r.angle.trim() || '장소', owner: locName });
  }
  const locNumbers = attachments.slice(locStart).map((_, i) => locStart + i + 1);

  const info = modelInfo(m.model);
  if (info.refLimit !== null && attachments.length > info.refLimit) {
    warnings.push(`${info.label}은(는) 참조 이미지를 ${info.refLimit}장까지 받습니다. 이 컷은 ${attachments.length}장입니다. 모델을 바꾸거나 각도 수를 줄이세요.`);
  }
  if (!scene.visual.trim()) warnings.push('장면표의 화면 설명이 비어 있습니다. 2단계에서 그림으로 보여 줄 장면을 적으세요.');
  if (!shot.pose.trim() && scene.emotion.trim()) warnings.push(`표정·몸짓이 비어 있습니다. 장면표의 감정(「${scene.emotion.trim()}」)을 눈에 보이는 모습으로 적으면 의도가 더 잘 전달됩니다.`);

  const nums = (ns: number[]) => ns.join('·') + '번';
  const lines: string[] = [];
  if (attachments.length) {
    lines.push('[첨부 순서] 아래 순서대로 이미지를 첨부했습니다.');
    attachments.forEach((a, i) => lines.push(`${i + 1}: ${a.file} (${a.owner}, ${a.label})`));
  } else {
    lines.push('[첨부] 없음');
  }
  const style = styleText(p);
  if (style) lines.push(`[화풍] ${style}`);
  lines.push('[화면] 16:9 가로 화면. 인물을 크게, 배경은 단순하게, 밝고 대비가 분명하게.');
  if (cast.length) {
    lines.push('[인물]');
    for (const c of cast) {
      lines.push(c.numbers.length
        ? `- ${c.name}: ${nums(c.numbers)} 이미지 속 대상과 같은 존재. 생김새·색·옷차림을 그대로 유지.`
        : `- ${c.fallback}`);
    }
  } else {
    lines.push('[인물] 없음 (풍경만)');
  }
  if (locName) {
    const desc = loc?.desc.trim() ? `${locName}: ${loc.desc.trim()}` : locName;
    lines.push(`[장소] ${desc}${locNumbers.length ? ` (${nums(locNumbers)} 이미지의 장소)` : ''}`);
  }
  if (scene.visual.trim()) lines.push(`[장면] ${scene.visual.trim()}`);
  if (shot.pose.trim()) lines.push(`[표정·몸짓] ${shot.pose.trim()}`);
  if (shot.light.trim()) lines.push(`[빛·계절] ${shot.light.trim()}`);
  if (shot.composition.trim()) lines.push(`[구도] ${shot.composition.trim()}`);
  const avoid = [p.visualDNA.negatives.trim(), shot.avoid.trim(), attachments.length ? '첨부 이미지 속 인물의 얼굴·체형 변형' : ''].filter(Boolean);
  if (avoid.length) lines.push(`[넣지 말 것] ${avoid.join('; ')}`);
  return { text: lines.join('\n'), attachments, cast, warnings };
}

/** 결과를 기록한 뒤 이 컷에 쓰이는 기준 이미지가 바뀌었는가 */
export function isResultStale(p: Project, scene: SceneRecord, m: MediaPlan): boolean {
  const result = shotOf(m, scene.id).result;
  if (!result) return false;
  const now = buildShotCard(p, scene, m).attachments.map((a) => a.key);
  return JSON.stringify(now) !== JSON.stringify(result.refsUsed);
}

export function makeResult(p: Project, scene: SceneRecord, m: MediaPlan, input: { file: string; attempt: number; reason: string }): ShotResult {
  return {
    file: input.file.trim(),
    model: modelInfo(m.model).label,
    attempt: input.attempt,
    reason: input.reason.trim(),
    refsUsed: buildShotCard(p, scene, m).attachments.map((a) => a.key),
    recordedAt: new Date().toISOString(),
  };
}

