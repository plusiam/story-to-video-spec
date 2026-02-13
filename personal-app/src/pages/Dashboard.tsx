import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorksManager } from '@/hooks/useWorksManager';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingTutorial } from '@/components/onboarding';
import { Plus, BookOpen, LogOut, Sparkles, HelpCircle, Rocket, Gamepad2 } from 'lucide-react';

/**
 * 대시보드 (내 작품 목록)
 */
export default function DashboardPage() {
  const { user, isAdmin, isGuest, signOut } = useAuth();
  const { works, isLoading, fetchWorks } = useWorksManager();
  const { showOnboarding, completeOnboarding, skipOnboarding, triggerOnboarding } = useOnboarding();

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 온보딩 튜토리얼 */}
      {showOnboarding && (
        <OnboardingTutorial
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="title-handwriting text-xl text-primary-500">스토리 웹학습지</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* 게스트 모드 배지 */}
            {isGuest && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                체험 모드
              </span>
            )}
            {/* 도움말 버튼 */}
            <button
              onClick={triggerOnboarding}
              className="btn btn-ghost text-sm flex items-center gap-1"
              title="사용법 보기"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">도움말</span>
            </button>
            {/* AI 도우미 (Gemini Gem) */}
            <a
              href="https://gemini.google.com/gem/1XQjHdIgC33hBM5BqVFbBbxE0PeqbHYGB?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost text-sm flex items-center gap-1"
              title="Gemini AI 도우미 열기"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI 도우미</span>
            </a>
            {isAdmin && (
              <Link to="/admin" className="btn btn-ghost text-sm">
                관리자
              </Link>
            )}
            {isGuest ? (
              <Link
                to="/login"
                className="btn btn-ghost text-sm flex items-center gap-1 text-primary-500 font-bold"
              >
                회원가입
              </Link>
            ) : (
              <button
                onClick={() => signOut()}
                className="btn btn-ghost text-sm flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 게스트 안내 배너 */}
        {isGuest && (
          <div className="card mb-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <Gamepad2 className="w-4 h-4" />
                <span>체험 모드로 이용 중이에요. 데이터는 이 기기에만 저장됩니다.</span>
              </div>
              <Link to="/login" className="text-emerald-600 font-bold text-sm hover:underline whitespace-nowrap ml-2">
                회원가입 →
              </Link>
            </div>
          </div>
        )}

        {/* 환영 메시지 */}
        <div className="card mb-8 bg-gradient-to-r from-primary-500 to-indigo-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold mb-1">
                {isGuest ? '환영합니다! 🎮' : `안녕하세요, ${user?.full_name || '작가'}님! 👋`}
              </h1>
              <p className="text-white/80">
                {isGuest ? '자유롭게 스토리를 만들어보세요!' : '오늘도 멋진 이야기를 만들어볼까요?'}
              </p>
            </div>
            <Link
              to="/create"
              className="flex items-center gap-2 bg-white text-primary-500 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              새 작품
            </Link>
          </div>
        </div>

        {/* 작품 목록 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              내 작품
            </h2>
            <span className="text-sm text-gray-500">{works.length}개</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              불러오는 중...
            </div>
          ) : works.length === 0 ? (
            <div className="card text-center py-12 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                첫 스토리를 만들어볼까요?
              </h3>
              <p className="text-gray-600 mb-6">
                나만의 멋진 그림책 스토리가 시작돼요!
              </p>
              <Link to="/create" className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 text-lg">
                <Rocket className="w-5 h-5" />
                새 작품 시작하기
              </Link>

              {/* 첫 사용자를 위한 추가 안내 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={triggerOnboarding}
                  className="text-primary-500 hover:underline flex items-center gap-1 mx-auto text-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                  사용법이 궁금하다면?
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {works.map((work) => (
                <Link
                  key={work.id}
                  to={`/work/${work.id}`}
                  className="card hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-gray-800 group-hover:text-primary-500 transition-colors">
                      {work.title || '제목 없음'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>
                      {work.updated_at ? new Date(work.updated_at).toLocaleDateString('ko-KR') : '-'}
                    </span>
                  </div>
                </Link>
              ))}

              {/* 새 작품 카드 */}
              <Link
                to="/create"
                className="card border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all flex items-center justify-center min-h-[100px] group"
              >
                <div className="text-center">
                  <Plus className="w-8 h-8 text-gray-300 group-hover:text-primary-400 mx-auto mb-2 transition-colors" />
                  <span className="text-gray-400 group-hover:text-primary-500 font-medium transition-colors">
                    새 작품 추가
                  </span>
                </div>
              </Link>
            </div>
          )}
        </section>

        {/* 하단 도움말 */}
        {works.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={triggerOnboarding}
              className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              사용법 다시 보기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
