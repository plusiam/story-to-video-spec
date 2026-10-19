import { test, expect } from '@playwright/test';
import { audioErrors, blockView, coverageOf, suggestRanges, textHash } from '../../src/lib/audioRules';
import { authoringErrors, emptyAuthoring } from '../../src/lib/authoring';
import { audioOf, emptyAudio, masterProblem, newBlock, patchAudio, rebaseBlock, stageChangeProblem } from '../../src/lib/audioPlan';
import { invalidateEditedSteps, createEmptyProject, validateProjectJson } from '../../src/lib/project';
import { mediaErrors } from '../../src/lib/mediaRules';
import { autoSplitScenes } from '../../src/lib/text';
import type { Project } from '../../src/types/project';

/** 합성 시험 자료. 실제 작품 원고가 아니다 */
function fixture(): Project {
  const p = createEmptyProject('오디오 시험');
  p.script.fullText = Array.from({ length: 24 }, (_, i) => `시험 문장 ${i + 1}번이 조용히 지나갑니다.`).join(' ');
  p.scenes = autoSplitScenes(p.script.fullText).slice(0, 5).map((s, i) => ({ ...s, location: i < 3 ? '마당' : '부엌', narration: `합성 낭독문 ${i + 1}` }));
  p.progress = { 0: { completedAt: p.updatedAt }, 1: { completedAt: p.updatedAt }, 2: { completedAt: p.updatedAt }, 3: { completedAt: p.updatedAt } };
  return p;
}

test('블록은 장면 범위와 낭독문 해시로 연결되고 원고가 바뀌면 다시 확인 표시', () => {
  let p = fixture();
  const b = newBlock(p, 0, 2, '마당')!;
  expect(blockView(p.scenes, b).stale).toBe(false);
  p = { ...p, scenes: p.scenes.map((s, i) => (i === 1 ? { ...s, narration: '바뀐 문장' } : s)) };
  expect(blockView(p.scenes, b).stale).toBe(true);
  expect(blockView([], b).missing).toBe(true);
  expect(textHash('가')).not.toBe(textHash('나'));
});

test('단계는 파일·실측 길이 없이 올릴 수 없고, 원고가 바뀐 블록은 사람 청취·잠금을 쓸 수 없음', () => {
  let p = fixture();
  let b = newBlock(p, 0, 2, '마당')!;
  expect(stageChangeProblem(p, b, 'generated')).toContain('파일');
  b = { ...b, file: 'NB_01.mp3' };
  expect(stageChangeProblem(p, b, 'generated')).toBeNull();
  expect(stageChangeProblem(p, b, 'human_listened')).toContain('실측');
  b = { ...b, measuredSec: 12.4 };
  expect(stageChangeProblem(p, b, 'locked')).toBeNull();
  p = { ...p, scenes: p.scenes.map((s, i) => (i === 0 ? { ...s, narration: '다른 글' } : s)) };
  expect(stageChangeProblem(p, { ...b, stage: 'locked' }, 'locked')).toContain('원고가 바뀌었');
  const rebased = rebaseBlock(p, { ...b, stage: 'locked' }, 0, 2)!;
  expect(rebased.stage).toBe('machine_checked');
  expect(blockView(p.scenes, rebased).stale).toBe(false);
});

test('커버리지: 덮이지 않은 장면·겹침·잠금 길이 합, 마스터 잠금은 모든 장면이 잠금 블록에 덮여야 함', () => {
  let p = fixture();
  const a = newBlock(p, 0, 2, '마당')!;
  const c = newBlock(p, 2, 3, '겹침')!;
  const cov = coverageOf(p.scenes, [a, c]);
  expect(cov.uncovered).toEqual([5]);
  expect(cov.overlapping).toEqual([3]);
  const locked = { ...a, file: 'a.mp3', measuredSec: 20, stage: 'locked' as const };
  const rest = { ...newBlock(p, 3, 4, '부엌')!, file: 'b.mp3', measuredSec: 10, stage: 'locked' as const };
  p = patchAudio(p, (x) => ({ ...x, blocks: [locked, { ...rest, fromSceneId: p.scenes[3].id }], master: { ...x.master, file: 'm.mp3', measuredSec: 31 } }));
  expect(masterProblem(p, 'locked')).toBeNull();
  p = patchAudio(p, (x) => ({ ...x, blocks: [locked] }));
  expect(masterProblem(p, 'locked')).toContain('들어가지 않은 장면');
  expect(coverageOf(p.scenes, audioOf(p).blocks).lockedSec).toBe(20);
});

test('장소가 바뀌는 곳마다 나눈 제안', () => {
  const p = fixture();
  const r = suggestRanges(p.scenes);
  expect(r.map((x) => [x.fromIdx, x.toIdx, x.label])).toEqual([[0, 2, '마당'], [3, 4, '부엌']]);
  expect(suggestRanges([])).toEqual([]);
});

test('오디오 기록은 선택 확장이며 scenes·target·progress를 바꾸지 않아 단계 완료가 풀리지 않음', () => {
  const p = fixture();
  const before = JSON.stringify({ s: p.scenes, t: p.target, g: p.progress });
  const next = patchAudio(p, (a) => ({ ...a, blocks: [newBlock(p, 0, 1, '시작')!] }));
  expect(JSON.stringify({ s: next.scenes, t: next.target, g: next.progress })).toBe(before);
  expect(Object.keys(invalidateEditedSteps(p, next).progress)).toEqual(['0', '1', '2', '3']);
  const loaded = validateProjectJson(JSON.parse(JSON.stringify(next)));
  expect(loaded.errors).toEqual([]);
  expect(createEmptyProject('호환').authoring).toBeUndefined();
});

test('형식 검사: 올바른 기록은 통과하고 어긋난 기록은 복원 때 거부', () => {
  const a = emptyAuthoring();
  a.audio = emptyAudio();
  expect(authoringErrors(a)).toEqual([]);
  expect(audioErrors({ ...emptyAudio(), blocks: [{ id: 'x' }] })).not.toEqual([]);
  expect(audioErrors({ ...emptyAudio(), master: { ...emptyAudio().master, stage: 'approved' } })).not.toEqual([]);
  expect(audioErrors('x')).not.toEqual([]);
});

test('그림 배치(placement)는 선택 필드이며 값이 어긋나면 거부', () => {
  const ok = { tool: 'genspark', model: 'nano-banana-pro', references: [], shots: { s1: { pose: '', light: '', composition: '', avoid: '', result: null, placement: 'reuse', reuseOfSceneId: 's0' } } };
  expect(mediaErrors(ok)).toEqual([]);
  expect(mediaErrors({ ...ok, shots: { s1: { ...ok.shots.s1, placement: 'forever' } } })).not.toEqual([]);
  expect(mediaErrors({ ...ok, shots: { s1: { pose: '', light: '', composition: '', avoid: '', result: null } } })).toEqual([]);
});
