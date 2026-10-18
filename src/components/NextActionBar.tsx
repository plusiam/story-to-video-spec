import { Link } from 'react-router-dom';
import { useFolder } from '@/hooks/useFolder';
import { appTid } from '@/lib/testid';
import { nextAction } from '@/lib/steps';
import type { Project, StepNo } from '@/types/project';

/**
 * "다음 할 일" 띠 (에이전트 친화 원칙 4번)
 * 사람과 브라우저 AI가 같은 문장을 읽는다. 화면에서 가장 강한 요소는 이것 하나다.
 */
export function NextActionBar({ project, viewing }: { project: Project; viewing: StepNo | null }) {
  const { state } = useFolder();
  const next = nextAction(project, { folder: state });
  const elsewhere = next.step !== null && next.step !== viewing;

  return (
    <div className="bg-jjok text-white" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 lg:px-6">
        <span className="font-serif text-sm text-white/80">다음 할 일</span>
        <p className="min-w-0 flex-1 text-[15px] font-semibold" data-testid={appTid('next-action')} data-step={next.step ?? ''}>
          {next.text}
        </p>
        {elsewhere && (
          <Link
            to={`/p/${project.id}/step/${next.step}`}
            className="btn bg-white text-jjok hover:bg-jjok-tint"
            data-testid={appTid('next-action-go')}
          >
            {next.step}단계로 가기
          </Link>
        )}
      </div>
    </div>
  );
}
