import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { logger } from '@/lib/logger';
import { injectSampleDataIfNeeded, resetSampleDataFlag } from '@/lib/sampleData';
import { setAIServiceUser } from '@/lib/aiService';
import type { User, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  updateFullName: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isApproved: false,
    isAdmin: false,
    isJudge: false,
    isGuest: false,
  });

  // 인증 상태 변경 리스너
  useEffect(() => {
    let isMounted = true;
    logger.log('[AuthContext] 🔄 Effect initialized');

    // 사용자 프로필 조회 (내부 함수) - 재시도 포함
    const getProfile = async (userId: string, retryCount = 0): Promise<User | null> => {
      console.log('[Auth] getProfile:', userId, retryCount > 0 ? `retry=${retryCount}` : '');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[Auth] getProfile FAILED:', error.code, error.message, error.details, error.hint);
        // RLS 또는 세션 전파 지연으로 인한 실패 시 재시도
        if (retryCount < 3) {
          console.log('[Auth] getProfile retrying in', 800 * (retryCount + 1), 'ms...');
          await new Promise(resolve => setTimeout(resolve, 800 * (retryCount + 1)));
          return getProfile(userId, retryCount + 1);
        }
        return null;
      }
      console.log('[Auth] getProfile OK:', data?.email, 'approved=', data?.is_approved, 'role=', data?.role);
      return data as User;
    };

    // 관리자 이메일 여부 확인 (내부 함수)
    const isAdminEmail = (email: string): boolean => {
      const normalizedEmail = email.toLowerCase().trim();
      return CONFIG.ADMIN_EMAILS.includes(normalizedEmail);
    };

    // 심사위원 이메일 여부 확인 (내부 함수)
    const isJudgeEmail = (email: string): boolean => {
      const normalizedEmail = email.toLowerCase().trim();
      return CONFIG.JUDGE_EMAILS.includes(normalizedEmail);
    };

    // 이메일 기반 역할 결정 (내부 함수)
    const determineRole = (email: string): 'admin' | 'judge' | 'user' => {
      if (isAdminEmail(email)) return 'admin';
      if (isJudgeEmail(email)) return 'judge';
      return 'user';
    };

    // 사용자 프로필 생성 (내부 함수)
    const createProfile = async (userId: string, email: string) => {
      const role = determineRole(email);
      const isPrivileged = role === 'admin' || role === 'judge';
      const shouldAutoApprove = CONFIG.AUTO_APPROVE_USERS || isPrivileged;

      console.log('[Auth] createProfile:', email, 'role=', role, 'approve=', shouldAutoApprove);

      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          role,
          is_approved: shouldAutoApprove,
        })
        .select()
        .single();

      if (error) {
        console.error('[Auth] createProfile FAILED:', error.code, error.message);
        // 이미 존재하는 사용자인 경우 → 다시 조회 (모든 에러 코드에서 시도)
        console.log('[Auth] createProfile fallback: re-fetching existing profile...');
        const { data: existingProfile, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        if (existingProfile) {
          console.log('[Auth] createProfile fallback OK:', existingProfile.email, 'approved=', existingProfile.is_approved);
          return existingProfile as User;
        }
        console.error('[Auth] createProfile fallback ALSO FAILED:', fetchError?.code, fetchError?.message);
        return null;
      }
      console.log('[Auth] createProfile OK:', data?.email, 'role=', data?.role);
      return data as User;
    };

    // 세션으로부터 인증 상태 설정하는 공통 함수
    const handleSession = async (session: import('@supabase/supabase-js').Session | null, source: string) => {
      console.log(`[Auth] handleSession (${source}):`, session ? `user=${session.user.email}` : 'NO SESSION');

      if (!isMounted) return;

      if (session?.user) {
        let profile = await getProfile(session.user.id);

        if (!isMounted) return;

        if (!profile) {
          console.log('[Auth] No profile, creating...');
          profile = await createProfile(session.user.id, session.user.email || '');
        } else {
          // 기존 사용자의 역할 업그레이드 확인
          const email = session.user.email || '';
          const expectedRole = determineRole(email);
          const roleOrder: Record<string, number> = { user: 0, judge: 1, admin: 2 };
          const currentRoleLevel = roleOrder[profile.role || 'user'] || 0;
          const expectedRoleLevel = roleOrder[expectedRole];

          if (expectedRoleLevel > currentRoleLevel) {
            console.log(`[Auth] Upgrading role: ${profile.role} → ${expectedRole}`);
            const { data: updatedProfile, error: updateError } = await supabase
              .from('users')
              .update({ role: expectedRole, is_approved: true })
              .eq('id', session.user.id)
              .select()
              .single();
            if (!updateError && updatedProfile) {
              profile = updatedProfile as User;
            }
          }
        }

        if (!isMounted) return;

        console.log('[Auth] FINAL STATE:', profile
          ? `${profile.email} approved=${profile.is_approved} role=${profile.role}`
          : 'NULL');

        sessionStorage.removeItem('guest_session');
        setState({
          user: profile,
          isLoading: false,
          isAuthenticated: true,
          isApproved: profile?.is_approved === true,
          isAdmin: profile?.role === 'admin',
          isJudge: profile?.role === 'judge',
          isGuest: false,
        });
      } else {
        // 세션 없음 — 게스트 복원 확인
        const guestSession = sessionStorage.getItem('guest_session');
        if (guestSession === 'true') {
          console.log('[Auth] Restoring guest session');
          setState({
            user: {
              id: CONFIG.GUEST_USER_ID,
              email: CONFIG.GUEST_USER_EMAIL,
              full_name: '체험 사용자',
              avatar_url: null,
              role: 'user',
              is_approved: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            isLoading: false,
            isAuthenticated: true,
            isApproved: true,
            isAdmin: false,
            isJudge: false,
            isGuest: true,
          });
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
            isJudge: false,
            isGuest: false,
          });
        }
      }
    };

    console.log('[Auth] Setting up onAuthStateChange + getSession');
    console.log('[Auth] CONFIG:', { ADMIN_EMAILS: CONFIG.ADMIN_EMAILS, AUTO_APPROVE: CONFIG.AUTO_APPROVE_USERS });

    // 1. 먼저 onAuthStateChange를 구독 (INITIAL_SESSION 포함)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] onAuthStateChange: event=${event}`, session?.user?.email || 'no-user');

        if (!isMounted) return;

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await handleSession(session, event);
        } else if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('guest_session');
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
            isJudge: false,
            isGuest: false,
          });
        }
      }
    );

    // 2. fallback: 5초 후에도 isLoading이면 getSession으로 직접 확인
    const fallbackTimer = setTimeout(async () => {
      if (!isMounted) return;
      // 아직 로딩 중이면 직접 세션 확인
      console.log('[Auth] Fallback: checking session directly after 5s timeout');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleSession(session, 'fallback');
      } catch (err) {
        console.error('[Auth] Fallback getSession failed:', err);
        if (isMounted) {
          setState(prev => prev.isLoading ? {
            ...prev,
            isLoading: false,
          } : prev);
        }
      }
    }, 5000);

    return () => {
      console.log('[Auth] Cleanup');
      isMounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  // AI 서비스에 사용자 정보 동기화
  useEffect(() => {
    if (state.user) {
      const role = state.isGuest ? 'guest' : (state.user.role || 'user');
      setAIServiceUser(state.user.id, role);
    } else {
      setAIServiceUser(undefined, undefined);
    }
  }, [state.user, state.isGuest]);

  // Google 로그인
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.error('Google sign in error:', error);
      throw error;
    }
  }, []);

  // 이메일 로그인 (Magic Link)
  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.error('Email sign in error:', error);
      throw error;
    }
  }, []);

  // 이메일+비밀번호 로그인
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error('Password sign in error:', error);
      throw error;
    }
  }, []);

  // 회원가입 (이메일+비밀번호)
  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      logger.error('Sign up error:', error);
      throw error;
    }
  }, []);

  // 게스트 로그인
  const signInAsGuest = useCallback(() => {
    logger.log('[AuthContext] 🎮 Signing in as guest');
    sessionStorage.setItem('guest_session', 'true');
    injectSampleDataIfNeeded();
    setState({
      user: {
        id: CONFIG.GUEST_USER_ID,
        email: CONFIG.GUEST_USER_EMAIL,
        full_name: '체험 사용자',
        avatar_url: null,
        role: 'user',
        is_approved: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
      isAuthenticated: true,
      isApproved: true,
      isAdmin: false,
      isJudge: false,
      isGuest: true,
    });
  }, []);

  // 로그아웃
  const signOut = useCallback(async () => {
    // 게스트인 경우 세션 스토리지만 정리
    if (state.isGuest) {
      logger.log('[AuthContext] 🎮 Guest sign out');
      sessionStorage.removeItem('guest_session');
      resetSampleDataFlag();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        isApproved: false,
        isAdmin: false,
        isJudge: false,
        isGuest: false,
      });
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out error:', error);
      throw error;
    }
  }, [state.isGuest]);

  // 이름 업데이트
  const updateFullName = useCallback(async (fullName: string) => {
    if (!state.user) return;

    const { error } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', state.user.id);

    if (error) {
      logger.error('Update full_name error:', error);
      throw error;
    }

    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, full_name: fullName } : null,
    }));
  }, [state.user]);

  return (
    <AuthContext.Provider value={{
      ...state,
      signInWithGoogle,
      signInWithEmail,
      signInWithPassword,
      signUp,
      signInAsGuest,
      signOut,
      updateFullName,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
