import { useFolder } from '@/hooks/useFolder';
import { FOLDER_STATE_TEXT } from '@/lib/folder';
import { appTid } from '@/lib/testid';

/**
 * 작업 폴더 상태와 연결 버튼.
 * 폴더 선택·권한 허용 창은 브라우저가 띄우므로 운영자가 직접 누른다.
 */
export function FolderStatus({ compact = false }: { compact?: boolean }) {
  const { state, error, connect, reauthorize } = useFolder();
  if (!state) return null;

  const tone =
    state.kind === 'ready' ? 'text-celadon' : state.kind === 'unsupported' ? 'text-danger' : 'text-ocher';

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-2'} data-testid={appTid('folder')} data-state={state.kind}>
      <span className={`text-sm font-semibold ${tone}`} data-testid={appTid('folder-state')}>
        {FOLDER_STATE_TEXT[state.kind]}
        {'name' in state && <span className="font-normal text-ink-soft"> · {state.name}</span>}
      </span>
      {state.kind === 'none' && (
        <button type="button" className="btn-quiet px-2.5 py-1 text-xs" onClick={connect} data-testid={appTid('folder-connect')}>
          작업 폴더 연결 (운영자)
        </button>
      )}
      {state.kind === 'needs-permission' && (
        <button type="button" className="btn-quiet px-2.5 py-1 text-xs" onClick={reauthorize} data-testid={appTid('folder-reauthorize')}>
          폴더 다시 허용 (운영자)
        </button>
      )}
      {state.kind === 'ready' && !compact && (
        <button type="button" className="text-xs text-ink-faint hover:text-jjok" onClick={connect} data-testid={appTid('folder-change')}>
          다른 폴더로 바꾸기
        </button>
      )}
      {error && (
        <p className="text-[13px] text-danger" role="alert" data-testid={appTid('folder-error')}>
          폴더 연결 실패: {error}
        </p>
      )}
    </div>
  );
}
