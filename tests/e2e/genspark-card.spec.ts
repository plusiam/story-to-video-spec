import { test, expect } from '@playwright/test';
import { syncCards } from '../../src/lib/aiRequests';
import { buildHandoff } from '../../src/lib/handoff';
import { buildShotCard, editReference, emptyMedia, isResultStale, makeResult, mediaOf, patchMedia, suggestedRefName } from '../../src/lib/gensparkCard';
import { createEmptyProject, invalidateEditedSteps, validateProjectJson } from '../../src/lib/project';
import { autoSplitScenes } from '../../src/lib/text';
import type { MediaReference } from '../../src/types/authoring';
import type { Project } from '../../src/types/project';

/** 합성 시험 자료. 실제 작품 원고가 아니다 */
function fixture(): Project {
  const p = createEmptyProject('그림 꾸러미 시험');
  p.source = { type: 'folktale', note: '시험을 위한 합성 출처 메모입니다', noCommercialBookConfirmed: true };
  p.script = { outline: ['시작', '전개', '위기', '맺음'], tone: '다정한 말투', fullText: Array.from({ length: 30 }, () => '할머니는 문 앞의 보따리를 보고 놀랐어요.').join(' '), ownWordingConfirmed: true };
  p.scenes = autoSplitScenes(p.script.fullText).slice(0, 2).map((s) => ({ ...s, visual: '할머니가 툇마루에서 보따리를 내려다본다', location: '초가집 마당', characters: '할머니, 까치', emotion: '깨달음과 고마움', narration: '내레이션 비밀 문장' }));
  const cards = syncCards(p);
  p.visualDNA = { ...p.visualDNA, stylePreset: 'picturebook-watercolor', negatives: '글자, 워터마크', ...cards };
  p.visualDNA.characters = p.visualDNA.characters.map((c) => ({ ...c, age: '일흔 살', face: '주름진 둥근 얼굴', hair: '쪽진 흰머리', outfit: '흰 저고리', props: '' }));
  p.visualDNA.locations = p.visualDNA.locations.map((l) => ({ ...l, desc: '감나무가 있는 늦가을 마당' }));
  p.progress = { 0: { completedAt: p.updatedAt }, 1: { completedAt: p.updatedAt }, 2: { completedAt: p.updatedAt }, 3: { completedAt: p.updatedAt } };
  return p;
}
const ref = (id: string, kind: MediaReference['kind'], name: string, angle: string, approved = true): MediaReference => ({ id, kind, name, angle, file: suggestedRefName(name, angle, 1), version: 1, approved });
function withRefs(p: Project, refs: MediaReference[]): Project {
  return patchMedia(p, (m) => ({ ...m, references: refs }));
}

test('카드는 첨부 순서대로 번호를 붙이고 기준 이미지 있는 인물의 외모를 글로 다시 쓰지 않음', () => {
  const p = withRefs(fixture(), [ref('r1', 'character', '할머니', '정면'), ref('r2', 'character', '할머니', '옆'), ref('r3', 'character', '까치', '정면'), ref('r4', 'location', '초가집 마당', '전경')]);
  const card = buildShotCard(p, p.scenes[0], mediaOf(p));
  expect(card.attachments.map((a) => a.file)).toEqual(['REF_할머니_정면_v1.png', 'REF_할머니_옆_v1.png', 'REF_까치_정면_v1.png', 'REF_초가집_마당_전경_v1.png']);
  expect(card.text).toContain('- 할머니: 1·2번 이미지 속 대상과 같은 존재');
  expect(card.text).toContain('- 까치: 3번 이미지 속 대상과 같은 존재');
  expect(card.text).toContain('(4번 이미지의 장소)');
  expect(card.text).not.toContain('쪽진 흰머리');
  expect(card.text).toContain('[넣지 말 것] 글자, 워터마크; 첨부 이미지 속 인물의 얼굴·체형 변형');
  expect(card.text).toContain('16:9');
  expect(card.warnings).toHaveLength(1); // 표정·몸짓 비어 있음 안내만
});

