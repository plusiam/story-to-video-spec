import { Link, useParams } from 'react-router-dom';
import { GUIDES } from '@/guides';
import { tid } from '@/lib/testid';
import type { StepNo } from '@/types/project';

/** 아직 화면이 없는 단계. 무엇을 하게 될지만 보여 주고, 지침은 오른쪽에서 읽을 수 있다 */
export function StepPending({ step }: { step: StepNo }) {
  const g = GUIDES[step];
  const { id } = useParams();
  const milestone = step <= 3 ? 'M2(글 단계)' : 'M3(자산 단계)';
  return (
    <div className="max-w-prose rounded-lg border border-dashed border-paper-line bg-paper px-5 py-6" data-testid={tid(step, 'pending')}>
      <p className="font-semibold">이 단계 화면은 {milestone}에서 만듭니다.</p>
      <p className="mt-2 text-ink-soft">이 단계가 남길 것: {g.purpose}</p>
      {step === 4 && id && (
        <p className="mt-2">지금은 <Link className="font-semibold text-jjok hover:underline" to={`/p/${id}/audio`} data-testid={tid(step, 'audio-link')}>오디오 화면</Link>에서 성우·낭독 블록·효과음 큐·마스터를 기록할 수 있습니다. 이 단계의 완료 처리는 아직 없습니다.</p>
      )}
      {(step === 5 || step === 6) && id && (
        <p className="mt-2">지금은 <Link className="font-semibold text-jjok hover:underline" to={`/p/${id}/images`} data-testid={tid(step, 'images-link')}>그림 꾸러미(Genspark 컷 카드)</Link>에서 기준 이미지와 장면 카드를 준비할 수 있습니다. 새 그림이 필요한 장면만 만드세요. 이 단계의 완료 처리는 아직 없습니다.</p>
      )}
      <p className="mt-2 text-ink-soft">오른쪽 작업지침은 미리 읽을 수 있습니다. 브라우저 AI는 이 단계에서 작업을 멈추고 운영자에게 알립니다.</p>
    </div>
  );
}
