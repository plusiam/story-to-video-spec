import { useState, useCallback, useEffect } from 'react';

const ONBOARDING_STORAGE_KEY = 'story-creator-onboarding-completed';

/**
 * 온보딩 상태 관리 훅
 */
export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 초기 상태 로드
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    setHasCompletedOnboarding(completed === 'true');

    // 완료하지 않았으면 온보딩 표시
    if (completed !== 'true') {
      setShowOnboarding(true);
    }
  }, []);

  // 온보딩 완료 처리
  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  }, []);

  // 온보딩 건너뛰기
  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  }, []);

  // 온보딩 다시 보기
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasCompletedOnboarding(false);
    setShowOnboarding(true);
  }, []);

  // 온보딩 수동 트리거
  const triggerOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  return {
    hasCompletedOnboarding,
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    triggerOnboarding,
  };
}
