import { useState } from 'react';
import { CopyButton } from './CopyButton';

/**
 * 외부 AI 도움받기 상자 (에이전트 친화 원칙 8·9번)
 *   1) 요청문 보기 + 복사
 *   2) 외부 AI의 답 전체를 붙여 넣기 → 검사 → 반영
 * 검사에 실패하면 틀린 곳을 글로 보여 주고 아무것도 바꾸지 않는다.
 *
 * 이름표: {prefix}-request-text, {prefix}-copy-request, {prefix}-paste, {prefix}-paste-apply,
 *         {prefix}-paste-errors, {prefix}-paste-done
 */
export function AiAssist({
  prefix,
  title,
  request,
  pasteLabel,
  applyLabel,
  onApply,
  note,
}: {
  prefix: string;
  title: string;
  request: string;
  pasteLabel: string;
  applyLabel: string;
  /** 반영 성공이면 null, 실패면 오류 문장 목록 */
  onApply: (text: string) => string[] | null;
  note?: string;
}) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const apply = () => {
    const errs = onApply(text);
    if (errs && errs.length) {
      setErrors(errs);
      setDone(false);
    } else {
      setErrors([]);
      setText('');
      setDone(true);
    }
  };

  return (
    <section aria-labelledby={`${prefix}-ai-heading`} className="rounded-lg border border-paper-line bg-paper p-4">
      <h2 id={`${prefix}-ai-heading`} className="font-sans text-sm font-bold">
        {title}
      </h2>
      {note && <p className="mt-1 text-[13px] text-ink-soft">{note}</p>}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[13px] font-semibold text-ink-soft">① 요청문 — 외부 AI 새 대화에 붙여 넣으세요</span>
          <CopyButton text={request} label="요청문 복사" testid={`${prefix}-copy-request`} />
        </div>
        <pre
          className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-paper-line bg-white px-3 py-2 font-sans text-[13px] leading-relaxed text-ink"
          data-testid={`${prefix}-request-text`}
        >
          {request}
        </pre>
      </div>

      <div className="mt-4">
        <label htmlFor={`${prefix}-paste`} className="mb-1 block text-[13px] font-semibold text-ink-soft">
          ② {pasteLabel}
        </label>
        <textarea
          id={`${prefix}-paste`}
          rows={4}
          className="input text-[14px]"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDone(false);
          }}
          placeholder="외부 AI의 답 전체를 여기에 붙여 넣으세요"
          data-testid={`${prefix}-paste`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-quiet" disabled={!text.trim()} onClick={apply} data-testid={`${prefix}-paste-apply`}>
            {applyLabel}
          </button>
          {done && (
            <span className="text-sm font-semibold text-celadon" role="status" data-testid={`${prefix}-paste-done`}>
              반영했습니다. 작업 기록에 남겼습니다.
            </span>
          )}
        </div>
        {errors.length > 0 && (
          <ul className="mt-2 list-disc space-y-0.5 rounded-md bg-danger-tint py-2 pl-8 pr-3 text-sm text-danger" role="alert" data-testid={`${prefix}-paste-errors`}>
            {errors.slice(0, 12).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {errors.length > 12 && <li>그 밖에 {errors.length - 12}개 더</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
