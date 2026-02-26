import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CONFIG } from '@/lib/config';
import { ArrowLeft, CheckCircle, Lock, Eye, EyeOff, Gamepad2, Mail } from 'lucide-react';

type LoginMode = 'select' | 'password' | 'signup';

/**
 * 로그인 페이지 - 초등학생 친화적 UI
 */
export default function LoginPage() {
  const { isAuthenticated, isApproved, isGuest, signInWithPassword, signUp, signInAsGuest, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // 게스트 모드에서 오면 바로 회원가입 모드로 시작
  const [mode, setMode] = useState<LoginMode>(isGuest ? 'signup' : 'select');
  const [isSignUpComplete, setIsSignUpComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 이미 로그인된 경우 (게스트는 회원가입을 위해 로그인 페이지 접근 허용)
  if (isAuthenticated && !isGuest) {
    if (isApproved) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/pending" replace />;
  }

  // 비밀번호 로그인
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('이메일 주소를 입력해주세요!');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해주세요!');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      // 게스트 세션이면 먼저 로그아웃
      if (isGuest) await signOut();
      await signInWithPassword(email, password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 맞지 않아요. 다시 확인해주세요!');
      } else {
        setError('로그인에 실패했어요. 다시 시도해주세요!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('이메일 주소를 입력해주세요!');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 주소를 입력해주세요!');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해주세요!');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요!');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않아요!');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      // 게스트 세션이면 먼저 로그아웃
      if (isGuest) await signOut();
      await signUp(email, password);
      setIsSignUpComplete(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('already registered')) {
        setError('이미 가입된 이메일이에요. 로그인을 시도해주세요!');
      } else {
        setError('회원가입에 실패했어요. 다시 시도해주세요!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 모드 초기화
  const resetToSelect = () => {
    setMode('select');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsSignUpComplete(false);
  };

  // 회원가입 완료 화면
  if (isSignUpComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 px-4">
        <div className="card max-w-md w-full text-center fade-in">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse" />
            <div className="relative flex items-center justify-center w-full h-full">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            회원가입 완료! 🎉
          </h2>

          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-gray-700">
              <span className="font-bold text-primary-600">{email}</span>
              <br />
              으로 가입이 완료되었어요!
            </p>
          </div>

          <button
            onClick={resetToSelect}
            className="btn btn-primary w-full py-3"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-4 py-8">
      <div className="card max-w-md w-full fade-in">
        {/* 뒤로가기 */}
        {mode === 'select' ? (
          <Link to="/" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            홈으로
          </Link>
        ) : (
          <button onClick={resetToSelect} className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-4 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            뒤로가기
          </button>
        )}

        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="text-6xl mb-2">📚</div>
            <div className="absolute -top-1 -right-1 text-2xl animate-bounce">✨</div>
          </div>
          <h1 className="title-handwriting text-2xl text-primary-600 mb-2">
            스토리 구성 웹학습지
          </h1>
          <p className="text-gray-600">
            {mode === 'select' && '나만의 멋진 스토리를 만들어볼까요?'}
            {mode === 'password' && '이메일과 비밀번호로 로그인해요'}
            {mode === 'signup' && '새로운 계정을 만들어요'}
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <span className="text-lg">😅</span>
            <span>{error}</span>
          </div>
        )}

        {/* 선택 모드 */}
        {mode === 'select' && (
          <>
            {/* 이메일 + 비밀번호 로그인 - 추천 */}
            <div className="relative mb-4">
              <div className="absolute -top-2 left-4 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold z-10">
                추천!
              </div>
              <button
                onClick={() => setMode('password')}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-primary-300 hover:bg-primary-50 transition-all shadow-sm"
              >
                <Mail className="w-6 h-6 text-primary-500" />
                <span className="font-bold text-gray-700">이메일로 로그인</span>
              </button>
            </div>

            {/* 회원가입 링크 */}
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-sm">
                아직 계정이 없나요?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-primary-600 font-bold hover:underline"
                >
                  회원가입하기
                </button>
              </p>
            </div>

            {/* 게스트 체험 버튼 */}
            {CONFIG.ENABLE_GUEST_MODE && (
              <>
                <div className="flex items-center gap-4 my-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-gray-400 text-sm">또는</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <button
                  onClick={signInAsGuest}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl hover:border-emerald-400 hover:from-emerald-100 hover:to-teal-100 transition-all"
                >
                  <Gamepad2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">로그인 없이 체험하기</span>
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  회원가입 없이 바로 사용해볼 수 있어요! (데이터는 이 기기에만 저장됩니다)
                </p>
              </>
            )}
          </>
        )}

        {/* 비밀번호 로그인 모드 */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin}>
            <div className="space-y-4">
              <div>
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
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                  비밀번호 🔐
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3.5 rounded-xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  로그인 중...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  로그인하기
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              계정이 없나요?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className="text-primary-600 font-bold hover:underline"
              >
                회원가입하기
              </button>
            </p>
          </form>
        )}

        {/* 회원가입 모드 */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-signup" className="block text-sm font-bold text-gray-700 mb-2">
                  이메일 주소 📧
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email-signup"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password-signup" className="block text-sm font-bold text-gray-700 mb-2">
                  비밀번호 🔐
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password-signup"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6자 이상 입력"
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-1">
                  6자 이상으로 만들어주세요
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-bold text-gray-700 mb-2">
                  비밀번호 확인 🔐
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 다시 입력"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn btn-primary py-3.5 rounded-xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  가입 중...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  회원가입하기
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              이미 계정이 있나요?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('password');
                  setError('');
                }}
                className="text-primary-600 font-bold hover:underline"
              >
                로그인하기
              </button>
            </p>
          </form>
        )}

        {/* 약관 - 선택 모드에서만 */}
        {mode === 'select' && (
          <p className="text-center text-xs text-gray-400 mt-6">
            시작하면{' '}
            <a href="#" className="text-primary-500 hover:underline">이용약관</a> 및{' '}
            <a href="#" className="text-primary-500 hover:underline">개인정보처리방침</a>에
            동의하게 됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
