import { useState, useCallback } from 'react';
import { CONFIG } from '@/lib/config';
import type { Work, Json } from '@/types';

/**
 * 게스트 모드 작품 관리 훅 (localStorage 기반)
 */
export function useGuestWorks() {
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STORAGE_KEY = CONFIG.GUEST_STORAGE_KEY;

  // localStorage에서 작품 목록 읽기
  const getStoredWorks = useCallback((): Work[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [STORAGE_KEY]);

  // localStorage에 작품 목록 저장
  const saveWorks = useCallback((workList: Work[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workList));
  }, [STORAGE_KEY]);

  // 모든 작품 조회
  const fetchWorks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const storedWorks = getStoredWorks();
      setWorks(storedWorks);
    } catch {
      setError('작품을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [getStoredWorks]);

  // 작품 생성
  const createWork = useCallback(async (title: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const newWork: Work = {
        id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: CONFIG.GUEST_USER_ID,
        title,
        theme: null,
        characters: null,
        panels: [] as unknown as Json,
        notes: null,
        created_at: now,
        updated_at: now,
      };

      const storedWorks = getStoredWorks();
      const updatedWorks = [newWork, ...storedWorks];
      saveWorks(updatedWorks);
      setWorks(updatedWorks);
      return newWork;
    } catch {
      setError('작품 생성에 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getStoredWorks, saveWorks]);

  // 작품 업데이트
  const updateWork = useCallback(async (workId: string, updates: Partial<Omit<Work, 'id' | 'user_id' | 'created_at'>>) => {
    setIsLoading(true);
    setError(null);
    try {
      const storedWorks = getStoredWorks();
      const updatedWorks = storedWorks.map(w => {
        if (w.id === workId) {
          return { ...w, ...updates, updated_at: new Date().toISOString() };
        }
        return w;
      });
      saveWorks(updatedWorks);
      setWorks(updatedWorks);

      const updatedWork = updatedWorks.find(w => w.id === workId);
      return updatedWork || null;
    } catch {
      setError('작품 저장에 실패했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getStoredWorks, saveWorks]);

  // 작품 삭제
  const deleteWork = useCallback(async (workId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const storedWorks = getStoredWorks();
      const updatedWorks = storedWorks.filter(w => w.id !== workId);
      saveWorks(updatedWorks);
      setWorks(updatedWorks);
      return true;
    } catch {
      setError('작품 삭제에 실패했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getStoredWorks, saveWorks]);

  // 단일 작품 조회
  const getWork = useCallback(async (workId: string) => {
    try {
      const storedWorks = getStoredWorks();
      const work = storedWorks.find(w => w.id === workId);
      return work || null;
    } catch {
      setError('작품을 찾을 수 없습니다.');
      return null;
    }
  }, [getStoredWorks]);

  return {
    works,
    isLoading,
    error,
    fetchWorks,
    createWork,
    updateWork,
    deleteWork,
    getWork,
  };
}
