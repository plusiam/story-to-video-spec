import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
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

// ─── Supabase REST API를 직접 fetch로 호출 (AbortError 회피) ───
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchProfile(userId: string, accessToken: string): Promise<User | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.pgrst.object+json', // single object
        },
      }
    );
    if (!res.ok) {
      console.error('[Auth] fetchProfile HTTP error:', res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    console.log('[Auth] fetchProfile OK:', data?.email, 'approved=', data?.is_approved, 'role=', data?.role);
    return data as User;
  } catch (err) {
    console.error('[Auth] fetchProfile exception:', err);
    return null;
  }
}

async function insertProfile(userId: string, email: string, role: string, isApproved: boolean, accessToken: string): Promise<User | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.pgrst.object+json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ id: userId, email, role, is_approved: isApproved }),
      }
    );
    if (!res.ok) {
      console.error('[Auth] insertProfile HTTP error:', res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    console.log('[Auth] insertProfile OK:', data?.email, 'role=', data?.role);
    return data as User;
  } catch (err) {
    console.error('[Auth] insertProfile exception:', err);
    return null;
  }
}

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

  // ref로 마운트 상태 추적 (cleanup 후에도 비동기 작업에서 확인 가능)
  const mountedRef = useRef(true);

  // 인증 상태 변경 리스너
  useEffect(() => {
    mountedRef.current = true;
    console.log('[Auth] Effect initialized');

    // 이메일 기반 역할 결정
    const determineRole = (email: string): 'admin' | 'judge' | 'user' => {
      const normalized = email.toLowerCase().trim();
      if (CONFIG.ADMIN_EMAILS.includes(normalized)) return 'admin';
      if (CONFIG.JUDGE_EMAILS.includes(normalized)) return 'judge';
      return 'user';
    };

    // 프로필 조회 + 생성 (독립적 fetch 사용 — Supabase AbortError 완전 회피)
    const loadProfile = async (userId: string, email: string, accessToken: string): Promise<User | null> => {
      console.log('[Auth] loadProfile:', email);

      // 1. 프로필 조회 (최대 3회 재시도)
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!mountedRef.current) return null;

        const profile = await fetchProfile(userId, accessToken);
        if (profile) {
          // 역할 업그레이드 확인
          const expectedRole = determineRole(email);
          const roleOrder: Record<string, number> = { user: 0, judge: 1, admin: 2 };
          if ((roleOrder[expectedRole] || 0) > (roleOrder[profile.role || 'user'] || 0)) {
            console.log(`[Auth] Upgrading role: ${profile.role} → ${expectedRole}`);
            // 역할 업그레이드는 supabase 클라이언트 사용 (비동기이지만 실패해도 OK)
            try {
              const { data } = await supabase
                .from('users')
                .update({ role: expectedRole, is_approved: true })
                .eq('id', userId)
                .select()
                .single();
              if (data) return data as User;
            } catch { /* ignore, use existing profile */ }
          }
          return profile;
        }

        if (attempt < 2) {
          console.log('[Auth] loadProfile retry in', 500 * (attempt + 1), 'ms...');
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        }
      }

      // 2. 프로필 없음 → 생성 시도
      if (!mountedRef.current) return null;
      console.log('[Auth] No profile found, creating...');

      const role = determineRole(email);
      const isPrivileged = role === 'admin' || role === 'judge';
      const shouldAutoApprove = CONFIG.AUTO_APPROVE_USERS || isPrivileged;

      const created = await insertProfile(userId, email, role, shouldAutoApprove, accessToken);
      if (created) return created;

      // 3. 생성 실패 (이미 존재) → 다시 조회
      console.log('[Auth] Insert failed, re-fetching...');
      return await fetchProfile(userId, accessToken);
    };

    // 세션으로부터 인증 상태 설정
    const handleSession = async (userId: string, email: string, accessToken: string, source: string) => {
      console.log(`[Auth] handleSession (${source}): user=${email}`);

      if (!mountedRef.current) return;

      const profile = await loadProfile(userId, email, accessToken);

      if (!mountedRef.current) return;

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
    };

    const setNoSession = () => {
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
    };

    console.log('[Auth] Setting up onAuthStateChange');
    console.log('[Auth] CONFIG:', { ADMIN_EMAILS: CONFIG.ADMIN_EMAILS, AUTO_APPROVE: CONFIG.AUTO_APPROVE_USERS });

    // onAuthStateChange 구독 — 콜백 안에서 Supabase DB 호출하지 않음!
    // 대신 세션 정보를 캡처하고 독립적 fetch로 프로필 조회
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[Auth] onAuthStateChange: event=${event}`, session?.user?.email || 'no-user');

        if (!mountedRef.current) return;

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            // setTimeout(0)으로 분리 — onAuthStateChange 콜백의 abort signal 영향을 완전히 차단
            setTimeout(() => {
              if (!mountedRef.current) return;
              handleSession(
                session.user.id,
                session.user.email || '',
                session.access_token,
                event
              );
            }, 0);
          } else {
            setNoSession();
          }
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

    // fallback: 3초 후에도 isLoading이면 직접 세션 확인
    // supabase.auth.getSession()도 AbortError가 날 수 있으므로 재시도 로직 포함
    const fallbackTimer = setTimeout(async () => {
      if (!mountedRef.current) return;
      console.log('[Auth] Fallback: checking session after 3s');

      for (let attempt = 0; attempt < 3; attempt++) {
        if (!mountedRef.current) return;
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error(`[Auth] Fallback getSession error (attempt ${attempt}):`, error.message);
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
          }
          if (!mountedRef.current) return;
          if (session?.user) {
            await handleSession(session.user.id, session.user.email || '', session.access_token, 'fallback');
          } else {
            setNoSession();
          }
          return; // 성공하면 종료
        } catch (err) {
          console.error(`[Auth] Fallback exception (attempt ${attempt}):`, err);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
        }
      }

      // 모든 시도 실패 → 로딩 해제
      console.error('[Auth] Fallback: all attempts failed, clearing loading state');
      if (mountedRef.current) {
        setState(prev => prev.isLoading ? { ...prev, isLoading: false } : prev);
      }
    }, 3000);

    return () => {
      console.log('[Auth] Cleanup');
      mountedRef.current = false;
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
