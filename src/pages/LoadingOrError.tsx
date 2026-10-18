import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/StudioLayout';
import { appTid } from '@/lib/testid';

export function LoadingOrError({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-prose px-4 py-16">
        {error ? (
          <div data-testid={appTid('load-error')}>
            <p className="font-semibold text-danger">{error}</p>
            <Link to="/projects" className="btn-quiet mt-4" data-testid={appTid('back-to-projects')}>
              프로젝트 목록으로
            </Link>
          </div>
        ) : (
          <p className="text-ink-soft" data-testid={appTid('loading')} role="status">
            프로젝트를 불러오는 중입니다…
          </p>
        )}
      </main>
    </div>
  );
}
