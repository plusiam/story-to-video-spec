import { useState, useCallback, useEffect } from 'react';
import type { AIUsageStatus, VisualDNA } from '@/types';
import { checkAIServiceStatus } from '@/lib/aiService';

const DAILY_LIMIT = 30;

/**
 * AI 사용량 관리 훅
 *
 * 우선순위:
 * 1. admin/judge 역할 → 무제한
 * 2. 서버 프록시 가용 (GEMINI_API_KEY on Vercel) → 무제한
 * 3. 로컬 스토리지 기반 일일 사용량 추적
 */
export function useAIUsage(userId: string | undefined, userRole?: string) {
  const [usageStatus, setUsageStatus] = useState<AIUsageStatus>({
    usedCount: 0,
    dailyLimit: DAILY_LIMIT,
    remaining: DAILY_LIMIT,
    isUnlimited: false
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
      const isPrivileged = userRole === 'admin' || userRole === 'judge';
      if (isPrivileged) {
        setUsageStatus({
          usedCount: 0,
          dailyLimit: 0,
          remaining: 0,
          isUnlimited: true
        });
        return;
      }

      // 서버 프록시 사용 가능 여부 확인
      try {
        const serverAvailable = await checkAIServiceStatus();
        if (serverAvailable) {
          setUsageStatus({
            usedCount: 0,
            dailyLimit: 0,
            remaining: 0,
            isUnlimited: true
          });
          return;
        }
      } catch {
        // 서버 프록시 불가 → 일일 제한 모드로 진행
      }

      // 로컬 스토리지 기반 사용량 추적
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `ai_usage_${userId}_${today}`;
      const savedUsage = localStorage.getItem(usageKey);
      const usedCount = savedUsage ? parseInt(savedUsage, 10) : 0;

      setUsageStatus({
        usedCount,
        dailyLimit: DAILY_LIMIT,
        remaining: Math.max(DAILY_LIMIT - usedCount, 0),
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
  }, [userId, userRole]);

  // 사용량 증가 (AI 호출 전 실행)
  const incrementUsage = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    // 무제한이면 바로 허용
    if (usageStatus.isUnlimited) return true;

    const today = new Date().toISOString().split('T')[0];
    const usageKey = `ai_usage_${userId}_${today}`;
    const savedUsage = localStorage.getItem(usageKey);
    const currentCount = savedUsage ? parseInt(savedUsage, 10) : 0;
    const newCount = currentCount + 1;

    const canUse = newCount <= DAILY_LIMIT;

    if (canUse) {
      localStorage.setItem(usageKey, newCount.toString());
      setUsageStatus({
        usedCount: newCount,
        dailyLimit: DAILY_LIMIT,
        remaining: Math.max(DAILY_LIMIT - newCount, 0),
        isUnlimited: false
      });
    }

    return canUse;
  }, [userId, usageStatus.isUnlimited]);

  // 사용 가능 여부
  const canUseAI = usageStatus.isUnlimited || usageStatus.remaining > 0;

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
    incrementUsage
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
