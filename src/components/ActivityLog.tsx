import { clock } from '@/lib/project';
import { appTid } from '@/lib/testid';
import type { LogEntry } from '@/types/project';

/** 작업 기록 (에이전트 친화 원칙 5번) — 알림은 사라지지만 여기에는 남는다 */
export function ActivityLog({ log, limit = 15 }: { log: LogEntry[]; limit?: number }) {
  const recent = [...log].reverse().slice(0, limit);
  return (
    <section aria-labelledby="log-heading" className="mt-10 border-t border-paper-line pt-4">
      <h2 id="log-heading" className="mb-2 font-sans text-sm font-bold text-ink-soft">
        작업 기록
      </h2>
      <ol className="space-y-1 text-[13px]" data-testid={appTid('log')}>
        {recent.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-3" data-testid={appTid('log-entry')}>
            <time dateTime={e.at} className="w-11 shrink-0 tabular-nums text-ink-faint">
              {clock(e.at)}
            </time>
            <span className="text-ink">{e.event}</span>
            {e.guide && <span className="text-ink-faint">{e.guide}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
