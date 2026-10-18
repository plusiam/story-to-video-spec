import { GUIDES } from '@/guides';
import { tid } from '@/lib/testid';
import type { StepNo } from '@/types/project';

/** 아직 화면이 없는 단계. 무엇을 하게 될지만 보여 주고, 지침은 오른쪽에서 읽을 수 있다 */
export function StepPending({ step }: { step: StepNo }) {
  const g = GUIDES[step];
  const milestone = step <= 3 ? 'M2(글 단계)' : 'M3(자산 단계)';
  return (
    <div className="max-w-prose rounded-lg border border-dashed border-paper-line bg-paper px-5 py-6" data-testid={tid(step, 'pending')}>
      <p className="font-semibold">이 단계 화면은 {milestone}에서 만듭니다.</p>
      <p className="mt-2 text-ink-soft">이 단계가 남길 것: {g.purpose}</p>
      <p className="mt-2 text-ink-soft">오른쪽 작업지침은 미리 읽을 수 있습니다. 브라우저 AI는 이 단계에서 작업을 멈추고 운영자에게 알립니다.</p>
    </div>
  );
}
