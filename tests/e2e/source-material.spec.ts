import { expect, test } from '@playwright/test';
import { editSourceText, isAnalysisCurrent, makeAnalysisRequest, normalizeExtractedItems, parseSourceAnalysis, validatePdfHeader, validateSourceMaterial } from '../../src/lib/sourceMaterial';
import { emptyAuthoring } from '../../src/lib/authoring';
import type { SourceMaterial } from '../../src/types/authoring';

const material = (): SourceMaterial => ({ id: 'source-1', revision: 1, fileName: 'example.pdf', byteSize: 100, pageCount: 4, sha256: 'abc', importedAt: '2026-10-18T00:00:00Z', pages: [{ page: 1, text: '아이는 강가에 갔다.\n그는 돌아오겠다고 말했다.' }, { page: 2, text: '둘째 날 비가 왔다.' }, { page: 3, text: '친구가 문을 열었다.' }, { page: 4, text: '다시 집으로 돌아왔다.' }], reviewedText: '아이는 강가에 갔다.\n그는 돌아오겠다고 말했다.\n둘째 날 비가 왔다.\n친구가 문을 열었다.\n다시 집으로 돌아왔다.', reviewConfirmed: true, reviewedAt: '2026-10-18T00:00:00Z', originalBlobKey: 'pdf:source-1' });
const draft = () => ({ centralChange: '떠났다가 돌아온다.', segments: [{ label: '출발', summary: '강가로 간다.', fromPage: 1, toPage: 2 }, { label: '귀환', summary: '집으로 돌아온다.', fromPage: 3, toPage: 4 }], findings: [{ id: 'f1', kind: 'source', text: '강가로 간다.', page: 1, quote: '아이는강가에 갔다.' }, { id: 'f2', kind: 'interpretation', text: '귀환은 성장을 암시할 수 있다.', page: null, quote: '' }], characters: [{ name: '아이', description: '나이·외모는 미확정' }], locations: [{ name: '강가', description: '구체적인 배경 미확정' }], questions: ['돌아오는 이유는 무엇인가?'] });

test('PDF text preserves explicit hasEOL and item order', () => {
  expect(normalizeExtractedItems([{ str: '첫', hasEOL: false }, { str: '줄', hasEOL: true }, { str: '다음', hasEOL: true }, {}])).toBe('첫 줄\n다음');
  expect(validatePdfHeader(new TextEncoder().encode('%PDF-1.7\n'))).toBe(true);
  expect(validatePdfHeader(new TextEncoder().encode('not pdf'))).toBe(false);
});
test('strict analysis binds local source revision, keeps arbitrary segment count and draft status', () => {
  const m = material(), r = parseSourceAnalysis(JSON.stringify(draft()), m);
  expect(r.errors).toEqual([]); expect(r.value?.segments).toHaveLength(2);
  expect(r.value).toMatchObject({ sourceId: m.id, sourceRevision: 1, sourceSha256: 'abc', status: 'draft' });
  expect(r.value?.findings[1]).toMatchObject({ kind: 'interpretation', page: null });
});
test('forbids imported identity, status, human approval and nested progress', () => {
  for (const extra of [{ sourceId: 'other' }, { sourceRevision: 2 }, { status: 'author_confirmed' }, { humanConfirmed: true }, { progress: {} }]) {
    expect(parseSourceAnalysis(JSON.stringify({ ...draft(), ...extra }), material()).value).toBeNull();
  }
  const d = draft(); const input = { ...d, characters: [{ ...d.characters[0], nested: { approved: true } }] };
  expect(parseSourceAnalysis(JSON.stringify(input), material()).errors.join(' ')).toContain('approved');
});
test('rejects wrong types, unknown keys, missing fields and invalid JSON without altering old analysis', () => {
  const m = material(), old = parseSourceAnalysis(JSON.stringify(draft()), m).value;
  for (const input of ['broken', '[]', JSON.stringify({ ...draft(), unknown: 1 }), JSON.stringify({ ...draft(), questions: 'bad' }), JSON.stringify({ ...draft(), centralChange: '' }), JSON.stringify({ centralChange: 'incomplete' })]) {
    expect(parseSourceAnalysis(input, m).value).toBeNull();
  }
  expect(old?.centralChange).toBe('떠났다가 돌아온다.'); expect(m.revision).toBe(1);
});
test('validates quote/page, rejects stale or invented evidence, distinguishes claims and interpretation', () => {
  for (const finding of [
    { id: 'x', kind: 'source', text: '내용', page: 1, quote: '' },
    { id: 'x', kind: 'character_claim', text: '주장', page: null, quote: '' },
    { id: 'x', kind: 'memory', text: '회상', page: 9, quote: '없음' },
    { id: 'x', kind: 'proposal', text: '제안', page: null, quote: '실제 인용' },
    { id: 'x', kind: 'source', text: '내용', page: 2, quote: '아이는 강가에 갔다.' },
  ]) expect(parseSourceAnalysis(JSON.stringify({ ...draft(), findings: [finding] }), material()).value).toBeNull();
  const m = material(); m.pages[0].text = '개정된 페이지';
  expect(parseSourceAnalysis(JSON.stringify(draft()), m).errors.join(' ')).toContain('인용문이');
  const claim = { id: 'claim', kind: 'character_claim', text: '인물이 돌아오겠다고 주장함', page: 1, quote: '그는 돌아오겠다고 말했다.' };
  expect(parseSourceAnalysis(JSON.stringify({ ...draft(), findings: [claim] }), material()).value?.findings[0].kind).toBe('character_claim');
});
test('review edits increment revision, revoke human confirmation and clear only analysis immutably', () => {
  const m = material(), a = { ...emptyAuthoring(), material: m, analysis: parseSourceAnalysis(JSON.stringify(draft()), m).value };
  expect(editSourceText(a, m.reviewedText)).toBe(a);
  const next = editSourceText(a, '고친 검토 본문');
  expect(next.material).toMatchObject({ revision: 2, reviewConfirmed: false, reviewedAt: null });
  expect(next.analysis).toBeNull(); expect(next.rights).toBe(a.rights); expect(m.revision).toBe(1);
  expect(isAnalysisCurrent(a.analysis, m)).toBe(true);
  expect(isAnalysisCurrent(a.analysis, next.material)).toBe(false);
  expect(isAnalysisCurrent(a.analysis, { ...m, id: 'other' })).toBe(false);
  expect(isAnalysisCurrent(a.analysis, { ...m, sha256: 'changed' })).toBe(false);
});
test('requires valid reviewed source and page sequence', () => {
  expect(validateSourceMaterial(material())).toEqual([]);
  const m = material(); m.pages[1].page = 8;
  expect(validateSourceMaterial(m).length).toBeGreaterThan(0);
  expect(parseSourceAnalysis(JSON.stringify(draft()), { ...material(), reviewConfirmed: false }).value).toBeNull();
  expect(parseSourceAnalysis(JSON.stringify(draft()), { ...material(), reviewedText: '  ' }).value).toBeNull();
});
test('request includes evidence distinction and does not impose 4 segments', () => {
  const request = makeAnalysisRequest(material());
  expect(request).toContain('구간 수·막·장·기승전결을 강제하지');
  for (const kind of ['source', 'character_claim', 'memory', 'interpretation', 'proposal']) expect(request).toContain(kind);
  expect(request).toContain('페이지별 원본 추출');
});
