/**
 * 프로젝트 하나를 불러오고, 고치고, 2초 뒤 자동 저장한다.
 * 화면에는 "저장됨 20:41" / "저장 중…" / 오류 문장을 그대로 보여 준다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { GUIDES, guideLabel } from '@/guides';
import { appendLog, clock, nowIso, invalidateEditedSteps } from '@/lib/project';
import { mirrorProject } from '@/lib/folder';
import { blockReason, checksFor, type StepEnv } from '@/lib/steps';
import { store } from '@/lib/storage';
import type { Project, StepNo } from '@/types/project';

export type SaveState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'saved'; at: string; folder: string | null }
  | { kind: 'error'; message: string };

export const AUTOSAVE_MS = 2000;

export function saveStateText(s: SaveState): string {
  switch (s.kind) {
    case 'idle':
      return '변경 없음';
    case 'pending':
      return '저장 중…';
    case 'saved':
      return s.folder ? `저장됨 ${clock(s.at)} · 작업 폴더에도 저장` : `저장됨 ${clock(s.at)} · 이 브라우저에만`;
    case 'error':
      return `저장 실패: ${s.message}`;
  }
}

export function useProject(id: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const timer = useRef<number | null>(null);
  const latest = useRef<Project | null>(null);
  const expectedJson = useRef<string | undefined>(undefined);
  const conflict = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // 불러오기
  useEffect(() => {
    let alive = true;
    setProject(null);
    setLoadError(null);
    conflict.current = false;
    expectedJson.current = undefined;
    if (!id) return;
    store.get(id).then((p) => {
      if (!alive) return;
      if (p) {
        latest.current = p;
        expectedJson.current = JSON.stringify(p);
        setProject(p);
      } else {
        setLoadError(`프로젝트 ${id}를 찾지 못했습니다. 프로젝트 목록에서 다시 고르세요.`);
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const flush = useCallback(async () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const p = latest.current;
    if (!p) return false;
    if (conflict.current) { setSaveState({ kind: 'error', message: '다른 창의 변경이 감지되어 저장을 중단했습니다. 이 탭의 변경을 백업하고 새로 열어 비교하세요.' }); return false; }
    try {
      await store.save(p, expectedJson.current);
      expectedJson.current = JSON.stringify(p);
    } catch (err) {
      const saved = await store.get(p.id);
      if (saved && JSON.stringify(saved) === JSON.stringify(p)) expectedJson.current = JSON.stringify(p);
      else if (err instanceof Error && err.message.includes('다른 창이나 작업')) conflict.current = true;
      setSaveState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      return false;
    }
    try {
      const m = await mirrorProject(p);
      setSaveState({ kind: 'saved', at: p.updatedAt, folder: m.written ? m.folder ?? null : null });
      return true;
    } catch (err) {
      setSaveState({ kind: 'error', message: `브라우저에는 저장했지만 작업 폴더에 쓰지 못했습니다: ${err instanceof Error ? err.message : String(err)}` });
      return false;
    }
  }, []);

  // 화면을 떠날 때 남은 변경을 바로 저장
  useEffect(() => {
    const onHide = (e: BeforeUnloadEvent) => {
      if (timer.current) void flush();
      if (conflict.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      if (timer.current) void flush();
    };
  }, [flush]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!id || e.key !== 'yetiyagi:project:' + id) return;
      if (e.newValue === expectedJson.current) return;
      conflict.current = true;
      if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
      setSaveState({ kind: 'error', message: '다른 창에서 프로젝트가 바뀌었습니다. 이 탭은 저장을 중단했습니다. 내보내기에서 이 탭의 변경을 보관하고 새로 열어 비교하세요.' });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [id]);

  /** 프로젝트 고치기. 2초 동안 추가 입력이 없으면 저장한다 */
  const update = useCallback(
    (fn: (p: Project) => Project) => {
      if (!mounted.current) return false;
      if (conflict.current) { setSaveState({ kind: 'error', message: '충돌 상태입니다. 이 탭의 변경을 백업한 뒤 새로 열어 비교하세요.' }); return false; }
      setProject((prev) => {
        if (!prev) return prev;
        const next = { ...invalidateEditedSteps(prev, fn(prev)), updatedAt: nowIso() };
        latest.current = next;
        return next;
      });
      setSaveState({ kind: 'pending' });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
      return true;
    },
    [flush],
  );

  /** 작업 기록 남기기 (알림은 사라지지만 기록은 남는다) */
  const log = useCallback(
    (event: string, step: StepNo | null = null) => {
      update((p) => appendLog(p, event, step === null ? null : guideLabel(GUIDES[step])));
    },
    [update],
  );

  /** 단계 완료. 점검을 통과하지 못하면 false와 사유를 돌려준다 */
  const completeStep = useCallback(
    (step: StepNo, env: StepEnv): { ok: true } | { ok: false; reasons: string[] } => {
      const p = latest.current;
      if (!p) return { ok: false, reasons: ['프로젝트를 아직 불러오지 못했습니다.'] };
      const blocked = blockReason(step, p);
      if (blocked) return { ok: false, reasons: [blocked] };
      const failing = checksFor(step, p, env).filter((c) => !c.ok);
      if (failing.length) return { ok: false, reasons: failing.map((c) => c.fix) };
      update((cur) =>
        appendLog(
          { ...cur, progress: { ...cur.progress, [step]: { completedAt: nowIso() } } },
          `${step}단계 「${GUIDES[step].title}」 완료 — ${GUIDES[step].doneSignal}`,
          guideLabel(GUIDES[step]),
        ),
      );
      return { ok: true };
    },
    [update],
  );

  /** 완료 취소 (다시 고칠 때) */
  const reopenStep = useCallback(
    (step: StepNo) => {
      update((cur) => {
        const progress = { ...cur.progress };
        for (const n of Object.keys(progress)) {
          if (Number(n) >= step) delete progress[Number(n) as StepNo];
        }
        return appendLog({ ...cur, progress }, `${step}단계 「${GUIDES[step].title}」 완료를 취소하고 다시 엽니다`, guideLabel(GUIDES[step]));
      });
    },
    [update],
  );

  return { project, loadError, saveState, update, log, completeStep, reopenStep, flush };
}

export type ProjectApi = ReturnType<typeof useProject>;
