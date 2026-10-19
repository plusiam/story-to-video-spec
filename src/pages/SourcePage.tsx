import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AiAssist } from '@/components/AiAssist';
import { CopyButton } from '@/components/CopyButton';
import { NextActionBar } from '@/components/NextActionBar';
import { AppHeader } from '@/components/StudioLayout';
import { useProject } from '@/hooks/useProject';
import { authoringOf, patchAuthoring } from '@/lib/authoring';
import { editSourceText, importSourcePdf, isAnalysisCurrent, makeAnalysisRequest, parseSourceAnalysis, readOriginalPdf, renderOriginalPage, validateSourceMaterial } from '@/lib/sourceMaterial';
import type { RightsStatus } from '@/types/authoring';
import type { Project } from '@/types/project';
import { LoadingOrError } from './LoadingOrError';

const RIGHTS: { value: RightsStatus; label: string }[] = [
  { value: 'unknown', label: '아직 확인하지 않음' }, { value: 'own_work', label: '직접 쓴 원작' },
  { value: 'permission_documented', label: '이용 허락 문서 확인' }, { value: 'license_checked', label: '라이선스 확인' }, { value: 'public_domain_checked', label: '보호기간·공유저작물 확인' },
];
const KIND_LABEL = { source: '원문 서술', character_claim: '인물 주장', memory: '회상', interpretation: '해석 (사실 미확정)', proposal: '제안 (원문 사실 아님)' };

