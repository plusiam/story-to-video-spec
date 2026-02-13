import { useState, useCallback, useEffect } from 'react';
import type { AIUsageStatus, VisualDNA } from '@/types';

// 역할별 일일 한도 (서버와 동일하게 유지)
const ROLE_LIMITS: Record<string, number> = {
  admin: Infinity,
  judge: Infinity,
  user: 30,
  guest: 5,
};

/**
 * AI 사용량 관리 훅
 *
 * 역할별 사용량 제한:
 * - admin/judge → 무제한
 * - user → 30회/일
 * - guest → 5회/일
 *
 * 서버(api/gemini)에서도 Rate Limiting을 하지만,
 * 클라이언트에서도 UX를 위해 사전 체크합니다.
 * localStorage 기반이므로 우회 가능하지만,
 * 서버에서도 동일하게 제한하므로 이중 보호됩니다.
 */
export function useAIUsage(userId: string | undefined, userRole?: string) {
  const role = userRole || 'guest';
  const dailyLimit = ROLE_LIMITS[role] ?? ROLE_LIMITS.guest;
  const isUnlimited = !Number.isFinite(dailyLimit);

  const [usageStatus, setUsageStatus] = useState<AIUsageStatus>({
    usedCount: 0,
    dailyLimit: isUnlimited ? 0 : dailyLimit,
    remaining: isUnlimited ? 0 : dailyLimit,
    isUnlimited
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 사용량 상태 조회 (로컬 스토리지 기반)
  const fetchUsageStatus = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // admin/judge 역할은 무제한
      if (isUnlimited) {
        setUsageStatus({
          usedCount: 0,
          dailyLimit: 0,
          remaining: 0,
          isUnlimited: true
        });
        return;
      }

      // 로컬 스토리지 기반 사용량 추적
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `ai_usage_${userId}_${today}`;
      const savedUsage = localStorage.getItem(usageKey);
      const usedCount = savedUsage ? parseInt(savedUsage, 10) : 0;

      setUsageStatus({
        usedCount,
        dailyLimit,
        remaining: Math.max(dailyLimit - usedCount, 0),
        isUnlimited: false
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to fetch AI usage:', err);
      }
      setError(err instanceof Error ? err.message : 'AI 사용량 조회 실패');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isUnlimited, dailyLimit]);

  // 사용량 증가 (AI 호출 전 실행)
  const incrementUsage = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    // 무제한이면 바로 허용
    if (isUnlimited) return true;

    const today = new Date().toISOString().split('T')[0];
    const usageKey = `ai_usage_${userId}_${today}`;
    const savedUsage = localStorage.getItem(usageKey);
    const currentCount = savedUsage ? parseInt(savedUsage, 10) : 0;
    const newCount = currentCount + 1;

    const canUse = newCount <= dailyLimit;

    if (canUse) {
      localStorage.setItem(usageKey, newCount.toString());
      setUsageStatus({
        usedCount: newCount,
        dailyLimit,
        remaining: Math.max(dailyLimit - newCount, 0),
        isUnlimited: false
      });
    }

    return canUse;
  }, [userId, isUnlimited, dailyLimit]);

  // 서버 응답의 remaining으로 동기화
  const syncFromServer = useCallback((serverRemaining: number) => {
    if (isUnlimited || !userId) return;

    const usedCount = dailyLimit - serverRemaining;
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `ai_usage_${userId}_${today}`;
    localStorage.setItem(usageKey, usedCount.toString());

    setUsageStatus({
      usedCount,
      dailyLimit,
      remaining: Math.max(serverRemaining, 0),
      isUnlimited: false
    });
  }, [userId, isUnlimited, dailyLimit]);

  // 사용 가능 여부
  const canUseAI = isUnlimited || usageStatus.remaining > 0;

  // 초기 로드
  useEffect(() => {
    if (userId) {
      fetchUsageStatus();
    }
  }, [userId, fetchUsageStatus]);

  return {
    usageStatus,
    canUseAI,
    isLoading,
    error,
    fetchUsageStatus,
    incrementUsage,
    syncFromServer
  };
}

/**
 * 비주얼 DNA 관리 훅
 * 로컬 스토리지 기반
 */
export function useVisualDNA(workId: string | undefined) {
  const [visualDNA, setVisualDNA] = useState<VisualDNA | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 비주얼 DNA 조회
  const fetchVisualDNA = useCallback(async () => {
    if (!workId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const saved = localStorage.getItem(`visual_dna_${workId}`);
      if (saved) {
        const dna = JSON.parse(saved) as VisualDNA;
        setVisualDNA(dna);
        return dna;
      }

      return null;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to fetch visual DNA:', err);
      }
      setError(err instanceof Error ? err.message : '비주얼 DNA 조회 실패');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workId]);

  // 비주얼 DNA 저장/업데이트
  const saveVisualDNA = useCallback(async (dna: VisualDNA): Promise<boolean> => {
    if (!workId) return false;

    setIsLoading(true);
    setError(null);

    try {
      localStorage.setItem(`visual_dna_${workId}`, JSON.stringify(dna));
      setVisualDNA(dna);
      return true;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Failed to save visual DNA:', err);
      }
      setError(err instanceof Error ? err.message : '비주얼 DNA 저장 실패');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [workId]);

  // 초기 로드
  useEffect(() => {
    if (workId) {
      fetchVisualDNA();
    }
  }, [workId, fetchVisualDNA]);

  return {
    visualDNA,
    isLoading,
    error,
    fetchVisualDNA,
    saveVisualDNA,
    setVisualDNA
  };
}
