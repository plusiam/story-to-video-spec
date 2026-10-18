import { useParams } from 'react-router-dom';
import { NextActionBar } from '@/components/NextActionBar';
import { AppHeader } from '@/components/StudioLayout';
import { useProject } from '@/hooks/useProject';
import { appTid } from '@/lib/testid';
import { LoadingOrError } from './LoadingOrError';

/**
 * /p/:id/export — 최종 점검과 내려받기
 * M1: 프로젝트 JSON 백업만. 자막·설명문·ZIP 묶음은 M3(7단계)에서 붙인다.
 */
export function ExportPage() {
  const { id } = useParams();
  const api = useProject(id);
  const p = api.project;
  if (!p) return <LoadingOrError error={api.loadError} />;

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.id}_${p.updatedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    api.log('프로젝트 JSON 백업을 내려받았습니다');
  };

  return (
    <div className="min-h-screen">
      <AppHeader project={p} saveState={api.saveState} />
      <NextActionBar project={p} viewing={null} />
      <main className="mx-auto max-w-prose px-4 py-8" data-testid={appTid('export')}>
        <h1 className="text-[28px] leading-tight">내보내기</h1>

        <section className="mt-6 rounded-lg border border-paper-line bg-paper p-5">
          <h2 className="font-sans text-base font-bold">프로젝트 JSON 백업</h2>
          <p className="mt-1 text-sm text-ink-soft">
            작업 폴더를 연결했다면 project.json이 이미 폴더에 있습니다. 폴더 없이 쓰는 경우나 따로 보관할 때 이 백업을 받아 두세요.
          </p>
          <button type="button" className="btn-primary mt-3" onClick={downloadJson} data-testid={appTid('export-json')}>
            JSON 백업 내려받기
          </button>
        </section>

        <section className="mt-4 rounded-lg border border-dashed border-paper-line bg-paper p-5 text-sm text-ink-soft" data-testid={appTid('export-bundle-pending')}>
          자막(SRT), 편집 순서표, 유튜브 설명문, 이미지·음성 ZIP 묶음은 7단계 화면과 함께 M3에서 만듭니다.
        </section>
      </main>
    </div>
  );
}
