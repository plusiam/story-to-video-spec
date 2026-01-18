import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorks } from '@/hooks/useWorks';
import { ArrowLeft, Save, Trash2, Wand2, Download, FileText, FileJson } from 'lucide-react';
import type { Work } from '@/types';
import { CONFIG } from '@/lib/config';
import { FourPanelStory, EMPTY_PANELS, type PanelContent } from '@/components/story';

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
  const [panels, setPanels] = useState<PanelContent>(EMPTY_PANELS);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 작품 로드
  useEffect(() => {
    if (id) {
      getWork(id).then((data) => {
        if (data) {
          setWork(data);
          setTitle(data.title);
          // panels가 JSON으로 저장되어 있으면 파싱
          if (data.panels && typeof data.panels === 'object') {
            const savedPanels = data.panels as unknown as PanelContent;
            setPanels({
              ki: savedPanels.ki || '',
              seung: savedPanels.seung || '',
              jeon: savedPanels.jeon || '',
              gyeol: savedPanels.gyeol || ''
            });
          }
        } else {
          navigate('/dashboard');
        }
      });
    }
  }, [id, getWork, navigate]);

  // 패널 변경 핸들러
  const handlePanelsChange = useCallback((newPanels: PanelContent) => {
    setPanels(newPanels);
    setHasChanges(true);
  }, []);

  // 완료된 패널 수 계산
  const getCompletedStep = useCallback(() => {
    let step = 0;
    if (panels.ki.trim().length >= 20) step++;
    if (panels.seung.trim().length >= 20) step++;
    if (panels.jeon.trim().length >= 20) step++;
    if (panels.gyeol.trim().length >= 20) step++;
    // 3단계로 매핑 (0-4 → 1-3)
    if (step === 0) return 1;
    if (step <= 2) return 2;
    return 3;
  }, [panels]);

  // 저장
  const handleSave = async () => {
    if (!work || !id) return;

    setIsSaving(true);
    const step = getCompletedStep();
    const updated = await updateWork(id, {
      title,
      panels: panels as unknown as import('@/types').Json,
      step
    });
    if (updated) {
      setWork(updated);
      setLastSaved(new Date());
      setHasChanges(false);
    }
    setIsSaving(false);
  };

  // 자동 저장
  const handleAutoSave = useCallback(() => {
    if (hasChanges && work && id) {
      handleSave();
    }
  }, [hasChanges, work, id]);

  // 삭제
  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('정말 이 작품을 삭제하시겠습니까?\n삭제된 작품은 복구할 수 없습니다.')) return;

    const success = await deleteWork(id);
    if (success) {
      navigate('/dashboard');
    }
  };

  // 텍스트 파일로 다운로드
  const handleDownloadText = () => {
    const content = `제목: ${title}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[기 - 시작]
${panels.ki || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[승 - 전개]
${panels.seung || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[전 - 위기]
${panels.jeon || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[결 - 결말]
${panels.gyeol || '(작성되지 않음)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

작성일: ${new Date().toLocaleDateString('ko-KR')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '스토리'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // JSON 파일로 다운로드
  const handleDownloadJson = () => {
    const data = {
      title,
      panels: {
        ki: { label: '기(시작)', content: panels.ki },
        seung: { label: '승(전개)', content: panels.seung },
        jeon: { label: '전(위기)', content: panels.jeon },
        gyeol: { label: '결(결말)', content: panels.gyeol }
      },
      metadata: {
        createdAt: work?.created_at,
        updatedAt: work?.updated_at,
        exportedAt: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '스토리'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="hidden sm:inline">내 작품</span>
          </Link>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-orange-500 hidden sm:inline">
                저장되지 않은 변경사항
              </span>
            )}
            {lastSaved && !hasChanges && (
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
            onChange={(e) => {
              setTitle(e.target.value);
              setHasChanges(true);
            }}
            className="input text-xl font-medium"
            placeholder="제목을 입력하세요"
          />
        </div>

        {/* 4컷 스토리 패널 */}
        <div className="card mb-6">
          <FourPanelStory
            panels={panels}
            onChange={handlePanelsChange}
            onAutoSave={handleAutoSave}
          />
        </div>

        {/* AI 도우미 버튼 */}
        {CONFIG.ENABLE_AI_FEATURES && (
          <div className="card mb-6">
            <button className="w-full btn btn-outline flex items-center justify-center gap-2 py-3">
              <Wand2 className="w-5 h-5" />
              AI 도우미로 스토리 아이디어 얻기
            </button>
          </div>
        )}

        {/* 다운로드 버튼 */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700 flex items-center gap-2">
              <Download className="w-5 h-5" />
              내보내기
            </h3>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadText}
              className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileText className="w-5 h-5" />
              텍스트 파일 (.txt)
            </button>
            <button
              onClick={handleDownloadJson}
              className="flex-1 btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileJson className="w-5 h-5" />
              JSON 파일 (.json)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
