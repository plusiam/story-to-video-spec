import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import type { User, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isApproved: false,
    isAdmin: false,
  });

  // 인증 상태 변경 리스너
  useEffect(() => {
    let isMounted = true;
    console.log('[AuthContext] 🔄 Effect initialized');

    // 사용자 프로필 조회 (내부 함수)
    const getProfile = async (userId: string) => {
      console.log('[AuthContext] 📊 Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] ❌ Failed to fetch user profile:', error);
        return null;
      }
      console.log('[AuthContext] ✅ Profile fetched successfully:', data);
      return data as User;
    };

    // 사용자 프로필 생성 (내부 함수)
    const createProfile = async (userId: string, email: string, provider: string) => {
      console.log('[AuthContext] 🆕 Creating new profile:', { userId, email, provider });
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          provider,
          status: CONFIG.AUTO_APPROVE_USERS ? 'approved' : 'pending',
          approved_at: CONFIG.AUTO_APPROVE_USERS ? new Date().toISOString() : null,
          role: 'user',
        })
        .select()
        .single();

      if (error) {
        console.error('[AuthContext] ❌ Failed to create user profile:', error);
        return null;
      }
      console.log('[AuthContext] ✅ Profile created successfully:', data);
      return data as User;
    };

    // 현재 세션 확인
    const initializeAuth = async () => {
      console.log('[AuthContext] 🚀 Starting auth initialization');

      try {
        console.log('[AuthContext] 🔍 Getting current session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthContext] ⚠️ Session error:', sessionError);
        }

        if (!isMounted) {
          console.log('[AuthContext] ⏹️ Component unmounted, aborting initialization');
          return;
        }

        if (session?.user) {
          console.log('[AuthContext] 👤 Session found for user:', session.user.email);
          let profile = await getProfile(session.user.id);

          if (!isMounted) {
            console.log('[AuthContext] ⏹️ Component unmounted after getProfile');
            return;
          }

          // 프로필이 없으면 생성
          if (!profile) {
            console.log('[AuthContext] 📝 Profile not found, creating new profile');
            profile = await createProfile(
              session.user.id,
              session.user.email || '',
              session.user.app_metadata.provider || 'email'
            );
          }

          if (!isMounted) {
            console.log('[AuthContext] ⏹️ Component unmounted after createProfile');
            return;
          }

          console.log('[AuthContext] ✅ Setting authenticated state:', {
            profile,
            isApproved: profile?.status === 'approved',
            isAdmin: profile?.role === 'admin'
          });

          setState({
            user: profile,
            isLoading: false,
            isAuthenticated: true,
            isApproved: profile?.status === 'approved',
            isAdmin: profile?.role === 'admin',
          });
        } else {
          console.log('[AuthContext] 🚫 No session found, setting unauthenticated state');
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
          });
        }
      } catch (error) {
        // AbortError는 무시 (React StrictMode에서 발생)
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[AuthContext] 🔄 AbortError detected - silently retrying in 100ms (no state change)');
          // 재시도 - 상태 변경 없이
          if (isMounted) {
            setTimeout(() => initializeAuth(), 100);
          }
          return; // AbortError는 상태 변경하지 않고 종료
        }

        // 실제 오류인 경우에만 상태 초기화
        console.error('[AuthContext] ❌ Auth initialization error (non-AbortError):', error);
        if (isMounted) {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
          });
        }
      }
    };

    initializeAuth();

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] 🔔 Auth state change event:', event, 'Session:', session?.user?.email || 'none');

        if (!isMounted) {
          console.log('[AuthContext] ⏹️ Component unmounted, ignoring auth state change');
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[AuthContext] 🔐 SIGNED_IN event - processing...');
          let profile = await getProfile(session.user.id);

          if (!isMounted) {
            console.log('[AuthContext] ⏹️ Component unmounted after getProfile in SIGNED_IN');
            return;
          }

          if (!profile) {
            console.log('[AuthContext] 📝 Creating new profile for signed-in user');
            profile = await createProfile(
              session.user.id,
              session.user.email || '',
              session.user.app_metadata.provider || 'email'
            );
          }

          if (!isMounted) {
            console.log('[AuthContext] ⏹️ Component unmounted after createProfile in SIGNED_IN');
            return;
          }

          // 마지막 로그인 시간 업데이트
          console.log('[AuthContext] 🕐 Updating last login time');
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', session.user.id);

          console.log('[AuthContext] ✅ Setting authenticated state from SIGNED_IN event');
          setState({
            user: profile,
            isLoading: false,
            isAuthenticated: true,
            isApproved: profile?.status === 'approved',
            isAdmin: profile?.role === 'admin',
          });
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] 🚪 SIGNED_OUT event - clearing auth state');
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
          });
        } else {
          console.log('[AuthContext] ℹ️ Other auth event:', event, '- no action taken');
        }
      }
    );

    return () => {
      console.log('[AuthContext] 🧹 Cleanup: unmounting and unsubscribing');
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
      console.error('Google sign in error:', error);
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
      console.error('Email sign in error:', error);
      throw error;
    }
  }, []);

  // 로그아웃
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  // 닉네임 업데이트
  const updateNickname = useCallback(async (nickname: string) => {
    if (!state.user) return;

    const { error } = await supabase
      .from('users')
      .update({ nickname })
      .eq('id', state.user.id);

    if (error) {
      console.error('Update nickname error:', error);
      throw error;
    }

    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, nickname } : null,
    }));
  }, [state.user]);

  return (
    <AuthContext.Provider value={{
      ...state,
      signInWithGoogle,
      signInWithEmail,
      signOut,
      updateNickname,
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
