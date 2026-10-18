import { Link } from 'react-router-dom';
import { GUIDES } from '@/guides';
import { appTid } from '@/lib/testid';
import { STATUS_LABEL, stepStatus, type StepStatus } from '@/lib/steps';
import { STEP_NUMBERS, type Project, type StepNo } from '@/types/project';

const CHIP: Record<StepStatus, string> = {
  done: 'bg-celadon-tint text-celadon',
  doing: 'bg-jjok-tint text-jjok',
  waiting: 'bg-paper-base text-ink-soft',
  blocked: 'bg-ocher-tint text-ocher',
};

/** 왼쪽 단계 목록. 막힌 단계도 열어 볼 수 있다(지침을 읽기 위해) */
export function StepRail({ project, active }: { project: Project; active: StepNo | null }) {
  return (
    <nav aria-label="제작 단계" data-testid={appTid('step-rail')}>
      <ol className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {STEP_NUMBERS.map((n) => {
          const status = stepStatus(n, project);
          const isActive = n === active;
          return (
            <li key={n} className="shrink-0">
              <Link
                to={`/p/${project.id}/step/${n}`}
                data-testid={appTid('nav-step', n)}
                data-status={status}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  isActive ? 'bg-paper text-ink shadow-[inset_3px_0_0_#26407A]' : 'text-ink-soft hover:bg-paper/70'
                }`}
              >
                <span className={`w-5 text-right font-serif text-base ${isActive ? 'text-jjok' : 'text-ink-faint'}`}>{n}</span>
                <span className="flex-1 whitespace-nowrap font-medium">{GUIDES[n].title}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${CHIP[status]}`}>{STATUS_LABEL[status]}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
