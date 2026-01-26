import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';

/**
 * 홈페이지 (랜딩)
 */
export default function HomePage() {
  const { isAuthenticated, isApproved, user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 배경 장식 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[10%] text-4xl opacity-10 animate-float">✨</div>
        <div className="absolute top-[20%] right-[15%] text-4xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>📖</div>
        <div className="absolute bottom-[30%] left-[8%] text-4xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>🌟</div>
        <div className="absolute bottom-[15%] right-[10%] text-4xl opacity-10 animate-float" style={{ animationDelay: '3s' }}>✏️</div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-16">
        {/* 히어로 섹션 */}
        <div className="text-center mb-12 fade-in">
          <div className="inline-block mb-6">
            <div className="text-7xl animate-bounce-slow">📚</div>
          </div>
          <h1 className="title-handwriting text-4xl md:text-5xl text-gray-800 mb-4">
            스토리 구성<br />
            <span className="text-primary-500 relative">
              웹학습지
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-primary-100 -z-10 rounded" />
            </span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            상상력을 펼쳐 나만의 4컷 스토리를 만들어보세요!
          </p>

          {/* CTA 버튼 */}
          {isAuthenticated && isApproved ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 btn btn-primary text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              <BookOpen className="w-5 h-5" />
              내 작품 보기
              <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 btn btn-primary text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-5 h-5" />
              시작하기
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>

        {/* 기능 카드 */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="text-4xl mb-4">📝</div>
            <h3 className="font-bold text-lg mb-2">스토리 구성</h3>
            <p className="text-gray-600 text-sm">
              4컷 스토리의 기승전결을<br />쉽게 구성할 수 있어요
            </p>
          </div>
          <div className="card text-center fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-bold text-lg mb-2">AI 도우미</h3>
            <p className="text-gray-600 text-sm">
              AI가 스토리 아이디어와<br />그림을 도와줘요
            </p>
          </div>
          <div className="card text-center fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="text-4xl mb-4">📖</div>
            <h3 className="font-bold text-lg mb-2">그림책 변환</h3>
            <p className="text-gray-600 text-sm">
              완성된 스토리를<br />그림책으로 만들어요
            </p>
          </div>
        </div>

        {/* 로그인 상태 표시 */}
        {isAuthenticated && user && (
          <div className="text-center text-gray-500 text-sm">
            <p>
              {user.full_name || user.email}님으로 로그인됨
              {!isApproved && (
                <span className="ml-2 text-orange-500">(승인 대기 중)</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
