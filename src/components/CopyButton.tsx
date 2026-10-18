import { useEffect, useState } from 'react';

/**
 * 복사 버튼 (에이전트 친화 원칙 8번)
 * 누르면 3초 동안 글자가 "복사됨"으로 바뀐다. 브라우저 AI는 이 글자로 성공을 확인한다.
 */
export function CopyButton({
  text,
  label = '복사',
  testid,
  className = 'btn-quiet',
}: {
  text: string;
  label?: string;
  testid: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const t = window.setTimeout(() => setState('idle'), 3000);
    return () => window.clearTimeout(t);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button type="button" className={className} data-testid={testid} onClick={copy} aria-live="polite">
      {state === 'copied' ? '복사됨' : state === 'failed' ? '복사 실패: 글을 직접 선택하세요' : label}
    </button>
  );
}
