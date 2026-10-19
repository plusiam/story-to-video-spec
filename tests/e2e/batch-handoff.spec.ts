import { test, expect } from '@playwright/test';
import { parseSettingsInput, parseStoryInput, parseVisualOptions } from '../../src/lib/batchInput';
import { parseDna, syncCards } from '../../src/lib/aiRequests';
import { buildHandoff } from '../../src/lib/handoff';
import { createEmptyProject, invalidateEditedSteps, validateProjectJson } from '../../src/lib/project';
import { autoSplitScenes } from '../../src/lib/text';
import { nextAction } from '../../src/lib/steps';
import type { Project } from '../../src/types/project';

const settings = { title: '은혜 갚은 까치', sourceType: 'folktale', sourceNote: '입력 시험을 위한 전래 민담 출처 메모', durationMin: 3, series: '시험' };
const fullText = Array.from({ length: 40 }, () => '돌쇠는 까치의 울음소리를 듣고 산길에서 멈추었어요.').join(' ');

function fixture(): Project {
  const p = createEmptyProject('시험 원고');
  p.source = { type: 'folktale', note: settings.sourceNote, noCommercialBookConfirmed: true };
  p.target.durationSec = 180;
  p.script = { outline: ['시작', '전개', '위기', '맺음'], tone: '다정한 말투', fullText: '', ownWordingConfirmed: true };
  // 문장 단위로 3분 목표 범위의 원고를 만든다.
  const sentence = '돌쇠는 까치의 울음소리를 듣고 산길에서 멈추었어요.';
  p.script.fullText = Array.from({ length: 30 }, () => sentence).join(' ');
  p.scenes = autoSplitScenes(p.script.fullText).map((s) => ({ ...s, visual: '돌쇠가 산길에서 까치를 바라본다', location: '산길', characters: '돌쇠, 까치', emotion: '평온' }));
  const cards = syncCards(p);
  p.visualDNA = { ...p.visualDNA, stylePreset: 'minhwa', ...cards };
  p.visualDNA.characters = p.visualDNA.characters.map((c) => ({ ...c, age: '서른 살', face: '둥근 얼굴', hair: '검은 머리', outfit: '갈색 옷', props: '', elementName: c.name + '_A' }));
  p.visualDNA.locations = p.visualDNA.locations.map((l) => ({ ...l, desc: '가을 산길, 소나무와 아침 햇살' }));
  p.progress = { 0: { completedAt: p.updatedAt }, 1: { completedAt: p.updatedAt }, 2: { completedAt: p.updatedAt }, 3: { completedAt: p.updatedAt } };
  return p;
}

test('설정 JSON: 정상·코드 울타리·유형·범위·승인 키 검사', () => {
  expect(parseSettingsInput(JSON.stringify(settings)).value?.title).toBe(settings.title);
  expect(parseSettingsInput('```json\n' + JSON.stringify(settings) + '\n```').errors).toEqual([]);
  for (const raw of [{ ...settings, durationMin: '3' }, { ...settings, durationMin: 0 }, { ...settings, sourceNote: '' }, { ...settings, progress: { 0: true } }, { ...settings, noCommercialBookConfirmed: true }, null, []]) {
    expect(parseSettingsInput(JSON.stringify(raw)).value).toBeNull();
  }
});

test('스토리: 본문 호환·뼈대 JSON·오류시 비반영', () => {
  expect(parseStoryInput(fullText).value?.fullText).toBe(fullText);
  expect(parseStoryInput(JSON.stringify({ fullText, outline: ['기', '승', '전', '결'], tone: '느긋하게' })).value?.outline).toHaveLength(4);
  for (const raw of [{ fullText, outline: ['기'] }, { fullText, ownWordingConfirmed: true }, { fullText: true }, { fullText, tone: '' }]) {
    expect(parseStoryInput(JSON.stringify(raw)).value).toBeNull();
  }
  expect(parseStoryInput('{ broken json').value).toBeNull();
});

test('비주얼 옵션과 Element: 유효한 참조 이름 유지', () => {
  expect(parseVisualOptions('{"stylePreset":"sumuk","characters":[],"locations":[]}').value?.stylePreset).toBe('sumuk');
  expect(parseVisualOptions('{"progress":{}}').value).toBeNull();
  const p = fixture();
  const r = parseDna(JSON.stringify({ characters: p.visualDNA.characters, locations: p.visualDNA.locations }), p.visualDNA);
  expect(r.errors).toEqual([]);
  expect(r.characters[0].elementName).toBe('돌쇠_A');
});

test('비주얼 실패는 기존 카드를 바꾸지 않는다', () => {
  const p = fixture();
  const before = JSON.stringify(p.visualDNA);
  const r = parseDna('{"characters":[{"name":"돌쇠","face":"변경됨","colors":["bad"],"elementName":true}],"locations":[]}', p.visualDNA);
  expect(r.errors.length).toBeGreaterThan(0);
  expect(JSON.stringify(p.visualDNA)).toBe(before);
});

test('폴더 없이도 완료된 유효 원고는 ready이며 원본을 바꾸지 않는다', () => {
  const p = fixture();
  const before = JSON.stringify(p);
  const h = buildHandoff(p);
  expect(h.readiness.issues).toEqual([]);
  expect(h.readiness.status).toBe('ready');
  expect(h.scenes.length).toBe(p.scenes.length);
  expect(h.visualDNA.characters[0].elementName).toBe('돌쇠_A');
  expect(JSON.stringify(p)).toBe(before);
});

