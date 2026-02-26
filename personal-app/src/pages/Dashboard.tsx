import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorksManager } from '@/hooks/useWorksManager';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingTutorial } from '@/components/onboarding';
import { Plus, BookOpen, LogOut, Sparkles, HelpCircle, Rocket, Gamepad2, Trash2 } from 'lucide-react';

/**
 * 대시보드 (내 작품 목록)
 */
export default function DashboardPage() {
  const { user, isAdmin, isGuest, signOut } = useAuth();
  const { works, isLoading, fetchWorks, deleteWork } = useWorksManager();
  const { showOnboarding, completeOnboarding, skipOnboarding, triggerOnboarding } = useOnboarding();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">📚</span>
            <span className="title-handwriting text-xl text-primary-500 hidden sm:inline">스토리 웹학습지</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 게스트 모드 배지 */}
            {isGuest && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                <Gamepad2 className="w-3 h-3" />
                <span className="hidden sm:inline">체험 모드</span>
              </span>
            )}
            {/* 도움말 버튼 */}
            <button
              onClick={triggerOnboarding}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title="사용법 보기"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            {/* AI 도우미 (Gemini Gem) */}
            <a
              href="https://gemini.google.com/gem/1XQjHdIgC33hBM5BqVFbBbxE0PeqbHYGB?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title="AI 도우미"
            >
              <Sparkles className="w-5 h-5" />
            </a>
            {isAdmin && (
              <Link to="/admin" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 text-sm hidden sm:block">
                관리자
              </Link>
            )}
            {isGuest ? (
              <Link
                to="/login"
                className="btn btn-primary text-sm py-1.5 px-3"
              >
                회원가입
              </Link>
            ) : (
              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
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
        <div className="card mb-8 bg-gradient-to-r from-primary-500 to-primary-700 text-white">
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
              {works.map((work) => {
                // 패널 진행률 계산
                const panels = work.panels as Record<string, string> | null;
                const panelKeys = ['ki', 'seung', 'jeon', 'gyeol'];
                const filledCount = panels
                  ? panelKeys.filter(k => panels[k] && String(panels[k]).trim().length > 0).length
                  : 0;
                const firstPanel = panels?.ki ? String(panels.ki).trim() : '';
                const preview = firstPanel.length > 60 ? firstPanel.slice(0, 60) + '...' : firstPanel;

                return (
                  <div
                    key={work.id}
                    className="card hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <Link to={`/work/${work.id}`} className="block">
                      <h3 className="font-medium text-gray-800 group-hover:text-primary-500 transition-colors pr-8 mb-2">
                        {work.title || '제목 없음'}
                      </h3>
                      {/* 미리보기 텍스트 */}
                      {preview ? (
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2 leading-relaxed">{preview}</p>
                      ) : (
                        <p className="text-sm text-gray-300 mb-3 italic">아직 작성 전이에요</p>
                      )}
                      {/* 진행률 + 날짜 */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {panelKeys.map((k, i) => (
                            <div
                              key={k}
                              className={`w-2 h-2 rounded-full ${
                                panels && panels[k] && String(panels[k]).trim()
                                  ? ['bg-blue-400', 'bg-green-400', 'bg-orange-400', 'bg-purple-400'][i]
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                          <span className="text-xs text-gray-400 ml-1">{filledCount}/4</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {work.updated_at ? new Date(work.updated_at).toLocaleDateString('ko-KR') : '-'}
                        </span>
                      </div>
                    </Link>
                    {/* 삭제 버튼 */}
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (deletingId) return;
                        const confirmed = window.confirm(`"${work.title || '제목 없음'}" 작품을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.`);
                        if (!confirmed) return;
                        setDeletingId(work.id);
                        await deleteWork(work.id);
                        setDeletingId(null);
                      }}
                      disabled={deletingId === work.id}
                      className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                      title="작품 삭제"
                    >
                      {deletingId === work.id ? (
                        <span className="animate-spin text-sm">⏳</span>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}

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
