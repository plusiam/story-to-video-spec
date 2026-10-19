import type { AuthoringData, EpisodeWorkingNotes } from '@/types/authoring';
import type { Project } from '@/types/project';

export function emptyEpisodeNotes(): EpisodeWorkingNotes {
  return { summary: '', events: '', characterStates: '', knowledgeStates: '', openThreads: '', visualContinuity: '', nextEpisode: '', changeReason: '' };
}
export function emptyAuthoring(): AuthoringData {
  return { version: '1.0', scriptMode: 'adaptation', rights: { status: 'unknown', basis: '', confirmed: false, confirmedAt: null }, material: null, analysis: null, guidelinePath: '', episode: { seriesId: '', episodeNo: 1, basedOnSeriesRevision: 0, notes: emptyEpisodeNotes() } };
}
export function authoringOf(p: Project): AuthoringData { return p.authoring ?? emptyAuthoring(); }
export function patchAuthoring(p: Project, patch: Partial<AuthoringData>): Project { return { ...p, authoring: { ...authoringOf(p), ...patch } }; }

/** 복원용 백업의 선택 확장도 화면이 안전하게 읽을 수 있는 모양인지 검사한다. */
export function authoringErrors(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['authoring: 작가 작업 데이터는 객체여야 합니다.'];
  const a = raw as Record<string, unknown>;
  const obj = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
  const text = (x: unknown) => typeof x === 'string';
  const nullableText = (x: unknown) => x === null || text(x);
  const fail = () => ['authoring: 원문·분석·권리·회차 데이터 형식이 맞지 않습니다. 원본 백업을 보존하고 다시 확인하세요.'];
  if (a.version !== '1.0' || !['adaptation', 'original_narration'].includes(String(a.scriptMode)) || !text(a.guidelinePath)) return fail();
  if (!obj(a.rights) || !['unknown', 'own_work', 'permission_documented', 'license_checked', 'public_domain_checked'].includes(String(a.rights.status)) || !text(a.rights.basis) || typeof a.rights.confirmed !== 'boolean' || !nullableText(a.rights.confirmedAt)) return fail();
  if (!obj(a.episode) || !text(a.episode.seriesId) || !Number.isInteger(a.episode.episodeNo) || Number(a.episode.episodeNo) < 1 || !Number.isInteger(a.episode.basedOnSeriesRevision) || Number(a.episode.basedOnSeriesRevision) < 0 || !obj(a.episode.notes)) return fail();
  for (const key of Object.keys(emptyEpisodeNotes())) if (!text(a.episode.notes[key])) return fail();
  if (a.material !== null) {
    const m = a.material;
    if (!obj(m) || !text(m.id) || !text(m.fileName) || !text(m.importedAt) || !Number.isInteger(m.revision) || Number(m.revision) < 1 || !Number.isInteger(m.pageCount) || Number(m.pageCount) < 1 || typeof m.byteSize !== 'number' || !Number.isFinite(m.byteSize) || !Array.isArray(m.pages) || m.pages.length !== m.pageCount || !text(m.reviewedText) || typeof m.reviewConfirmed !== 'boolean' || !nullableText(m.reviewedAt) || !nullableText(m.sha256) || !nullableText(m.originalBlobKey)) return fail();
    if (m.pages.some((p, i) => !obj(p) || p.page !== i + 1 || !text(p.text))) return fail();
  }
  if (a.analysis !== null) {
    const d = a.analysis;
    if (!obj(d) || d.status !== 'draft' || !text(d.centralChange) || !text(d.sourceId) || !Number.isInteger(d.sourceRevision) || !nullableText(d.sourceSha256) || !Array.isArray(d.segments) || !Array.isArray(d.findings) || !Array.isArray(d.characters) || !Array.isArray(d.locations) || !Array.isArray(d.questions) || !d.questions.every(text)) return fail();
    if (!obj(a.material) || d.sourceId !== a.material.id || d.sourceRevision !== a.material.revision || d.sourceSha256 !== a.material.sha256) return ['authoring.analysis: 원문 판본과 분석 판본이 다릅니다. 다시 분석하세요.'];
    if (d.segments.some(s => !obj(s) || !text(s.label) || !text(s.summary) || !(s.fromPage === null || Number.isInteger(s.fromPage)) || !(s.toPage === null || Number.isInteger(s.toPage)))) return fail();
    if (d.findings.some(f => !obj(f) || !text(f.id) || !text(f.text) || !text(f.quote) || !['source', 'character_claim', 'memory', 'interpretation', 'proposal'].includes(String(f.kind)) || !(f.page === null || Number.isInteger(f.page)))) return fail();
    if ([...d.characters, ...d.locations].some(c => !obj(c) || !text(c.name) || !text(c.description))) return fail();
  }
  return [];
}

/** 대화에서 만든 회차 노트만 읽는다. 확정자·권리·진행·승인 값은 형식상 받지 않는다. */
export function parseEpisodeNotesInput(text: string): { value: EpisodeWorkingNotes | null; errors: string[] } {
  let raw: unknown;
  try { raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1')); }
  catch { return { value: null, errors: ['회차 노트는 JSON 객체 하나로 붙여 넣으세요. 기존 노트는 유지했습니다.'] }; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: null, errors: ['회차 노트 최상위는 객체여야 합니다.'] };
  const data = raw as Record<string, unknown>;
  const fields = Object.keys(emptyEpisodeNotes());
  const errors: string[] = [];
  for (const key of Object.keys(data)) if (!fields.includes(key)) errors.push(key + ': 노트에 없는 항목입니다. 승인·권리·진행·확정 정보는 가져올 수 없습니다.');
  for (const key of fields) if (typeof data[key] !== 'string') errors.push(key + ': 문자열 항목이 필요합니다.');
  return errors.length ? { value: null, errors } : { value: Object.fromEntries(fields.map(key => [key, data[key]])) as unknown as EpisodeWorkingNotes, errors: [] };
}
