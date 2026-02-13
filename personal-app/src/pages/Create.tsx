import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorksManager } from '@/hooks/useWorksManager';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * 새 작품 만들기 페이지
 */
export default function CreatePage() {
  const navigate = useNavigate();
  const { createWork, isLoading } = useWorksManager();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    console.log('[Create] Submitting work:', title.trim());
    try {
      const work = await createWork(title.trim());
      console.log('[Create] createWork result:', work);
      if (work) {
        navigate(`/work/${work.id}`);
      } else {
        setError('작품 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      console.error('[Create] Unexpected error:', err);
      setError('작품 생성 중 오류가 발생했습니다.');
    }
  };

  // 제목 제안
  const suggestions = [
    '나의 여름 방학 이야기',
    '마법의 숲 모험',
    '우정의 힘',
    '꿈을 향해',
    '작은 영웅의 하루',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <Link to="/dashboard" className="flex items-center text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5 mr-1" />
            뒤로
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="card fade-in">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">✨</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              새 스토리 시작하기
            </h1>
            <p className="text-gray-600">
              어떤 이야기를 만들어볼까요?
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                스토리 제목
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 나의 특별한 하루"
                className="input text-lg"
                maxLength={50}
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1 text-right">
                {title.length}/50
              </p>
            </div>

            {/* 제목 제안 */}
            <div className="mb-8">
              <p className="text-sm text-gray-500 mb-2">💡 이런 제목은 어때요?</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className="px-3 py-1 bg-gray-100 hover:bg-primary-100 hover:text-primary-700 rounded-full text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* 버튼 */}
            <button
              type="submit"
              disabled={isLoading || !title.trim()}
              className="w-full btn btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                '생성 중...'
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  스토리 시작하기
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
