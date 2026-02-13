import { useAuth } from '@/contexts/AuthContext';
import { useWorks } from './useWorks';
import { useGuestWorks } from './useGuestWorks';

/**
 * 통합 작품 관리 훅
 * 게스트 모드일 때는 localStorage, 일반 사용자일 때는 Supabase 사용
 */
export function useWorksManager() {
  const { user, isGuest } = useAuth();
  const supabaseWorks = useWorks(isGuest ? undefined : user?.id);
  const guestWorks = useGuestWorks();

  if (isGuest) {
    return guestWorks;
  }

  return supabaseWorks;
}
