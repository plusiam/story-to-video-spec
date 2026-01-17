import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * OAuth 콜백 처리 페이지
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // URL에서 인증 정보 처리
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // 로그인 성공 - 대시보드로
        navigate('/dashboard', { replace: true });
      } else {
        // 실패 - 로그인으로
        navigate('/login', { replace: true });
      }
    });
  }, [navigate]);

  return <LoadingScreen />;
}
