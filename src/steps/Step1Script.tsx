import { AiAssist } from '@/components/AiAssist';
import type { ProjectApi } from '@/hooks/useProject';
import { rewriteRequest } from '@/lib/aiRequests';
import { appendLog, DEFAULT_TONE } from '@/lib/project';
import { tid } from '@/lib/testid';
import { charCount, estimateSec, flagSentences, splitSentences, targetRange } from '@/lib/text';
import type { Project } from '@/types/project';

const OUTLINE_LABELS = [
  { label: '기 — 시작', hint: '누가, 어디서, 어떻게 살고 있었나' },
  { label: '승 — 전개', hint: '어떤 일이 생기고 어떻게 커지나' },
  { label: '전 — 위기', hint: '가장 아슬아슬한 순간' },
  { label: '결 — 맺음', hint: '어떻게 끝나고 무엇이 남나' },
];

const FLAG_LABEL = { long: '긴 문장', latin: '영어', digit: '숫자' } as const;

/** 1단계 이야기 다시 쓰기 */
export function Step1Script({ project, api }: { project: Project; api: ProjectApi }) {
  const p = project;
  const locked = Boolean(p.progress[1]);
  const { target, min, max } = targetRange(p.target.durationSec);
  const n = charCount(p.script.fullText);
  const sentences = splitSentences(p.script.fullText);
  const flags = flagSentences(p.script.fullText);
  const pct = Math.min(100, Math.round((n / max) * 100));
  const inRange = n >= min && n <= max;
  const minutes = Math.floor(estimateSec(p.script.fullText) / 60);
  const seconds = estimateSec(p.script.fullText) % 60;

  const setScript = (patch: Partial<Project['script']>) => api.update((cur) => ({ ...cur, script: { ...cur.script, ...patch } }));

  return (
    <div className="space-y-8">
      <fieldset disabled={locked} className="max-w-prose space-y-3">
        <legend className="mb-1 font-sans text-sm font-bold">기승전결 뼈대</legend>
        {OUTLINE_LABELS.map((o, i) => (
          <div key={o.label}>
            <label htmlFor={tid(1, 'outline', i + 1)} className="field-label">
              {o.label} <span className="font-normal text-ink-faint">{o.hint}</span>
            </label>
            <input
              id={tid(1, 'outline', i + 1)}
              className="input"
              value={p.script.outline[i]}
              onChange={(e) => {
                const outline = [...p.script.outline] as Project['script']['outline'];
                outline[i] = e.target.value;
                setScript({ outline });
              }}
              data-testid={tid(1, 'outline', i + 1)}
            />
          </div>
        ))}
        <div>
          <label htmlFor="s1-tone" className="field-label">
            말투
          </label>
          <input id="s1-tone" className="input text-[14px]" value={p.script.tone} onChange={(e) => setScript({ tone: e.target.value })} data-testid={tid(1, 'tone')} />
          {p.script.tone !== DEFAULT_TONE && (
            <button type="button" className="mt-1 text-xs text-ink-faint hover:text-jjok" onClick={() => setScript({ tone: DEFAULT_TONE })} data-testid={tid(1, 'tone-reset')}>
              기본 말투로 되돌리기
            </button>
          )}
        </div>
      </fieldset>

      {!locked && (
        <AiAssist
          prefix="s1"
          title="외부 AI로 원고 쓰기·다듬기"
          note="뼈대만 있으면 새로 쓰고, 원고가 있으면 조건에 맞게 다듬어 달라고 요청합니다."
          request={rewriteRequest(p)}
          pasteLabel="외부 AI가 쓴 원고를 붙여 넣으세요 (지금 원고를 바꿉니다)"
          applyLabel="원고에 반영"
          onApply={(text) => {
            const clean = text.replace(/```[a-z]*\n?|```/g, '').trim();
            if (charCount(clean) < 100) return ['원고가 너무 짧습니다. 외부 AI의 답 전체를 복사했는지 확인하세요.'];
            api.update((cur) => appendLog({ ...cur, script: { ...cur.script, fullText: clean, ownWordingConfirmed: false } }, `외부 AI 원고를 반영했습니다 (${charCount(clean)}자)`, 'GUIDE-S1 v1.1'));
            return null;
          }}
        />
      )}

      <fieldset disabled={locked} className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor="s1-full-text" className="field-label mb-0">
            내레이션 원고
          </label>
          <div className="min-w-[240px] flex-1 sm:max-w-sm" data-testid={tid(1, 'length-meter')} data-chars={n} data-min={min} data-max={max}>
            <div className="flex justify-between text-[13px] tabular-nums">
              <span className={inRange ? 'font-semibold text-celadon' : 'font-semibold text-ocher'}>
                {n.toLocaleString('ko-KR')}자
              </span>
              <span className="text-ink-soft">
                목표 {target.toLocaleString('ko-KR')}자 ({min.toLocaleString('ko-KR')}~{max.toLocaleString('ko-KR')}) · 약 {minutes}분 {seconds}초
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-line" aria-hidden>
              <div className={`h-full ${inRange ? 'bg-celadon' : 'bg-ocher'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <textarea
          id="s1-full-text"
          rows={18}
          className="input font-serif text-[16px] leading-[1.9]"
          value={p.script.fullText}
          onChange={(e) => setScript({ fullText: e.target.value })}
          placeholder="옛날 옛적, 깊은 산골에 마음씨 착한 나무꾼이 살았단다."
          aria-describedby="s1-full-text-hint"
          data-testid={tid(1, 'full-text')}
        />
        <p id="s1-full-text-hint" className="field-hint">
          글자 수는 공백을 뺀 수입니다. 1분에 약 250자로 계산합니다. 문단은 장면이 바뀌는 곳에서 나누면 2단계가 쉬워집니다. 문장 {sentences.length}개.
        </p>
      </fieldset>

      <section aria-labelledby="s1-flags-heading" data-testid={tid(1, 'flags')} data-count={flags.length}>
        <h2 id="s1-flags-heading" className="mb-2 font-sans text-sm font-bold">
          문장 점검 {flags.length === 0 ? '— 고칠 문장 없음' : `— ${flags.length}곳`}
        </h2>
        {flags.length > 0 && (
          <ol className="space-y-1.5 text-sm">
            {flags.map((f, i) => (
              <li key={`${f.kind}-${f.sentenceNo}`} className="rounded-md border border-paper-line bg-white px-3 py-2" data-testid={tid(1, 'flag', i + 1)} data-kind={f.kind}>
                <span className="mr-2 rounded bg-ocher-tint px-1.5 py-0.5 text-xs font-semibold text-ocher">{FLAG_LABEL[f.kind]}</span>
                <span className="text-ink-soft">{f.sentenceNo}번째 문장 · {f.detail}</span>
                <span className="mt-0.5 block font-serif text-ink">{f.sentence}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <label className="flex max-w-prose items-start gap-3 rounded-md border border-paper-line bg-white px-3 py-2.5">
        <input
          type="checkbox"
          checked={p.script.ownWordingConfirmed}
          disabled={locked}
          onChange={(e) => setScript({ ownWordingConfirmed: e.target.checked })}
          className="mt-1 accent-[#26407A]"
          data-testid={tid(1, 'own-wording')}
        />
        <span>
          <span className="block font-semibold">출판된 책의 문장을 옮기지 않았습니다</span>
          <span className="block text-[13px] text-ink-soft">원고를 처음부터 끝까지 읽고 확인합니다. 원고를 새로 반영하면 이 확인은 풀립니다.</span>
        </span>
      </label>
    </div>
  );
}