test('감정·내레이션은 생성기 카드에 넣지 않고 표정 칸을 쓰도록 안내', () => {
  const p = fixture();
  const card = buildShotCard(p, p.scenes[0], mediaOf(p));
  expect(card.text).not.toContain('깨달음과 고마움');
  expect(card.text).not.toContain('내레이션 비밀 문장');
  expect(card.warnings.some((w) => w.includes('깨달음과 고마움') && w.includes('표정·몸짓'))).toBe(true);
  const filled = patchMedia(p, (m) => ({ ...m, shots: { [p.scenes[0].id]: { pose: '놀라서 손을 입에 댄다', light: '늦가을 오후', composition: '중간 거리', avoid: '현대 건물', result: null } } }));
  const card2 = buildShotCard(filled, filled.scenes[0], mediaOf(filled));
  expect(card2.text).toContain('[표정·몸짓] 놀라서 손을 입에 댄다');
  expect(card2.text).toContain('현대 건물');
  expect(card2.warnings.some((w) => w.includes('표정·몸짓'))).toBe(false);
});

test('기준 이미지가 없거나 미승인이면 글 설명으로 대신하고 경고', () => {
  const p = withRefs(fixture(), [ref('r1', 'character', '할머니', '정면', false)]);
  const card = buildShotCard(p, p.scenes[0], mediaOf(p));
  expect(card.attachments).toHaveLength(0);
  expect(card.text).toContain('[첨부] 없음');
  expect(card.text).toContain('쪽진 흰머리');
  expect(card.warnings.filter((w) => w.includes('승인된 기준 이미지가 없어'))).toHaveLength(2);
});

test('승인된 3단계 기준 시트는 첫 첨부로 함께 씀', () => {
  const base = fixture();
  base.visualDNA.characters[0].refSheet = { file: 'sheet_halmeoni.png', approved: true };
  const p = withRefs(base, [ref('r1', 'character', base.visualDNA.characters[0].name, '옆')]);
  const card = buildShotCard(p, p.scenes[0], mediaOf(p));
  expect(card.attachments[0].file).toBe('sheet_halmeoni.png');
  expect(card.attachments[1].file).toContain('_옆_');
});

test('모델별 참조 이미지 한도 초과를 경고', () => {
  const refs = ['정면', '옆', '뒤'].map((a, i) => ref('h' + i, 'character', '할머니', a)).concat(['정면', '옆'].map((a, i) => ref('k' + i, 'character', '까치', a)));
  const lite = patchMedia(withRefs(fixture(), refs), (m) => ({ ...m, model: 'nano-banana-2-flash-lite' }));
  expect(buildShotCard(lite, lite.scenes[0], mediaOf(lite)).warnings.some((w) => w.includes('4장까지') && w.includes('5장'))).toBe(true);
  const pro = patchMedia(lite, (m) => ({ ...m, model: 'nano-banana-pro' }));
  expect(buildShotCard(pro, pro.scenes[0], mediaOf(pro)).warnings.some((w) => w.includes('장까지'))).toBe(false);
});

test('카드에 없는 인물 이름과 빈 화면 설명을 경고', () => {
  const p = fixture();
  p.scenes[0] = { ...p.scenes[0], characters: '할머니, 나그네', visual: '' };
  const w = buildShotCard(p, p.scenes[0], mediaOf(p)).warnings;
  expect(w.some((x) => x.includes('「나그네」에 맞는 인물 카드가 없습니다'))).toBe(true);
  expect(w.some((x) => x.includes('화면 설명이 비어'))).toBe(true);
});

test('파일·각도를 바꾸면 판본이 오르고 확인이 풀림, 같은 값이면 그대로', () => {
  const r = ref('r1', 'character', '할머니', '정면');
  const changed = editReference(r, { file: 'REF_할머니_정면_v2.png' });
  expect(changed.version).toBe(2);
  expect(changed.approved).toBe(false);
  expect(editReference(r, { file: r.file, angle: r.angle })).toBe(r);
  const fresh = { ...r, file: '', approved: false };
  expect(editReference(fresh, { angle: '옆' }).version).toBe(1);
});

