import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AIUsageStatus, VisualDNA } from '@/types';

/**
 * AI 사용량 관리 훅
 * 참고: DB에 ai_usage 테이블과 관련 함수가 있어야 합니다.
 * 없으면 로컬 스토리지로 대체합니다.
 */
export function useAIUsage(userId: string | undefined) {
  const [usageStatus, setUsageStatus] = useState<AIUsageStatus>({
    usedCount: 0,
    dailyLimit: 5,
    remaining: 5,
    isUnlimited: false
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 키 유무 확인
  const checkApiKey = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.warn('Failed to check user role:', fetchError.message);
        return;
      }

      const isAdmin = data?.role === 'admin';

      // 로컬 스토리지에서 API 키 확인 (개발 환경용)
      const savedKey = localStorage.getItem(`gemini_key_${userId}`);
      const hasKey = !!savedKey;

      setHasApiKey(isAdmin || hasKey);

      if (isAdmin || hasKey) {
        setUsageStatus(prev => ({ ...prev, isUnlimited: true }));
      }
    } catch (err) {
      console.error('Failed to check API key:', err);
    }
  }, [userId]);

  // 사용량 상태 조회 (로컬 스토리지 기반 - 개발 환경용)
  const fetchUsageStatus = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 로컬 스토리지에서 오늘 사용량 조회
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `ai_usage_${userId}_${today}`;
      const savedUsage = localStorage.getItem(usageKey);
      const usedCount = savedUsage ? parseInt(savedUsage, 10) : 0;

      const dailyLimit = 5;
      const isAdmin = usageStatus.isUnlimited;

      setUsageStatus({
        usedCount,
        dailyLimit,
        remaining: Math.max(dailyLimit - usedCount, 0),
        isUnlimited: isAdmin
      });
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
      setError(err instanceof Error ? err.message : 'AI 사용량 조회 실패');
    } finally {
      setIsLoading(false);
    }
  }, [userId, usageStatus.isUnlimited]);

  // 사용량 증가 (AI 호출 전 실행)
  const incrementUsage = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    // 무제한이면 바로 허용
    if (usageStatus.isUnlimited) return true;

    // 로컬 스토리지 기반 사용량 증가 (개발 환경용)
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `ai_usage_${userId}_${today}`;
    const savedUsage = localStorage.getItem(usageKey);
    const currentCount = savedUsage ? parseInt(savedUsage, 10) : 0;
    const newCount = currentCount + 1;

    const dailyLimit = 5;
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
  }, [userId, usageStatus.isUnlimited]);

  // API 키 저장 (로컬 스토리지 기반 - 개발 환경용)
  const saveApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      // 간단한 유효성 검증 (Gemini API 키 형식)
      if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
        setError('유효하지 않은 API 키 형식입니다.');
        return false;
      }

      // 로컬 스토리지에 저장 (개발 환경용)
      localStorage.setItem(`gemini_key_${userId}`, apiKey);

      setHasApiKey(true);
      setUsageStatus(prev => ({ ...prev, isUnlimited: true }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 키 저장 실패');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // API 키 삭제
  const removeApiKey = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    try {
      localStorage.removeItem(`gemini_key_${userId}`);

      setHasApiKey(false);
      setUsageStatus(prev => ({
        ...prev,
        isUnlimited: false,
        remaining: Math.max(prev.dailyLimit - prev.usedCount, 0)
      }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API 키 삭제 실패');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // 사용 가능 여부
  const canUseAI = usageStatus.isUnlimited || usageStatus.remaining > 0;

  // 초기 로드
  useEffect(() => {
    if (userId) {
      checkApiKey();
    }
  }, [userId, checkApiKey]);

  return {
    usageStatus,
    hasApiKey,
    canUseAI,
    isLoading,
    error,
    fetchUsageStatus,
    incrementUsage,
    saveApiKey,
    removeApiKey
  };
}

/**
 * 비주얼 DNA 관리 훅
 * 로컬 스토리지 기반 (개발 환경용)
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
      // 로컬 스토리지에서 조회
      const saved = localStorage.getItem(`visual_dna_${workId}`);
      if (saved) {
        const dna = JSON.parse(saved) as VisualDNA;
        setVisualDNA(dna);
        return dna;
      }

      return null;
    } catch (err) {
      console.error('Failed to fetch visual DNA:', err);
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
      // 로컬 스토리지에 저장
      localStorage.setItem(`visual_dna_${workId}`, JSON.stringify(dna));
      setVisualDNA(dna);
      return true;
    } catch (err) {
      console.error('Failed to save visual DNA:', err);
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
