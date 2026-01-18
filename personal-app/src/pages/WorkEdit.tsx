import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorks } from '@/hooks/useWorks';
import { ArrowLeft, Save, Trash2, Wand2, Download, FileText, FileJson } from 'lucide-react';
import type { Work } from '@/types';
import { CONFIG } from '@/lib/config';
import {
  FourPanelStory,
  EMPTY_PANELS,
  type PanelContent,
  Step2SceneExpansion,
  EMPTY_PANEL_SCENES,
  type PanelScenes,
  createEmptyScene
} from '@/components/story';

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
  const [scenes, setScenes] = useState<PanelScenes>(EMPTY_PANEL_SCENES);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
            const savedData = data.panels as unknown as { panels?: PanelContent; scenes?: PanelScenes };
            // 새로운 형식 (panels와 scenes가 분리된 경우)
            if (savedData.panels) {
              setPanels({
                ki: savedData.panels.ki || '',
                seung: savedData.panels.seung || '',
                jeon: savedData.panels.jeon || '',
                gyeol: savedData.panels.gyeol || ''
              });
              if (savedData.scenes) {
                setScenes(savedData.scenes);
              }
            } else {
              // 이전 형식 (panels만 있는 경우)
              const savedPanels = data.panels as unknown as PanelContent;
              setPanels({
                ki: savedPanels.ki || '',
                seung: savedPanels.seung || '',
                jeon: savedPanels.jeon || '',
                gyeol: savedPanels.gyeol || ''
              });
            }
          }
          // 저장된 단계 복원
          if (data.step && data.step >= 1 && data.step <= 3) {
            setCurrentStep(data.step as 1 | 2 | 3);
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

  // 장면 변경 핸들러
  const handleScenesChange = useCallback((newScenes: PanelScenes) => {
    setScenes(newScenes);
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
    const updated = await updateWork(id, {
      title,
      panels: { panels, scenes } as unknown as import('@/types').Json,
      step: currentStep
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

        {/* 단계 표시 */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">진행 단계</h3>
            <span className="text-sm text-gray-500">
              {currentStep}/3 단계
            </span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                onClick={() => setCurrentStep(step as 1 | 2 | 3)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  currentStep === step
                    ? 'bg-indigo-500 text-white'
                    : currentStep > step
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {step === 1 && '1. 4컷 스토리'}
                {step === 2 && '2. 장면 확장'}
                {step === 3 && '3. 완성'}
              </button>
            ))}
          </div>
        </div>

        {/* Step 1: 4컷 스토리 패널 */}
        {currentStep === 1 && (
          <>
            <div className="card mb-6">
              <FourPanelStory
                panels={panels}
                onChange={handlePanelsChange}
                onAutoSave={handleAutoSave}
              />
            </div>

            {/* 4컷 완성 시 다음 단계 버튼 */}
            {getCompletedStep() >= 2 && (
              <div className="card mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-indigo-700">🎉 4컷 스토리 작성 완료!</p>
                    <p className="text-sm text-indigo-600 mt-1">
                      이제 각 장면을 더 상세하게 확장해보세요.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      // 장면이 비어있으면 초기화
                      const newScenes = { ...scenes };
                      (['ki', 'seung', 'jeon', 'gyeol'] as const).forEach(key => {
                        if (newScenes[key].length === 0) {
                          newScenes[key] = [createEmptyScene(key, 1)];
                        }
                      });
                      setScenes(newScenes);
                      setCurrentStep(2);
                    }}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    장면 확장하기 →
                  </button>
                </div>
              </div>
            )}

            {/* AI 도우미 버튼 */}
            {CONFIG.ENABLE_AI_FEATURES && (
              <div className="card mb-6">
                <button className="w-full btn btn-outline flex items-center justify-center gap-2 py-3">
                  <Wand2 className="w-5 h-5" />
                  AI 도우미로 스토리 아이디어 얻기
                </button>
              </div>
            )}
          </>
        )}

        {/* Step 2: 장면 확장 */}
        {currentStep === 2 && (
          <div className="card mb-6">
            <Step2SceneExpansion
              panels={panels}
              scenes={scenes}
              onScenesChange={handleScenesChange}
              onBack={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
            />
          </div>
        )}

        {/* Step 3: 완성 (추후 구현) */}
        {currentStep === 3 && (
          <div className="card mb-6">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                스토리 완성 단계
              </h3>
              <p className="text-gray-500 mb-6">
                AI 이미지 생성 및 최종 내보내기 기능이 곧 추가됩니다!
              </p>
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                ← 장면 확장으로 돌아가기
              </button>
            </div>
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
