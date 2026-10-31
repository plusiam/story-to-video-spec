/**
 * 작업 폴더 상태를 앱 전체에 나눠 준다.
 * 화면이 다시 보일 때(다른 탭에서 돌아올 때)마다 권한을 다시 확인한다.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { connectFolder, getFolderState, reauthorizeFolder, type FolderState } from '@/lib/folder';

interface FolderApi {
  state: FolderState | null;
  /** 마지막 연결 시도의 오류 문장 */
  error: string | null;
  connect: () => Promise<void>;
  reauthorize: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<FolderApi | null>(null);

export function FolderProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FolderState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await getFolderState());
    } catch (e) {
      setState({ kind: 'none' });
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => document.visibilityState === 'visible' && void refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const run = useCallback(async (fn: () => Promise<FolderState>) => {
    setError(null);
    try {
      setState(await fn());
    } catch (e) {
      // 운영자가 선택 창을 닫으면 AbortError — 오류로 보지 않는다
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  return (
    <Ctx.Provider
      value={{ state, error, connect: () => run(connectFolder), reauthorize: () => run(reauthorizeFolder), refresh }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFolder(): FolderApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('FolderProvider 안에서만 useFolder를 쓸 수 있습니다');
  return v;
}