test('완료가 없거나 내용 검사가 실패하면 draft', () => {
  const p = fixture();
  delete p.progress[3];
  expect(buildHandoff(p).readiness.status).toBe('draft');
  p.progress[3] = { completedAt: p.updatedAt };
  p.visualDNA.characters[0].face = '';
  expect(buildHandoff(p).readiness.status).toBe('draft');
  p.source.noCommercialBookConfirmed = false;
  expect(buildHandoff(p).humanConfirmations.noCommercialBookConfirmed).toBe(false);
});

test('이전 백업의 Element 누락은 정상적으로 null 출력', () => {
  const p = fixture();
  delete p.visualDNA.characters[0].elementName;
  expect(buildHandoff(p).visualDNA.characters[0].elementName).toBeNull();
});

test('원고 수정은 문장 확인과 1단계 이후 완료를 해제', () => {
  const p = fixture();
  const after = invalidateEditedSteps(p, { ...p, script: { ...p.script, fullText: p.script.fullText + ' 끝이었어요.' } });
  expect(after.script.ownWordingConfirmed).toBe(false);
  expect(after.progress[0]).toBeDefined();
  expect(after.progress[1]).toBeUndefined();
  expect(after.progress[2]).toBeUndefined();
  expect(after.progress[3]).toBeUndefined();
  expect(buildHandoff(after).readiness.status).toBe('draft');
  expect(p.progress[3]).toBeDefined();
});

test('카드 변경은 3단계 이후만 해제하고 로그만 바꾸면 완료 유지', () => {
  const p = fixture();
  const after = invalidateEditedSteps(p, { ...p, visualDNA: { ...p.visualDNA, negatives: '글자, 워터마크, 과장된 표정' } });
  expect(after.progress[2]).toBeDefined();
  expect(after.progress[3]).toBeUndefined();
  expect(invalidateEditedSteps(p, { ...p, log: [] }).progress).toEqual(p.progress);
});

test('설명문이나 잘못된 코드 블록의 JSON을 원고로 잘못 저장하지 않음', () => {
  const json = JSON.stringify({ fullText });
  for (const raw of ['다음은 JSON입니다.\n' + json, '```javascript\n' + json + '\n```', '```jsonc\n' + json + '\n```', '```json\n' + json]) {
    expect(parseStoryInput(raw).value).toBeNull();
  }
});

test('카드 안에 숨은 승인 값도 거부', () => {
  expect(parseVisualOptions('{"characters":[{"name":"돌쇠","refSheet":{"approved":true}}]}').value).toBeNull();
});

test('빈 Element 이름을 다시 붙여도 기존 등록 이름 보존', () => {
  const p = fixture();
  const r = parseDna(JSON.stringify({ characters: [{ name: '돌쇠', colors: p.visualDNA.characters[0].colors, elementName: '' }], locations: [] }), p.visualDNA);
  expect(r.errors).toEqual([]);
  expect(r.characters[0].elementName).toBe('돌쇠_A');
});

test('구버전 백업: 분량이 같아도 원고와 장면이 다르면 인계 차단', () => {
  const p = fixture();
  p.script.fullText = p.script.fullText.replace('돌쇠', '철수');
  expect(buildHandoff(p).readiness.status).toBe('draft');
  expect(nextAction(p, { folder: null }).step).toBe(2);
});

test('구버전 백업: 완료 날짜가 뒤집혔으면 인계 차단', () => {
  const p = fixture();
  p.progress[1] = { completedAt: '2099-01-01T00:00:00.000Z' };
  expect(buildHandoff(p).readiness.status).toBe('draft');
  expect(nextAction(p, { folder: null }).step).toBe(2);
});

test('인물 외모 변경은 기존 기준 이미지 승인을 해제', () => {
  const p = fixture();
  p.visualDNA.characters[0].refSheet.approved = true;
  const after = invalidateEditedSteps(p, { ...p, visualDNA: { ...p.visualDNA, characters: p.visualDNA.characters.map((c, i) => i ? c : { ...c, hair: '짧은 머리' }) } });
  expect(after.visualDNA.characters[0].refSheet.approved).toBe(false);
  expect(p.visualDNA.characters[0].refSheet.approved).toBe(true);
});

test('1.0 백업 마이그레이션은 확인을 다시 요구하고 인계를 초안으로 표시', () => {
  const p = fixture();
  const { project, errors } = validateProjectJson({ ...p, schemaVersion: '1.0', visualDNA: { ...p.visualDNA, negatives: ['글자', '워터마크'] } });
  expect(errors).toEqual([]);
  expect(project?.schemaVersion).toBe('1.1');
  expect(project?.script.ownWordingConfirmed).toBe(false);
  expect(project?.visualDNA.negatives).toBe('글자, 워터마크');
  expect(buildHandoff(project!).readiness.status).toBe('draft');
  expect(nextAction(project!, { folder: null }).step).toBe(1);
});

test('잘못된 카드 배열과 참거짓 필드를 형식 오류로 거부', () => {
  for (const value of [{ characters: true }, { characters: [false] }, { locations: [{ name: '산길', desc: true }] }, { characters: [{ name: '돌쇠', hair: true }] }]) {
    expect(parseVisualOptions(JSON.stringify(value)).value).toBeNull();
  }
});
