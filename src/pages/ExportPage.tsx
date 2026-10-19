import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CopyButton } from '@/components/CopyButton';
import { NextActionBar } from '@/components/NextActionBar';
import { AppHeader } from '@/components/StudioLayout';
import { useProject } from '@/hooks/useProject';
import { buildHandoff } from '@/lib/handoff';
import { appTid } from '@/lib/testid';
import { LoadingOrError } from './LoadingOrError';

/** 백업과 제작 인계는 용도가 다른 파일이다. 어느 쪽도 유료 생성 허가가 아니다. */
export function ExportPage() {
  const { id } = useParams();
  const api = useProject(id);
  const [error, setError] = useState('');
  const [downloaded, setDownloaded] = useState('');
  const p = api.project;
  if (!p) return <LoadingOrError error={api.loadError} />;
  const handoff = buildHandoff(p);
  const projectJson = JSON.stringify(p, null, 2);
  const handoffJson = JSON.stringify(handoff, null, 2);

  const download = (text: string, filename: string, label: string) => {
    setError('');
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(label + ' 내려받기를 요청했습니다. 브라우저 다운로드 목록을 확인하세요.');
      api.log(label + ' 내려받기를 요청했습니다');
    } catch (err) {
      setError('내려받기 실패: ' + (err instanceof Error ? err.message : String(err)) + '. JSON 전문을 복사해 보관하세요.');
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader project={p} saveState={api.saveState} />
      <NextActionBar project={p} viewing={null} />
      <main className="mx-auto max-w-[860px] px-4 py-8" data-testid={appTid('export')}>
        <h1 className="text-[28px] leading-tight">JSON 내보내기</h1>
        <p className="mt-2 text-sm text-ink-soft">Aside 대화로 정한 이야기·장면·캐릭터를 보관하거나 제작 담당에게 전달합니다. 폴더 연결 없이도 복사·내려받기가 됩니다.</p>
        {error && <p role="alert" className="mt-3 text-danger" data-testid={appTid('export-error')}>{error}</p>}
        {downloaded && <p role="status" className="mt-3 text-sm text-celadon" data-testid={appTid('export-downloaded')}>{downloaded}</p>}

        <section aria-labelledby="handoff-heading" className="mt-6 rounded-lg border border-paper-line bg-paper p-5" data-testid={appTid('handoff-section')}>
          <h2 id="handoff-heading" className="font-sans text-lg font-bold">제작 인계용 handoff.json</h2>
          <p className="mt-1 text-sm">원고·인물·장소·화풍·참조 이름과 그림 지침입니다. Claude Code가 이를 읽어 제작 시간표(spec.json)를 만듭니다. 이미지·영상·음성 생성은 별도 확인 후 진행하세요.</p>
          <p className="mt-3 font-semibold" role="status" data-testid={appTid('handoff-status')} data-status={handoff.readiness.status}>
            {handoff.readiness.status === 'ready' ? '제작 인계 준비됨: 0~3단계 확인과 품질 점검 통과' : '초안: 아직 확인하거나 고칠 항목이 있습니다'}
          </p>
          {handoff.readiness.issues.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-ocher" data-testid={appTid('handoff-issues')}>
            {handoff.readiness.issues.map((issue, i) => <li key={i}>{issue}</li>)}
          </ul>}
          <div className="mt-3 flex flex-wrap gap-3">
            <CopyButton text={handoffJson} label="제작 JSON 복사" testid={appTid('handoff-copy')} />
            <button type="button" className="btn-primary" data-testid={appTid('handoff-download')} onClick={() => download(handoffJson, p.id + '_handoff.json', '제작 인계 JSON')}>handoff.json 내려받기</button>
            <Link to={'/p/' + p.id + '/step/0'} className="btn-quiet" data-testid={appTid('handoff-review')}>작업 화면에서 확인하기</Link>
          </div>
          <label htmlFor="handoff-json-text" className="field-label mt-4">제작 JSON 전문 (읽기 전용)</label>
          <textarea id="handoff-json-text" readOnly rows={12} className="input font-mono text-xs" value={handoffJson} data-testid={appTid('handoff-text')} />
        </section>

        <section aria-labelledby="backup-heading" className="mt-5 rounded-lg border border-paper-line bg-paper p-5">
          <h2 id="backup-heading" className="font-sans text-lg font-bold">앱 복원용 프로젝트 JSON 백업</h2>
          <p className="mt-1 text-sm text-ink-soft">다른 브라우저에서 프로젝트 목록의 「백업 JSON 불러오기」로 복원할 때 사용합니다. handoff.json과는 형식이 다릅니다.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <CopyButton text={projectJson} label="백업 JSON 복사" testid={appTid('export-copy-json')} />
            <button type="button" className="btn-quiet" onClick={() => download(projectJson, p.id + '_' + p.updatedAt.slice(0, 10) + '.json', '프로젝트 JSON 백업')} data-testid={appTid('export-json')}>JSON 백업 내려받기</button>
          </div>
          <label htmlFor="project-json-text" className="field-label mt-4">백업 JSON 전문 (읽기 전용)</label>
          <textarea id="project-json-text" readOnly rows={8} className="input font-mono text-xs" value={projectJson} data-testid={appTid('export-json-text')} />
        </section>
        <section className="mt-4 rounded-lg border border-dashed border-paper-line bg-paper p-5 text-sm text-ink-soft" data-testid={appTid('export-bundle-pending')}>
          실제 이미지·음성 생성, 자막 시간 맞추기, 영상 렌더링은 이 앱에서 실행하지 않습니다. handoff.json은 창작 지침이지 비용 지출이나 게시 허가가 아닙니다.
        </section>
      </main>
    </div>
  );
}
