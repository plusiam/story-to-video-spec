import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorks } from '@/hooks/useWorks';
import { ArrowLeft, Save, Trash2, Wand2 } from 'lucide-react';
import type { Work } from '@/types';
import { CONFIG } from '@/lib/config';

/**
 * 작품 편집 페이지
 */
export default function WorkEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getWork, updateWork, deleteWork } = useWorks(user?.id);

  const [work, setWork] = useState<Work | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 작품 로드
  useEffect(() => {
    if (id) {
      getWork(id).then((data) => {
        if (data) {
          setWork(data);
          setTitle(data.title);
        } else {
          navigate('/dashboard');
        }
      });
    }
  }, [id, getWork, navigate]);

  // 저장
  const handleSave = async () => {
    if (!work || !id) return;

    setIsSaving(true);
    const updated = await updateWork(id, { title });
    if (updated) {
      setWork(updated);
      setLastSaved(new Date());
    }
    setIsSaving(false);
  };

  // 삭제
  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('정말 이 작품을 삭제하시겠습니까?\n삭제된 작품은 복구할 수 없습니다.')) return;

    const success = await deleteWork(id);
    if (success) {
      navigate('/dashboard');
    }
  };

  if (!work) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="hidden sm:inline">내 작품</span>
          </Link>

          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-gray-400 hidden sm:inline">
                {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn btn-primary flex items-center gap-1 text-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={handleDelete}
              className="btn btn-ghost text-red-500 hover:bg-red-50"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 제목 입력 */}
        <div className="card mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            스토리 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input text-xl font-medium"
            placeholder="제목을 입력하세요"
          />
        </div>

        {/* 스토리 단계 */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">스토리 구성</h2>
            <span className="text-sm text-gray-500">Step {work.step}/3</span>
          </div>

          {/* 진행률 바 */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{ width: `${(work.step / 3) * 100}%` }}
            />
          </div>

          {/* 4컷 패널 (Placeholder) */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((num) => (
              <div
                key={num}
                className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-primary-300 hover:bg-primary-50 transition-colors cursor-pointer"
              >
                <span className="text-2xl mb-2">{num}</span>
                <span className="text-sm">
                  {num === 1 && '기(시작)'}
                  {num === 2 && '승(전개)'}
                  {num === 3 && '전(위기)'}
                  {num === 4 && '결(결말)'}
                </span>
              </div>
            ))}
          </div>

          {/* AI 도우미 버튼 */}
          {CONFIG.ENABLE_AI_FEATURES && (
            <button className="w-full mt-6 btn btn-outline flex items-center justify-center gap-2 py-3">
              <Wand2 className="w-5 h-5" />
              AI 도우미로 스토리 아이디어 얻기
            </button>
          )}
        </div>

        {/* 안내 */}
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">💡 스토리 구성 TIP</p>
          <p>기승전결의 4컷 구조로 이야기를 완성해보세요. 각 칸에는 장면 설명과 대사를 적을 수 있어요.</p>
        </div>
      </main>
    </div>
  );
}
