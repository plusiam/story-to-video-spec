import { Link } from 'react-router-dom';
import { GUIDES } from '@/guides';
import type { ProjectApi } from '@/hooks/useProject';
import { clock } from '@/lib/project';
import { blockReason, checksFor } from '@/lib/steps';
import { appTid } from '@/lib/testid';
import type { Project, StepNo } from '@/types/project';

/**
 * 품질 점검표 + 완료 버튼 (에이전트 친화 원칙 11번)
 * 점검을 통과하기 전에는 완료 버튼이 잠기고, 잠긴 이유를 버튼 아래 글로 보여 준다.
 */
export function StepChecks({ step, project, api }: { step: StepNo; project: Project; api: ProjectApi }) {
  const checks = checksFor(step, project);
  const failing = checks.filter((c) => !c.ok);
  const done = project.progress[step];
  const blocked = blockReason(step, project);
  const locked = failing.length > 0 || blocked !== null;
  const next = step < 7 ? ((step + 1) as StepNo) : null;

  return (
    <section aria-labelledby={`checks-${step}`} className="mt-8 rounded-lg border border-paper-line bg-paper p-4">
      <h2 id={`checks-${step}`} className="mb-3 font-sans text-sm font-bold">
        품질 점검
      </h2>
      <ul className="mb-4 space-y-1.5 text-sm" data-testid={appTid('checks')}>
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2" data-testid={appTid(`check-${c.id}`)} data-ok={c.ok}>
            <span aria-hidden className={`mt-0.5 font-bold ${c.ok ? 'text-celadon' : 'text-ocher'}`}>
              {c.ok ? '✓' : '·'}
            </span>
            <span>
              <span className={c.ok ? 'text-ink' : 'font-semibold text-ink'}>{c.label}</span>
              <span className="sr-only">{c.ok ? ' 통과' : ' 미통과'}</span>
              {!c.ok && <span className="block text-[13px] text-ink-soft">{c.fix}</span>}
            </span>
          </li>
        ))}
      </ul>

      {done ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-celadon" data-testid={appTid('step-done')}>
            완료됨 {clock(done.completedAt)} · {GUIDES[step].doneSignal}
          </p>
          {next !== null && (
            <Link to={`/p/${project.id}/step/${next}`} className="btn-primary" data-testid={appTid('step-next')}>
              {next}단계 「{GUIDES[next].title}」로
            </Link>
          )}
          <button type="button" className="btn-quiet" onClick={() => api.reopenStep(step)} data-testid={`s${step}-reopen`}>
            다시 고치기
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn-primary"
            disabled={locked}
            aria-describedby={locked ? `lock-${step}` : undefined}
            onClick={() => api.completeStep(step)}
            data-testid={`s${step}-complete`}
          >
            {step}단계 완료
          </button>
          {locked && (
            <p id={`lock-${step}`} className="mt-2 text-[13px] text-ocher" data-testid={appTid('complete-locked-reason')}>
              {blocked ?? `점검 ${failing.length}개가 남아 완료할 수 없습니다: ${failing.map((c) => c.label).join(', ')}`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
