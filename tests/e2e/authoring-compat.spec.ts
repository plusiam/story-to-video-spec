import { test, expect } from '@playwright/test';
import { emptyAuthoring, authoringErrors, parseEpisodeNotesInput } from '../../src/lib/authoring';
import { createEmptyProject, invalidateEditedSteps, validateProjectJson } from '../../src/lib/project';
import { checksFor } from '../../src/lib/steps';
import { buildHandoff } from '../../src/lib/handoff';
import { parseSettingsInput } from '../../src/lib/batchInput';
import { localStore } from '../../src/lib/storage';
import { buildNextEpisodeProject } from '../../src/lib/nextEpisode';
import type { ConfirmedEpisode, SeriesState } from '../../src/types/authoring';

test('기존 1.1 프로젝트에 확장을 강제로 추가하지 않고 그대로 복원', () => {
  const p = createEmptyProject('호환 시험');
  const before = JSON.stringify(p);
  const loaded = validateProjectJson(JSON.parse(before));
  expect(loaded.errors).toEqual([]);
  expect(JSON.stringify(loaded.project)).toBe(before);
  expect(loaded.project?.authoring).toBeUndefined();
});

test('원문 낭독은 22분·긴 문장·영어 숫자·빈 뼈대를 이유로 원문을 고치게 하지 않음', () => {
  const p = createEmptyProject('원문 낭독 시험');
  const a = emptyAuthoring();
  a.scriptMode = 'original_narration';
  a.rights = { status: 'own_work', basis: '시험자가 직접 작성한 합성 원고의 낭독 권리 확인', confirmed: true, confirmedAt: p.updatedAt };
  p.authoring = a;
  p.source = { type: 'original', note: '검사를 위한 자체 작성 합성 원문입니다.', noCommercialBookConfirmed: false };
  p.target.durationSec = 22 * 60;
  p.script.fullText = '이 문장은 PDF 자료를 위한 합성 원고이며 2027년이라는 숫자와 ABC 표기도 유지하고 실제 문장의 길이 역시 임의로 끊지 않습니다. '.repeat(40);
  expect(checksFor(0, p, { folder: null }).filter(c => !c.ok)).toEqual([]);
  expect(checksFor(1, p, { folder: null }).filter(c => !c.ok)).toEqual([]);
  a.rights.confirmed = false;
  expect(checksFor(1, p, { folder: null }).some(c => !c.ok)).toBe(true);
});

test('분량 JSON의 기본 상한은 유지하며 원문 모드만 양수 길이를 허용', () => {
  const s = JSON.stringify({ title: '시험', sourceType: 'original', sourceNote: '자체 작성한 합성 원고의 출처 메모', durationMin: 22 });
  expect(parseSettingsInput(s).value).toBeNull();
  expect(parseSettingsInput(s, { allowLongDuration: true }).value?.durationMin).toBe(22);
});

test('handoff 1.0에 원문·분석 확장을 자동 포함하지 않으며 원문 권리 호환은 초안 표시', () => {
  const p = createEmptyProject('비공개 원문 시험');
  const a = emptyAuthoring(); a.scriptMode = 'original_narration'; a.rights.basis = 'PRIVATE_SOURCE_SENTINEL';
  p.authoring = a;
  const h = buildHandoff(p);
  expect(JSON.stringify(h)).not.toContain('PRIVATE_SOURCE_SENTINEL');
  expect(h.readiness.status).toBe('draft');
  expect(h.readiness.issues.some(x => x.includes('handoff 1.0'))).toBe(true);
});

test('원문 모드·권리 변경 시 이전 단계 완료를 해제하고 잘못된 확장 백업은 거부', () => {
  const p = createEmptyProject('재검토 시험');
  p.progress = { 0: { completedAt: p.updatedAt }, 1: { completedAt: p.updatedAt } };
  const a = emptyAuthoring(); a.scriptMode = 'original_narration';
  const next = invalidateEditedSteps(p, { ...p, authoring: a });
  expect(next.progress).toEqual({});
  expect(authoringErrors(a)).toEqual([]);
  expect(validateProjectJson({ ...p, authoring: { ...a, material: { pages: true } } }).project).toBeNull();
});

test('프로젝트 비교 저장은 다른 창의 변경과 삭제를 덮어쓰지 않음', async () => {
  const data = new Map<string, string>();
  const ls = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value: { localStorage: ls }, configurable: true });
  try {
    const p = createEmptyProject('충돌 시험'); await localStore.save(p);
    const expected = JSON.stringify(p);
    const changed = { ...p, title: '다른 창에서 고침' }; await localStore.save(changed, expected);
    await expect(localStore.save({ ...p, title: '이전 창 값' }, expected)).rejects.toThrow('다른 창');
    expect((await localStore.get(p.id))?.title).toBe('다른 창에서 고침');
    await localStore.remove(p.id);
    await expect(localStore.save(p, JSON.stringify(changed))).rejects.toThrow('다른 창');
    expect(await localStore.get(p.id)).toBeNull();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'window', descriptor); else Reflect.deleteProperty(globalThis, 'window');
  }
});