test('결과 기록 뒤 기준 이미지가 바뀌면 다시 확인 표시', () => {
  let p = withRefs(fixture(), [ref('r1', 'character', '할머니', '정면'), ref('r2', 'character', '까치', '정면')]);
  const result = makeResult(p, p.scenes[0], mediaOf(p), { file: '장면01_v1.png', attempt: 2, reason: '표정이 가장 자연스러움' });
  expect(result.refsUsed).toEqual(['r1@v1', 'r2@v1']);
  p = patchMedia(p, (m) => ({ ...m, shots: { [p.scenes[0].id]: { pose: '', light: '', composition: '', avoid: '', result } } }));
  expect(isResultStale(p, p.scenes[0], mediaOf(p))).toBe(false);
  p = patchMedia(p, (m) => ({ ...m, references: m.references.map((x) => (x.id === 'r1' ? { ...editReference(x, { file: 'REF_할머니_정면_v2.png' }), approved: true } : x)) }));
  expect(isResultStale(p, p.scenes[0], mediaOf(p))).toBe(true);
});

test('인물 외모가 바뀌면 그 인물 기준 이미지만, 화풍이 바뀌면 전부 확인이 풀림', () => {
  const base = withRefs(fixture(), [ref('r1', 'character', '할머니', '정면'), ref('r2', 'character', '까치', '정면'), ref('r3', 'location', '초가집 마당', '전경')]);
  const halmeoni = base.visualDNA.characters.findIndex((c) => c.name === '할머니');
  const outfit = structuredClone(base);
  outfit.visualDNA.characters[halmeoni].outfit = '쪽빛 저고리';
  const after = invalidateEditedSteps(base, outfit);
  expect(mediaOf(after).references.map((r) => r.approved)).toEqual([false, true, true]);
  const style = structuredClone(base);
  style.visualDNA.stylePreset = 'minhwa';
  expect(mediaOf(invalidateEditedSteps(base, style)).references.every((r) => !r.approved)).toBe(true);
});

test('그림 꾸러미만 바꾸면 단계 완료와 handoff 내용이 그대로', () => {
  const base = fixture();
  const changed = withRefs(base, [ref('r1', 'character', '할머니', '정면')]);
  const after = invalidateEditedSteps(base, changed);
  expect(Object.keys(after.progress)).toEqual(['0', '1', '2', '3']);
  const strip = (h: unknown) => JSON.parse(JSON.stringify(h, (k, v) => (k === 'exportedAt' || k === 'createdAt' || k === 'generatedAt' ? undefined : v)));
  expect(strip(buildHandoff(after))).toEqual(strip(buildHandoff(base)));
});

test('백업 복원: 정상 꾸러미는 통과, 잘못된 모델·중복 ID·잘못된 결과는 거부, 꾸러미 없는 프로젝트도 통과', () => {
  const ok = withRefs(fixture(), [ref('r1', 'character', '할머니', '정면')]);
  expect(validateProjectJson(JSON.parse(JSON.stringify(ok))).errors).toEqual([]);
  expect(validateProjectJson(JSON.parse(JSON.stringify(fixture()))).errors).toEqual([]);
  const badModel = patchMedia(ok, (m) => ({ ...m, model: 'dall-e' as never }));
  expect(validateProjectJson(JSON.parse(JSON.stringify(badModel))).project).toBeNull();
  const dup = withRefs(ok, [ref('r1', 'character', '할머니', '정면'), ref('r1', 'character', '까치', '정면')]);
  expect(validateProjectJson(JSON.parse(JSON.stringify(dup))).project).toBeNull();
  const badResult = patchMedia(ok, (m) => ({ ...m, shots: { x: { pose: '', light: '', composition: '', avoid: '', result: { file: 'a.png', model: 'm', attempt: 0, reason: '', refsUsed: [], recordedAt: 'now' } } } }));
  expect(validateProjectJson(JSON.parse(JSON.stringify(badResult))).project).toBeNull();
  expect(emptyMedia().model).toBe('nano-banana-2.1');
});
