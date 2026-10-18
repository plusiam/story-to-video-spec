import { Navigate, useParams } from 'react-router-dom';
import { StepChecks } from '@/components/StepChecks';
import { StudioLayout } from '@/components/StudioLayout';
import { GUIDES } from '@/guides';
import { useProject } from '@/hooks/useProject';
import { currentStep } from '@/lib/steps';
import { tid } from '@/lib/testid';
import { Step0Settings } from '@/steps/Step0Settings';
import { StepPending } from '@/steps/StepPending';
import type { StepNo } from '@/types/project';
import { LoadingOrError } from './LoadingOrError';

const OUTPUT: Record<StepNo, string> = {
  0: '출처·길이 확정',
  1: '내레이션 원고',
  2: '장면표',
  3: '인물·장소 카드',
  4: '인물 기준 시트 승인',
  5: '장면 그림, 움직임 클립',
  6: '장면별 음성',
  7: '자막·설명문·ZIP',
};

function parseStep(raw: string | undefined): StepNo | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 7 ? (n as StepNo) : null;
}

/** /p/:id/step/:n — 단계별 작업 화면 */
export function StepPage() {
  const { id, n } = useParams();
  const step = parseStep(n);
  const api = useProject(id);
  const { project } = api;

  if (step === null) return <Navigate to={`/p/${id}`} replace />;
  if (!project) return <LoadingOrError error={api.loadError} />;

  return (
    <StudioLayout project={project} step={step} saveState={api.saveState}>
      <header className="mb-6">
        <p className="text-sm text-ink-soft">
          {step}단계 · 산출물: {OUTPUT[step]}
        </p>
        <h1 className="text-[28px] leading-tight" data-testid={tid(step, 'heading')}>
          {GUIDES[step].title}
        </h1>
      </header>

      {step === 0 ? <Step0Settings project={project} api={api} /> : <StepPending step={step} />}

      <StepChecks step={step} project={project} api={api} />
    </StudioLayout>
  );
}

/** /p/:id — 지금 해야 할 단계로 보낸다 */
export function ProjectRedirect() {
  const { id } = useParams();
  const api = useProject(id);
  if (!api.project) return <LoadingOrError error={api.loadError} />;
  return <Navigate to={`/p/${id}/step/${currentStep(api.project) ?? 7}`} replace />;
}