function archived() {
  const p = createEmptyProject('합성 원고');
  const notes = emptyAuthoring().episode.notes;
  const episode: ConfirmedEpisode = { format: 'writer-kit.episode-record', formatVersion: '1.0', recordStatus: 'author_confirmed', seriesId: 'style-test', episodeId: 'ep-001', episodeNo: 1, title: p.title, projectId: p.id, revision: 1, basedOnSeriesRevision: 0, scriptText: '합성 원고의 문장입니다. '.repeat(20), scriptSha256: null, notes, confirmedBy: '시험', confirmedAt: p.updatedAt, guidelinePath: '작가 지침', characterCards: [{ id: 'c', name: '인물', age: '미정', face: '둥근 얼굴', hair: '짧은 머리', outfit: '회색 옷', props: '', colors: ['#112233', '#445566', '#778899'], refSheet: { file: 'refs/c.png', approved: true } }], locationCards: [], needsReview: false, styleSnapshot: { tone: '절제된 현대 서술', visualStyle: { stylePreset: 'custom', customStyle: '담백한 펜화', negatives: '글자 금지' }, voice: p.voice, durationSec: 22 * 60 } };
  const state: SeriesState = { format: 'writer-kit.series-state', formatVersion: '1.0', seriesId: episode.seriesId, title: '스타일 시험', revision: 1, updatedAt: p.updatedAt, latestConfirmedEpisodeId: episode.episodeId, episodeIndex: [{ episodeId: episode.episodeId, episodeNo: 1, revision: 1, title: p.title, recordPath: '회차/ep-001/rev-1/회차_기록.json', projectId: p.id, needsReview: false }], currentNotes: notes, guidelinePath: '작가 지침' };
  return { episode, state };
}
test('다음 회는 확정 기록의 말투·화풍을 잇되 승인·원고·권리는 초기화', () => {
  const { episode, state } = archived(); const next = buildNextEpisodeProject(state, episode);
  expect(next.script.tone).toBe('절제된 현대 서술'); expect(next.visualDNA.customStyle).toBe('담백한 펜화'); expect(next.target.durationSec).toBe(1320);
  expect(next.progress).toEqual({}); expect(next.script.fullText).toBe(''); expect(next.source.noCommercialBookConfirmed).toBe(false); expect(next.authoring?.rights.confirmed).toBe(false);
  expect(next.visualDNA.characters[0].refSheet.approved).toBe(false); expect(next.authoring?.episode.episodeNo).toBe(2);
});
test('옛 기록에 스타일 스냅샷이 없으면 기본값 확인 필요를 기록', () => {
  const { episode, state } = archived(); delete episode.styleSnapshot; const next = buildNextEpisodeProject(state, episode);
  expect(next.log.at(-1)?.event).toContain('스냅샷 없음');
});
test('다시 검토해야 할 회차가 남으면 다음 회 생성을 멈춤', () => {
  const { episode, state } = archived(); state.episodeIndex[0].needsReview = true;
  expect(() => buildNextEpisodeProject(state, episode)).toThrow('다시 검토');
});
test('시리즈와 다른 회차를 다음 회 기준으로 섞지 않음', () => {
  const { episode, state } = archived(); episode.seriesId = 'another-series';
  expect(() => buildNextEpisodeProject(state, episode)).toThrow('기준 회차');
});

test('회차 노트 JSON은 작업 초안 8개 항목만 반영', () => {
  const notes = { ...emptyAuthoring().episode.notes, summary: '합성 시험 요약', characterStates: '[원문] 상태 / [제안] 다음 변화' };
  expect(parseEpisodeNotesInput(JSON.stringify(notes)).value).toEqual(notes);
});
test('회차 노트 JSON에 승인·진행을 섞으면 전체를 거부', () => {
  const notes = { ...emptyAuthoring().episode.notes, summary: '원래 노트' };
  expect(parseEpisodeNotesInput(JSON.stringify({ ...notes, approved: true, progress: {} })).value).toBeNull();
  expect(notes.summary).toBe('원래 노트');
});
test('회차 노트 JSON의 누락·숫자·중첩 값은 거부', () => {
  const notes = emptyAuthoring().episode.notes;
  for (const raw of [{ summary: '누락' }, { ...notes, events: 3 }, { ...notes, characterStates: { approved: true } }]) expect(parseEpisodeNotesInput(JSON.stringify(raw)).value).toBeNull();
});
test('닫힌 JSON 울타리는 받고 잘못된 JSON은 노트를 바꾸지 않음', () => {
  const notes = emptyAuthoring().episode.notes;
  expect(parseEpisodeNotesInput('```json\n' + JSON.stringify(notes) + '\n```').value).toEqual(notes);
  expect(parseEpisodeNotesInput('{ broken').value).toBeNull();
});
