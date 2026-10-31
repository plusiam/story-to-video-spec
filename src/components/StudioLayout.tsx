import { Link } from 'react-router-dom';
import { GUIDES } from '@/guides';
import { saveStateText, type SaveState } from '@/hooks/useProject';
import { store } from '@/lib/storage';
import { FolderStatus } from './FolderStatus';
import { appTid } from '@/lib/testid';
import type { Project, StepNo } from '@/types/project';
import { ActivityLog } from './ActivityLog';
import { GuidePanel } from './GuidePanel';
import { NextActionBar } from './NextActionBar';
import { StepRail } from './StepRail';

/**
 * 모든 작업 화면 공통 배치
 *   위: 앱 머리줄 + "다음 할 일" 띠
 *   왼쪽: 단계 목록 · 가운데: 작업 영역 · 오른쪽: AI 작업지침
 *   가운데 아래: 작업 기록
 * 좁은 화면에서는 단계 목록이 가로로 눕고 지침이 작업 영역 아래로 내려간다.
 */
export function StudioLayout({
  project,
  step,
  saveState,
  children,
}: {
  project: Project;
  step: StepNo | null;
  saveState: SaveState;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader project={project} saveState={saveState} />
      <NextActionBar project={project} viewing={step} />

      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 lg:grid-cols-[236px_minmax(0,1fr)_340px] lg:px-6">
        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <StepRail project={project} active={step} />
        </div>

        <main className="min-w-0" data-testid={appTid('workspace')}>
          {children}
          <ActivityLog log={project.log} />
        </main>

        {step !== null && (
          <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
            <GuidePanel guide={GUIDES[step]} />
          </div>
        )}
      </div>
    </div>
  );
}

export function AppHeader({ project, saveState }: { project?: Project; saveState?: SaveState }) {
  return (
    <header className="border-b border-paper-line bg-paper">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 lg:px-6">
        <Link to="/projects" className="font-serif text-lg font-bold text-ink" data-testid={appTid('home')}>
          옛이야기 영상 공방
        </Link>
        {project && (
          <>
            <span className="min-w-0 truncate text-sm text-ink-soft" data-testid={appTid('project-title')}>
              {project.title}
            </span>
            <nav aria-label="프로젝트 메뉴" className="ml-auto flex flex-wrap items-center gap-3 text-sm">
              <Link to={`/p/${project.id}/source`} className="font-semibold text-jjok hover:underline" data-testid={appTid('source-link')}>원문·분석</Link>
              <Link to={`/p/${project.id}/serial`} className="font-semibold text-jjok hover:underline" data-testid={appTid('serial-link')}>시리즈·회차</Link>
              <Link to={`/p/${project.id}/audio`} className="font-semibold text-jjok hover:underline" data-testid={appTid('audio-link')}>오디오</Link>
              <Link to={`/p/${project.id}/images`} className="font-semibold text-jjok hover:underline" data-testid={appTid('images-link')}>그림 꾸러미</Link>
              <Link to={`/p/${project.id}/brief`} className="font-semibold text-jjok hover:underline" data-testid={appTid('brief-link')}>
                작업 브리핑
              </Link>
              <Link to={`/p/${project.id}/export`} className="font-semibold text-jjok hover:underline" data-testid={appTid('export-link')}>
                내보내기
              </Link>
              {saveState && (
                <span
                  className={`tabular-nums ${saveState.kind === 'error' ? 'font-semibold text-danger' : 'text-ink-faint'}`}
                  data-testid={appTid('save-status')}
                  data-state={saveState.kind}
                  role="status"
                >
                  {saveStateText(saveState)}
                </span>
              )}
            </nav>
          </>
        )}
        {!project && <span className="ml-auto text-xs text-ink-faint">{store.label}</span>}
        <div className="w-full border-t border-paper-line pt-1.5 lg:w-auto lg:border-0 lg:pt-0">
          <FolderStatus compact />
        </div>
      </div>
    </header>
  );
}
