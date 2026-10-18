import { useState } from 'react';
import { guideLabel, type Guide } from '@/guides';
import { appTid } from '@/lib/testid';

const OPEN_KEY = 'yetiyagi:guide-open';

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * 오른쪽 AI 작업지침 패널 — 7칸 양식 그대로 보여 준다.
 * 접어 두어도 /p/:id/brief 페이지에서 모든 단계의 지침을 한 번에 읽을 수 있다.
 */
export function GuidePanel({ guide }: { guide: Guide }) {
  const [open, setOpen] = useState(readOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(OPEN_KEY, String(next));
    } catch {
      /* 저장 못 해도 동작에는 지장 없음 */
    }
  };

  return (
    <aside
      aria-labelledby="guide-heading"
      data-testid={appTid('guide-panel')}
      data-guide={guideLabel(guide)}
      className="rounded-lg border border-paper-line bg-paper"
    >
      <div className="flex items-start justify-between gap-3 border-b border-paper-line px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-jjok">AI 작업지침 · {guideLabel(guide)}</p>
          <h2 id="guide-heading" className="text-lg">
            {guide.step}단계 {guide.title}
          </h2>
        </div>
        <button type="button" className="btn-quiet px-2.5 py-1 text-xs" onClick={toggle} aria-expanded={open} data-testid={appTid('guide-toggle')}>
          {open ? '접기' : '펼치기'}
        </button>
      </div>

      <div hidden={!open} className="space-y-4 px-4 py-4 text-sm">
        {!guide.implemented && (
          <p className="rounded-md bg-ocher-tint px-3 py-2 text-ocher" data-testid={appTid('guide-not-ready')}>
            이 단계 화면은 아직 준비 중입니다. 지침은 미리 읽을 수 있지만, 작업은 여기서 멈추고 운영자에게 알리세요.
          </p>
        )}
        <Section title="목적">
          <p>{guide.purpose}</p>
        </Section>
        <Section title="입력">
          <ul className="list-disc space-y-0.5 pl-5">
            {guide.inputs.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
        <Section title="해야 할 일">
          <ol className="list-decimal space-y-1 pl-5">
            {guide.actions.map((a) => (
              <li key={a.text}>
                {a.text}
                {a.testid && <code className="ml-1 rounded bg-paper-base px-1 text-[12px] text-ink-soft">{a.testid}</code>}
              </li>
            ))}
          </ol>
        </Section>
        <Section title="품질 기준">
          <p className="text-[13px] font-semibold text-ink-soft">화면이 자동으로 검사</p>
          <ul className="mb-2 list-disc space-y-0.5 pl-5">
            {guide.quality.auto.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="text-[13px] font-semibold text-ink-soft">눈으로 확인</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {guide.quality.visual.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
        <Section title="하지 말 것">
          <ul className="list-disc space-y-0.5 pl-5">
            {guide.avoid.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
        <Section title="완료 신호">
          <p>
            완료 버튼을 누르면 작업 기록에 「<strong>{guide.doneSignal}</strong>」이 남고, 「다음 할 일」 띠가 다음 단계를 가리킵니다.
          </p>
        </Section>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-sans text-[13px] font-bold text-ink">{title}</h3>
      {children}
    </section>
  );
}
