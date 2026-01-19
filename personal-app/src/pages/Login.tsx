import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, ArrowLeft, CheckCircle, Sparkles, BookOpen, Wand2 } from 'lucide-react';

/**
 * 로그인 페이지 - 초등학생 친화적 UI
 */
export default function LoginPage() {
  const { isAuthenticated, isApproved, signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인된 경우
  if (isAuthenticated) {
    if (isApproved) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/pending" replace />;
  }

  // Google 로그인
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('Google 로그인에 실패했어요. 다시 한번 눌러주세요!');
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 로그인 (Magic Link)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('이메일 주소를 입력해주세요!');
      return;
    }

    // 간단한 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 주소를 입력해주세요!');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await signInWithEmail(email);
      setIsEmailSent(true);
    } catch {
      setError('이메일 전송에 실패했어요. 이메일 주소를 확인해주세요!');
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 전송 완료 화면
  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 px-4">
        <div className="card max-w-md w-full text-center fade-in">
          {/* 성공 아이콘 */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center w-full h-full">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            마법 링크를 보냈어요! ✨
          </h2>

          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-gray-700">
              <span className="font-bold text-primary-600">{email}</span>
              <br />
              메일함을 확인해주세요!
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 mb-6 text-left">
            <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              이렇게 하세요!
            </h3>
            <ol className="text-sm text-yellow-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="bg-yellow-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                이메일 앱(Gmail, 네이버 등)을 열어요
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-yellow-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                "스토리 구성 웹학습지" 메일을 찾아요
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-yellow-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                메일 안의 <strong>"로그인하기"</strong> 버튼을 클릭해요
              </li>
            </ol>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            💡 메일이 안 보이면 <strong>스팸함</strong>도 확인해보세요!
          </p>

          <button
            onClick={() => {
              setIsEmailSent(false);
              setEmail('');
            }}
            className="text-primary-500 hover:underline font-medium"
          >
            ← 다른 이메일로 다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4 py-8">
      <div className="card max-w-md w-full fade-in">
        {/* 뒤로가기 */}
        <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          홈으로
        </Link>

        {/* 헤더 - 더 친근하게 */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="text-6xl mb-2">📚</div>
            <div className="absolute -top-1 -right-1 text-2xl animate-bounce">✨</div>
          </div>
          <h1 className="title-handwriting text-2xl text-primary-600 mb-2">
            스토리 구성 웹학습지
          </h1>
          <p className="text-gray-600">
            나만의 멋진 스토리를 만들어볼까요?
          </p>
        </div>

        {/* 특징 하이라이트 */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <BookOpen className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-blue-700 font-medium">스토리 만들기</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <Wand2 className="w-6 h-6 text-purple-500 mx-auto mb-1" />
            <p className="text-xs text-purple-700 font-medium">AI 도움받기</p>
          </div>
          <div className="bg-pink-50 rounded-xl p-3 text-center">
            <Sparkles className="w-6 h-6 text-pink-500 mx-auto mb-1" />
            <p className="text-xs text-pink-700 font-medium">그림책 완성</p>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <span className="text-lg">😅</span>
            <span>{error}</span>
          </div>
        )}

        {/* Google 로그인 - 추천 */}
        <div className="relative mb-4">
          <div className="absolute -top-2 left-4 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            추천!
          </div>
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 shadow-sm"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-bold text-gray-700">Google로 시작하기</span>
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* 이메일 로그인 */}
        <form onSubmit={handleEmailLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
              이메일 주소 📧
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-1">
              이메일로 마법 링크를 보내드려요! ✨
            </p>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary py-3.5 rounded-xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                보내는 중...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                이메일로 시작하기
              </>
            )}
          </button>
        </form>

        {/* 안내 - 자동 가입 강조 */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            회원가입 없이 바로 시작해요!
          </div>
        </div>

        {/* 약관 */}
        <p className="text-center text-xs text-gray-400 mt-4">
          시작하면{' '}
          <a href="#" className="text-primary-500 hover:underline">이용약관</a> 및{' '}
          <a href="#" className="text-primary-500 hover:underline">개인정보처리방침</a>에
          동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
