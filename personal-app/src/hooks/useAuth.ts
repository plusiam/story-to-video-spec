import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/lib/config';
import type { User, AuthState } from '@/types';

/**
 * 인증 상태 관리 훅
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isApproved: false,
    isAdmin: false,
  });

  // 사용자 프로필 조회
  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }

    return data as User;
  }, []);

  // 사용자 프로필 생성 (첫 로그인 시)
  const createUserProfile = useCallback(async (
    userId: string,
    email: string,
    provider: string
  ) => {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        provider,
        // MVP: 자동 승인 / 정식: 승인 대기
        status: CONFIG.AUTO_APPROVE_USERS ? 'approved' : 'pending',
        approved_at: CONFIG.AUTO_APPROVE_USERS ? new Date().toISOString() : null,
        role: 'user',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create user profile:', error);
      return null;
    }

    return data as User;
  }, []);

  // 인증 상태 변경 리스너
  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        let profile = await fetchUserProfile(session.user.id);

        // 프로필이 없으면 생성
        if (!profile) {
          profile = await createUserProfile(
            session.user.id,
            session.user.email || '',
            session.user.app_metadata.provider || 'email'
          );
        }

        setState({
          user: profile,
          isLoading: false,
          isAuthenticated: true,
          isApproved: profile?.status === 'approved',
          isAdmin: profile?.role === 'admin',
        });
      } else {
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          isApproved: false,
          isAdmin: false,
        });
      }
    });

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          let profile = await fetchUserProfile(session.user.id);

          if (!profile) {
            profile = await createUserProfile(
              session.user.id,
              session.user.email || '',
              session.user.app_metadata.provider || 'email'
            );
          }

          // 마지막 로그인 시간 업데이트
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', session.user.id);

          setState({
            user: profile,
            isLoading: false,
            isAuthenticated: true,
            isApproved: profile?.status === 'approved',
            isAdmin: profile?.role === 'admin',
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            isApproved: false,
            isAdmin: false,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, createUserProfile]);

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

  return {
    ...state,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    updateNickname,
  };
}
