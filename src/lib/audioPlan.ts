/**
 * 오디오 우선 제작(성우·내레이션 블록·효과음 큐·마스터) 기록을 프로젝트에 읽고 쓰는 도우미.
 * 글과 기록만 다룬다. Genspark 접속·음성 생성·결제·재생은 하지 않는다.
 * authoring.audio는 scenes·target·progress와 따로 보관되어 단계 완료를 풀지 않는다.
 */
import { authoringOf, patchAuthoring } from '@/lib/authoring';
import { blockLockedAndFresh, blockView, coverageOf, stageNeedsFile, stageNeedsMeasured, textHash } from '@/lib/audioRules';
import { newId } from '@/lib/project';
import type { AudioBlock, AudioPlan, AudioStage, SoundCue } from '@/types/authoring';
import type { Project } from '@/types/project';

export function emptyAudio(): AudioPlan {
  return {
    tool: 'genspark',
    voice: { tool: 'genspark', model: '', voiceName: '', settings: '', note: '' },
    blocks: [], cues: [],
    master: { file: '', measuredSec: null, stage: 'planned', listeningNote: '', loudnessNote: '' },
  };
}
export const audioOf = (p: Project): AudioPlan => authoringOf(p).audio ?? emptyAudio();
export function patchAudio(p: Project, fn: (a: AudioPlan) => AudioPlan): Project {
  return patchAuthoring(p, { audio: fn(audioOf(p)) });
}

/** 장면 범위로 블록 하나를 만든다. 낭독 글 해시를 지금 상태로 고정한다 */
export function newBlock(p: Project, fromIdx: number, toIdx: number, label: string): AudioBlock | null {
  const from = p.scenes[fromIdx], to = p.scenes[toIdx];
  if (!from || !to || fromIdx > toIdx) return null;
  const text = p.scenes.slice(fromIdx, toIdx + 1).map((s) => s.narration).join('\n');
  return { id: newId('blk'), label, fromSceneId: from.id, toSceneId: to.id, textHash: textHash(text), file: '', measuredSec: null, creditsShown: null, stage: 'planned', note: '' };
}

/** 범위가 바뀌었거나 원고가 달라져 다시 맞출 때: 지금 글을 기준으로 해시를 갱신하고 사람 청취·잠금은 푼다 */
export function rebaseBlock(p: Project, b: AudioBlock, fromIdx: number, toIdx: number): AudioBlock | null {
  const fresh = newBlock(p, fromIdx, toIdx, b.label);
  if (!fresh) return null;
  // 글이 달라졌으니 사람 청취·잠금은 풀고, 파일·실측이 있으면 한 단계 낮은 쪽으로 돌린다
  const stage: AudioStage = !b.file.trim() ? 'planned' : (b.stage === 'human_listened' || b.stage === 'locked') ? ((b.measuredSec ?? 0) > 0 ? 'machine_checked' : 'generated') : b.stage;
  return { ...b, fromSceneId: fresh.fromSceneId, toSceneId: fresh.toSceneId, textHash: fresh.textHash, stage };
}

/**
 * 단계를 바꿀 수 있는지. 파일·실측 길이 없이 높은 단계로 올릴 수 없고,
 * 낭독문이 달라진 블록은 사람 청취·잠금을 쓸 수 없다. 사람 청취는 사람이 직접 고른다(앱은 자동 지정하지 않는다).
 */
export function stageChangeProblem(p: Project, b: AudioBlock, next: AudioStage): string | null {
  if (stageNeedsFile(next) && !b.file.trim()) return '파일 이름을 먼저 적으세요.';
  if (stageNeedsMeasured(next) && !((b.measuredSec ?? 0) > 0)) return '실측 길이(초)를 먼저 적으세요.';
  if ((next === 'human_listened' || next === 'locked') && blockView(p.scenes, b).stale) return '원고가 바뀌었거나 장면 범위를 찾을 수 없습니다. 「지금 글로 다시 맞추기」를 먼저 하세요.';
  return null;
}

export function newCue(p: Project): SoundCue {
  return { id: newId('cue'), kind: 'point', anchorSceneId: p.scenes[0]?.id ?? '', description: '', sourceKind: 'library', sourceNote: '', licenseNote: '', file: '' };
}

export function formatSec(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`;
}

/** 마스터(내레이션+효과음+음악을 섞은 파일)의 단계 변경 조건. 잠금은 모든 장면이 최신·잠금 블록에 덮여야 한다 */
export function masterProblem(p: Project, next: AudioStage): string | null {
  const a = audioOf(p);
  if (stageNeedsFile(next) && !a.master.file.trim()) return '마스터 파일 이름을 먼저 적으세요.';
  if (stageNeedsMeasured(next) && !((a.master.measuredSec ?? 0) > 0)) return '마스터 실측 길이(초)를 먼저 적으세요.';
  if (next === 'human_listened' || next === 'locked') {
    const cov = coverageOf(p.scenes, a.blocks);
    if (cov.uncovered.length) return `블록에 들어가지 않은 장면이 있습니다(장면 ${cov.uncovered.slice(0, 5).join(', ')}${cov.uncovered.length > 5 ? ' …' : ''}).`;
    if (cov.overlapping.length) return '겹치는 블록이 있습니다. 범위를 고치세요.';
    if (a.blocks.some((b) => !blockLockedAndFresh(p.scenes, b))) return '모든 블록이 최신 글 기준으로 잠겨 있어야 합니다.';
  }
  return null;
}