/** 비공개 PDF → 사람 검토 → 분석 초안. 제작 원고와 분리하여 보관한다. */
export function SourcePage() {
  const { id } = useParams();
  const api = useProject(id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [replaceSource, setReplaceSource] = useState(false);
  const [replaceScript, setReplaceScript] = useState(false);
  const [replaceOutline, setReplaceOutline] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [preview, setPreview] = useState('');
  const previewTicket = useRef(0);
  const importTicket = useRef(0);
  // This is an invalidation counter, not a DOM node: cleanup must increment the latest counter.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { importTicket.current++; setBusy(false); setMessage(''); return () => { importTicket.current++; }; }, [id]);
  const p = api.project;
  const a = p ? authoringOf(p) : null;
  const m = a?.material ?? null;
  useEffect(() => { previewTicket.current++; setPreview(''); setPageNo(1); setReplaceScript(false); setReplaceOutline(false); }, [m?.id, m?.revision]);
  useEffect(() => () => { previewTicket.current++; }, []);
  if (!p || !a) return <LoadingOrError error={api.loadError} />;
  const analysis = isAnalysisCurrent(a.analysis, m) ? a.analysis : null;
  const selected = m?.pages.find(x => x.page === pageNo);
  const errors = m ? validateSourceMaterial(m) : [];
  const rights = a.rights;
  const updateRights = (patch: Partial<typeof rights>) => api.update(cur => {
    const current = authoringOf(cur);
    return patchAuthoring(cur, { rights: { ...current.rights, ...patch, confirmed: false, confirmedAt: null } });
  });
  const upload = async (file: File) => {
    if (m && !replaceSource) { setMessage('기존 원문 교체 확인란을 선택하세요.'); return; }
    const ticket = ++importTicket.current;
    setBusy(true); setMessage('PDF를 브라우저에서 읽고 원본을 저장하고 있습니다.');
    try {
      const material = await importSourcePdf(file);
      if (ticket !== importTicket.current) return;
      if (!api.update(cur => patchAuthoring(cur, { material, analysis: null }))) throw new Error('프로젝트 충돌로 원문 연결을 저장하지 못했습니다. 이 탭을 백업하고 새로 열어 비교하세요.');
      setReplaceSource(false); setMessage(`${material.pageCount}쪽을 가져왔습니다. 추출 순서와 누락을 원본과 대조하세요. 제작 원고는 바꾸지 않았습니다.`);
    } catch (e) { setMessage(`가져오기 실패: ${e instanceof Error ? e.message : String(e)}. 기존 자료는 유지했습니다.`); }
    finally { if (ticket === importTicket.current) setBusy(false); }
  };
  const original = async (show: boolean) => {
    if (!m?.originalBlobKey) { setMessage('이 브라우저에 연결된 원본이 없습니다. 원본 PDF를 다시 가져오세요.'); return; }
    const ticket = ++previewTicket.current;
    setBusy(true);
    try {
      const blob = await readOriginalPdf(m.originalBlobKey);
      if (!blob) throw new Error('이 브라우저에 원본 파일이 없습니다. 다른 브라우저의 백업에는 PDF가 포함되지 않습니다.');
      if (show) {
        const image = await renderOriginalPage(blob, pageNo);
        if (ticket === previewTicket.current) setPreview(image);
      } else {
        const url = URL.createObjectURL(blob), anchor = document.createElement('a');
        anchor.href = url; anchor.download = m.fileName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setMessage(show ? `${pageNo}쪽 원본 미리보기입니다.` : '원본 PDF 다운로드를 요청했습니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const copyScript = () => {
    if (!m?.reviewConfirmed || errors.length || (p.script.fullText.trim() && !replaceScript)) return;
    api.update(cur => {
      const material = authoringOf(cur).material;
      if (!material?.reviewConfirmed || material.id !== m.id || material.revision !== m.revision || validateSourceMaterial(material).length) return cur;
      if (cur.script.fullText.trim() && !replaceScript) return cur;
      return { ...cur, script: { ...cur.script, fullText: material.reviewedText, ownWordingConfirmed: false } };
    });
    setReplaceScript(false); setMessage('검토 본문을 제작 원고로 복사했습니다. 출처·권리 및 제작 원고 사람 확인은 별도입니다.');
  };
  const applySegments = () => {
    if (!analysis || analysis.segments.length !== 4 || (p.script.outline.some(Boolean) && !replaceOutline)) return;
    api.update(cur => {
      const current = authoringOf(cur);
      if (!isAnalysisCurrent(current.analysis, current.material) || !current.material?.reviewConfirmed || current.analysis?.segments.length !== 4) return cur;
      if (cur.script.outline.some(Boolean) && !replaceOutline) return cur;
      return { ...cur, script: { ...cur.script, outline: current.analysis.segments.map(s => s.summary) as Project['script']['outline'], ownWordingConfirmed: false } };
    });
    setReplaceOutline(false); setMessage('선택한 4구간 요약을 기존 4칸 뼈대에 반영했습니다. 제작 원고 본문은 유지했습니다.');
  };
  return <div className="min-h-screen">
    <AppHeader project={p} saveState={api.saveState} />
    <NextActionBar project={p} viewing={null} />
    <main className="mx-auto max-w-[960px] space-y-8 px-4 py-8 lg:px-6" data-testid="app-source-page">
      <header><h1 className="text-[28px]" data-testid="app-source-heading">원문 · 검토 · 분석</h1><p className="mt-2 text-sm text-ink-soft">원본 PDF, 검토 본문, 분석 초안, 제작 원고는 서로 다른 자료입니다. 자동 AI 호출·자동 승인·자동 원고 반영은 하지 않습니다.</p><Link className="text-jjok hover:underline" to={`/p/${p.id}/step/1`}>제작 원고로 이동</Link></header>
      <section className="space-y-3 rounded-lg border border-paper-line p-4" aria-labelledby="source-mode-heading">
        <h2 id="source-mode-heading" className="text-xl">작업 방식과 이용 권리</h2>
        <label className="field-label" htmlFor="source-mode">작업 방식</label>
        <select id="source-mode" className="input" data-testid="app-source-mode" value={a.scriptMode} onChange={e => api.update(cur => patchAuthoring(cur, { scriptMode: e.target.value as 'adaptation' | 'original_narration' }))}><option value="adaptation">개작: 원문을 바탕으로 새로 쓰기</option><option value="original_narration">원문 낭독: 검토 본문을 제작 원고로 사용</option></select>
        <p className="text-sm text-ink-soft">원문 낭독은 원문 이용 권한을 별도로 확인해야 합니다. PDF 보유가 공개·각색·낭독 허락을 뜻하지 않습니다.</p>
        <label className="field-label" htmlFor="source-rights">권리 확인 상태</label>
        <select id="source-rights" className="input" value={rights.status} data-testid="app-source-rights-status" onChange={e => updateRights({ status: e.target.value as RightsStatus })}>{RIGHTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
        <label className="field-label" htmlFor="source-rights-basis">근거: 권리자·허락 범위·문서·확인일 등</label>
        <textarea id="source-rights-basis" className="input" rows={3} value={rights.basis} data-testid="app-source-rights-basis" onChange={e => updateRights({ basis: e.target.value })} />
        <label className="block text-sm"><input type="checkbox" checked={rights.confirmed} disabled={rights.status === 'unknown' || !rights.basis.trim()} data-testid="app-source-rights-confirm" onChange={e => { const checked = e.target.checked; api.update(cur => { const current = authoringOf(cur); return patchAuthoring(cur, { rights: { ...current.rights, confirmed: checked, confirmedAt: checked ? new Date().toISOString() : null } }); }); }} /> 사람이 이용 범위와 근거를 확인했습니다</label>
      </section>
      <section className="space-y-3" aria-labelledby="source-upload-heading">
        <h2 id="source-upload-heading" className="text-xl">1. 로컬 PDF 가져오기</h2>
        <p className="text-sm">PDF는 이 브라우저의 IndexedDB에만 저장합니다. 원본 파일은 프로젝트 백업·제작 전달물에 포함되지 않습니다. 브라우저 데이터 삭제 시 사라지므로 원본을 따로 보관하세요.</p>
        {m && <label className="block text-sm"><input type="checkbox" checked={replaceSource} onChange={e => setReplaceSource(e.target.checked)} data-testid="app-source-replace-confirm" /> 기존 원문과 분석을 새 PDF로 교체합니다 (제작 원고는 유지)</label>}
        <input type="file" accept="application/pdf,.pdf" disabled={busy || (!!m && !replaceSource)} data-testid="app-source-upload" aria-label="로컬 PDF 선택" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file); }} />
        {message && <p role="status" className="rounded border border-paper-line p-3 text-sm" data-testid="app-source-message">{message}</p>}
      </section>
      {m && <>
        <section className="space-y-3" aria-labelledby="source-review-heading">
          <h2 id="source-review-heading" className="text-xl">2. 원본 대조와 검토 본문</h2>
          <dl className="text-sm" data-testid="app-source-metadata"><dt className="font-bold">{m.fileName}</dt><dd>{m.pageCount}쪽 · {m.byteSize.toLocaleString()}바이트 · 개정 {m.revision} · {m.importedAt}</dd><dd className="break-all">SHA-256: {m.sha256 ?? '이 환경에서 계산할 수 없음'}</dd></dl>
          <p role="note" className="rounded bg-ocher-tint p-3 text-sm" data-testid="app-source-reading-warning">다단·표·각주 PDF는 읽기 순서가 뒤섞일 수 있습니다. 줄바꿈은 보존하지만 의미 순서를 자동 교정하지 않습니다. 스캔 PDF는 OCR하지 않습니다. 페이지 원본과 반드시 대조하세요.</p>
          <div className="flex flex-wrap items-center gap-2"><label htmlFor="source-page-no">원본 페이지</label><select id="source-page-no" className="input w-auto" value={pageNo} data-testid="app-source-page-select" onChange={e => { previewTicket.current++; setPageNo(Number(e.target.value)); setPreview(''); }}>{m.pages.map(pg => <option key={pg.page} value={pg.page}>{pg.page}쪽</option>)}</select><button className="btn-quiet" disabled={busy} data-testid="app-source-preview-button" onClick={() => void original(true)}>원본 페이지 보기</button><button className="btn-quiet" disabled={busy} data-testid="app-source-download-original" onClick={() => void original(false)}>원본 PDF 다운로드</button></div>
          {preview && <img className="max-w-full border border-paper-line" src={preview} alt={`${pageNo}쪽 원본 PDF 미리보기`} data-testid="app-source-original-preview" />}
          <details><summary className="cursor-pointer text-sm">{pageNo}쪽 원본 추출 텍스트 (변경 불가)</summary><pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-sm" data-testid="app-source-raw-page">{selected?.text || '추출된 텍스트 없음: 원본을 보고 직접 입력하거나 별도 OCR이 필요합니다.'}</pre></details>
          <label htmlFor="source-reviewed" className="field-label">검토 본문: 누락·읽기 순서를 고치세요</label>
          <textarea id="source-reviewed" className="input leading-relaxed" rows={16} value={m.reviewedText} data-testid="app-source-reviewed-text" onChange={e => { const text = e.target.value; api.update(cur => patchAuthoring(cur, editSourceText(authoringOf(cur), text))); }} />
          <p className="text-sm text-ink-soft">본문을 수정하면 원문 개정이 올라가고 대조 확인·이전 분석은 해제됩니다. 제작 원고는 자동으로 바뀌지 않습니다.</p>
          {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-danger">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
          <label className="block text-sm"><input type="checkbox" checked={m.reviewConfirmed} disabled={errors.length > 0} data-testid="app-source-review-confirm" onChange={e => { const checked = e.target.checked; api.update(cur => { const current = authoringOf(cur); if (!current.material) return cur; return patchAuthoring(cur, { material: { ...current.material, reviewConfirmed: checked, reviewedAt: checked ? new Date().toISOString() : null } }); }); }} /> 원본과 페이지 순서·누락·문장을 사람이 대조했습니다</label>
          {p.script.fullText.trim() && <label className="block text-sm"><input type="checkbox" checked={replaceScript} onChange={e => setReplaceScript(e.target.checked)} data-testid="app-source-script-replace-confirm" /> 현재 제작 원고 본문을 교체하는 데 동의합니다</label>}
          <button className="btn-quiet" disabled={!m.reviewConfirmed || errors.length > 0 || (!!p.script.fullText.trim() && !replaceScript)} data-testid="app-source-copy-to-script" onClick={copyScript}>검토한 본문을 제작 원고로 복사</button>
        </section>
        <section className="space-y-4" aria-labelledby="source-analysis-heading">
          <h2 id="source-analysis-heading" className="text-xl">3. 분석 초안 (제작 원고와 별도)</h2>
          {m.reviewConfirmed && !errors.length ? <AiAssist key={`${m.id}:${m.revision}`} prefix="app-source-analysis" title="외부 AI에 분석 요청하기" note="요청문에 비공개 본문이 포함됩니다. 외부 서비스 전송 가능 여부를 확인한 뒤 직접 복사하세요. 자동 전송하지 않습니다. 근거 인용은 원본 추출 페이지와 대조하며 해석·제안은 사실로 승인하지 않습니다." request={makeAnalysisRequest(m)} pasteLabel="분석 JSON 붙여 넣기 (기존 분석 초안을 교체)" applyLabel="검사 후 분석 초안 저장" onApply={text => {
            const result = parseSourceAnalysis(text, m);
            if (!result.value) return result.errors;
            const value = result.value;
            api.update(cur => { const current = authoringOf(cur); if (!current.material?.reviewConfirmed || current.material.id !== value.sourceId || current.material.revision !== value.sourceRevision) return cur; return patchAuthoring(cur, { analysis: value }); });
            api.log('원문 분석 초안을 검사 후 저장했습니다. 사람 승인·원고 반영은 하지 않았습니다.');
            return null;
          }} /> : <p className="text-sm">검토 본문과 사람 대조 확인을 완료하면 분석 요청문을 만들 수 있습니다.</p>}
          {a.analysis && !analysis && <p role="alert" className="text-sm text-danger">분석의 원문 ID·개정·해시가 현재 자료와 다릅니다. 다시 분석하세요.</p>}
          {analysis && <div className="space-y-4" data-testid="app-source-analysis-result"><p className="text-sm text-ink-soft">분석 초안 · 개정 {analysis.sourceRevision} · 사실·작가 승인 미확정</p><h3 className="font-bold">중심 변화</h3><p>{analysis.centralChange}</p><h3 className="font-bold">자연스러운 구간 {analysis.segments.length}개</h3><ol className="list-decimal space-y-2 pl-5">{analysis.segments.map((s, i) => <li key={i}><strong>{s.label}</strong> · {s.fromPage === null ? '페이지 미지정' : `${s.fromPage}~${s.toPage}쪽`}<p>{s.summary}</p></li>)}</ol>
            <h3 className="font-bold">근거와 해석</h3><ul className="space-y-3">{analysis.findings.map(f => <li key={f.id} className="rounded border border-paper-line p-3"><strong>{KIND_LABEL[f.kind]}</strong> · {f.page === null ? '원문 페이지 근거 없음' : `${f.page}쪽`}<p>{f.text}</p>{f.quote && <blockquote className="mt-1 border-l-2 border-paper-line pl-3 text-sm">{f.quote}</blockquote>}</li>)}</ul>
            <h3 className="font-bold">인물·장소 후보</h3><p className="text-sm">후보일 뿐입니다. 외모·얼굴 카드나 장소 카드를 자동으로 만들지 않습니다.</p><ul className="list-disc pl-5">{analysis.characters.map((c, i) => <li key={`c${i}`}>인물: {c.name} · {c.description}</li>)}{analysis.locations.map((l, i) => <li key={`l${i}`}>장소: {l.name} · {l.description}</li>)}</ul><CopyButton label="인물/장소 후보 복사" testid="app-source-copy-candidates" text={[...analysis.characters.map(c => `인물 후보: ${c.name} — ${c.description}`), ...analysis.locations.map(l => `장소 후보: ${l.name} — ${l.description}`)].join('\n')} />
            <h3 className="font-bold">작가에게 확인할 질문</h3><ul className="list-disc pl-5">{analysis.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            {analysis.segments.length !== 4 && <p className="text-sm" data-testid="app-source-outline-compatibility">기존 제작 뼈대는 4칸입니다. 현재 분석은 {analysis.segments.length}구간이므로 자동 반영할 수 없습니다. 분석을 억지로 4구간으로 바꾸지 말고 필요한 요약을 제작 원고 화면에서 직접 선택해 작성하세요.</p>}
            {p.script.outline.some(Boolean) && <label className="block text-sm"><input type="checkbox" checked={replaceOutline} onChange={e => setReplaceOutline(e.target.checked)} data-testid="app-source-outline-replace-confirm" /> 기존 4칸 뼈대 요약 교체에 동의합니다</label>}
            <button className="btn-quiet" disabled={!m.reviewConfirmed || analysis.segments.length !== 4 || (p.script.outline.some(Boolean) && !replaceOutline)} data-testid="app-source-apply-segments" onClick={applySegments}>구간요약을 뼈대에 반영</button>
          </div>}
        </section>
      </>}
    </main>
  </div>;
}
