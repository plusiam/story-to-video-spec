import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { User, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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
  });

  // 인증 상태 변경 리스너
  useEffect(() => {
    let isMounted = true;
    logger.log('[AuthContext] 🔄 Effect initialized');

    // 사용자 프로필 조회 (내부 함수)
    const getProfile = async (userId: string) => {
      logger.log('[AuthContext] 📊 Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('[AuthContext] ❌ Failed to fetch user profile:', error);
        return null;
      }
      logger.log('[AuthContext] ✅ Profile fetched successfully:', data);
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

      logger.log('[AuthContext] 🆕 Creating new profile:', {
        userId,
        email,
        role,
        shouldAutoApprove
      });

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
        logger.error('[AuthContext] ❌ Failed to create user profile:', error);
        return null;
      }
      logger.log('[AuthContext] ✅ Profile created successfully:', data);
      if (role === 'admin') {
        logger.log('[AuthContext] 👑 Admin privileges granted to:', email);
      } else if (role === 'judge') {
        logger.log('[AuthContext] ⚖️ Judge privileges granted to:', email);
      }
      return data as User;
    };

    // 현재 세션 확인
    const initializeAuth = async () => {
      logger.log('[AuthContext] 🚀 Starting auth initialization');

      try {
        logger.log('[AuthContext] 🔍 Getting current session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('[AuthContext] ⚠️ Session error:', sessionError);
        }

        if (!isMounted) {
          logger.log('[AuthContext] ⏹️ Component unmounted, aborting initialization');
          return;
        }

        if (session?.user) {
          logger.log('[AuthContext] 👤 Session found for user:', session.user.email);
          let profile = await getProfile(session.user.id);

          if (!isMounted) {
            logger.log('[AuthContext] ⏹️ Component unmounted after getProfile');
            return;
          }

          // 프로필이 없으면 생성
          if (!profile) {
            logger.log('[AuthContext] 📝 Profile not found, creating new profile');
            profile = await createProfile(
              session.user.id,
              session.user.email || ''
            );
          }

          if (!isMounted) {
            logger.log('[AuthContext] ⏹️ Component unmounted after createProfile');
            return;
          }

          logger.log('[AuthContext] ✅ Setting authenticated state:', {
            profile,
            isApproved: profile?.is_approved === true,
            isAdmin: profile?.role === 'admin',
            isJudge: profile?.role === 'judge'
          });

          setState({
            user: profile,
            isLoading: false,
            isAuthenticated: true,
            isApproved: profile?.is_approved === true,
            isAdmin: profile?.role === 'admin',
            isJudge: profile?.role === 'judge',
          });
        } else {
          logger.log('[AuthContext] 🚫 No session found, setting unauthenticated state');
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
            isJudge: false,
          });
        }
      } catch (error) {
        // AbortError는 무시 (React StrictMode에서 발생)
        if (error instanceof Error && error.name === 'AbortError') {
          logger.log('[AuthContext] 🔄 AbortError detected - silently retrying in 100ms (no state change)');
          // 재시도 - 상태 변경 없이
          if (isMounted) {
            setTimeout(() => initializeAuth(), 100);
          }
          return; // AbortError는 상태 변경하지 않고 종료
        }

        // 실제 오류인 경우에만 상태 초기화
        logger.error('[AuthContext] ❌ Auth initialization error (non-AbortError):', error);
        if (isMounted) {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
            isJudge: false,
          });
        }
      }
    };

    initializeAuth();

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.log('[AuthContext] 🔔 Auth state change event:', event, 'Session:', session?.user?.email || 'none');

        if (!isMounted) {
          logger.log('[AuthContext] ⏹️ Component unmounted, ignoring auth state change');
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          logger.log('[AuthContext] 🔐 SIGNED_IN event - processing...');
          let profile = await getProfile(session.user.id);

          if (!isMounted) {
            logger.log('[AuthContext] ⏹️ Component unmounted after getProfile in SIGNED_IN');
            return;
          }

          if (!profile) {
            logger.log('[AuthContext] 📝 Creating new profile for signed-in user');
            profile = await createProfile(
              session.user.id,
              session.user.email || ''
            );
          } else {
            // 기존 사용자의 역할 업그레이드 확인
            const email = session.user.email || '';
            const expectedRole = determineRole(email);

            // 역할 승격이 필요한 경우 (admin > judge > user 순서)
            const roleOrder: Record<string, number> = { user: 0, judge: 1, admin: 2 };
            const currentRoleLevel = roleOrder[profile.role || 'user'] || 0;
            const expectedRoleLevel = roleOrder[expectedRole];

            if (expectedRoleLevel > currentRoleLevel) {
              logger.log(`[AuthContext] ⬆️ Upgrading user to ${expectedRole}:`, email);
              const { data: updatedProfile, error: updateError } = await supabase
                .from('users')
                .update({
                  role: expectedRole,
                  is_approved: true,
                })
                .eq('id', session.user.id)
                .select()
                .single();

              if (!updateError && updatedProfile) {
                profile = updatedProfile as User;
                logger.log(`[AuthContext] ✅ ${expectedRole} upgrade successful`);
              }
            }
          }

          if (!isMounted) {
            logger.log('[AuthContext] ⏹️ Component unmounted after createProfile in SIGNED_IN');
            return;
          }

          logger.log('[AuthContext] ✅ Setting authenticated state from SIGNED_IN event');
          setState({
            user: profile,
            isLoading: false,
            isAuthenticated: true,
            isApproved: profile?.is_approved === true,
            isAdmin: profile?.role === 'admin',
            isJudge: profile?.role === 'judge',
          });
        } else if (event === 'SIGNED_OUT') {
          logger.log('[AuthContext] 🚪 SIGNED_OUT event - clearing auth state');
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
            isJudge: false,
          });
        } else {
          logger.log('[AuthContext] ℹ️ Other auth event:', event, '- no action taken');
        }
      }
    );

    return () => {
      logger.log('[AuthContext] 🧹 Cleanup: unmounting and unsubscribing');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  // 로그아웃
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out error:', error);
      throw error;
    }
  }, []);

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
