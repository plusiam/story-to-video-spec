import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorks } from '@/hooks/useWorks';
import { Plus, BookOpen, Settings, LogOut, Sparkles } from 'lucide-react';

/**
 * 대시보드 (내 작품 목록)
 */
export default function DashboardPage() {
  const { user, isAdmin, signOut } = useAuth();
  const { works, isLoading, fetchWorks } = useWorks(user?.id);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <span className="title-handwriting text-xl text-primary-500">스토리 웹학습지</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin" className="btn btn-ghost text-sm">
                관리자
              </Link>
            )}
            <button
              onClick={() => signOut()}
              className="btn btn-ghost text-sm flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 환영 메시지 */}
        <div className="card mb-8 bg-gradient-to-r from-primary-500 to-indigo-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold mb-1">
                안녕하세요, {user?.nickname || '작가'}님! 👋
              </h1>
              <p className="text-white/80">
                오늘도 멋진 이야기를 만들어볼까요?
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
              불러오는 중...
            </div>
          ) : works.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                아직 작품이 없어요
              </h3>
              <p className="text-gray-500 mb-6">
                첫 번째 스토리를 만들어볼까요?
              </p>
              <Link to="/create" className="btn btn-primary inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                새 작품 시작하기
              </Link>
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
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      work.status === 'complete'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {work.status === 'complete' ? '완료' : '작성 중'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Step {work.step}/3</span>
                    <span>•</span>
                    <span>
                      {new Date(work.updated_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
