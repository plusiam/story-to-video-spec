import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorks } from '@/hooks/useWorks';
import { useAIUsage, useVisualDNA } from '@/hooks/useAIUsage';
import { ArrowLeft, Save, Trash2, Wand2, Download, FileText, FileJson } from 'lucide-react';
import type { Work, VisualDNA } from '@/types';
import { createEmptyVisualDNA } from '@/types';
import { CONFIG } from '@/lib/config';
import {
  FourPanelStory,
  EMPTY_PANELS,
  type PanelContent,
  Step2SceneExpansion,
  EMPTY_PANEL_SCENES,
  type PanelScenes,
  type Scene,
  createEmptyScene,
  Step3AICompletion,
  PANEL_LABELS
} from '@/components/story';

/**
 * 작품 편집 페이지
 */
export default function WorkEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getWork, updateWork, deleteWork } = useWorks(user?.id);

  // AI 사용량 및 비주얼 DNA 훅
  const {
    usageStatus,
    hasApiKey,
    saveApiKey,
    removeApiKey
  } = useAIUsage(user?.id);

  const {
    visualDNA,
    saveVisualDNA,
    isLoading: isVisualDNALoading
  } = useVisualDNA(id);

  const [work, setWork] = useState<Work | null>(null);
  const [title, setTitle] = useState('');
  const [panels, setPanels] = useState<PanelContent>(EMPTY_PANELS);
  const [scenes, setScenes] = useState<PanelScenes>(EMPTY_PANEL_SCENES);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [localVisualDNA, setLocalVisualDNA] = useState<VisualDNA | null>(null);

  // 비주얼 DNA 동기화
  useEffect(() => {
    if (visualDNA) {
      setLocalVisualDNA(visualDNA);
    } else if (id && !isVisualDNALoading) {
      setLocalVisualDNA(createEmptyVisualDNA(id));
    }
  }, [visualDNA, id, isVisualDNALoading]);

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
          // 저장된 단계 복원 (panels JSON 내에서)
          if (data.panels && typeof data.panels === 'object') {
            const savedData = data.panels as unknown as { step?: number };
            if (savedData.step && savedData.step >= 1 && savedData.step <= 3) {
              setCurrentStep(savedData.step as 1 | 2 | 3);
            }
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
      panels: { panels, scenes, step: currentStep } as unknown as import('@/types').Json,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const collectVidsScenes = () => {
    const panelOrder: (keyof PanelScenes)[] = ['ki', 'seung', 'jeon', 'gyeol'];
    const items: { panelKey: keyof PanelScenes; scene: Scene }[] = [];

    panelOrder.forEach((panelKey) => {
      const ordered = [...scenes[panelKey]].sort((a, b) => (a.order || 0) - (b.order || 0));
      ordered.forEach((scene) => {
        const hasContent = [
          scene.setting,
          scene.characters,
          scene.action,
          scene.dialogue,
          scene.mood,
          scene.narration,
          scene.subtitle,
          scene.onScreenText
        ].some((value) => value && value.trim());
        if (hasContent) {
          items.push({ panelKey, scene });
        }
      });
    });

    return items;
  };

  const estimateDurationSec = (scene: Scene) => {
    if (scene.durationSec && Number.isFinite(scene.durationSec)) {
      return scene.durationSec;
    }

    const baseText = (scene.narration || scene.subtitle || scene.dialogue || scene.action || '').trim();
    if (!baseText) {
      return 4;
    }

    const chars = baseText.replace(/\s+/g, '').length;
    const sentenceCount = baseText.split(/[.!?\n]+/).filter(Boolean).length;
    const estimate = Math.ceil(chars / 12) + (sentenceCount * 0.5);
    const rounded = Math.round(estimate * 10) / 10;
    return Math.max(4, rounded);
  };

  const handleDownloadVidsStoryboard = () => {
    const items = collectVidsScenes();
    const scenesData = items.map((item, index) => {
      const narration = (item.scene.narration || item.scene.dialogue || item.scene.action || '').trim();
      const subtitle = (item.scene.subtitle || narration).trim();

      return {
        sceneNumber: index + 1,
        stage: PANEL_LABELS[item.panelKey].label,
        stageName: PANEL_LABELS[item.panelKey].subtitle,
        panelKey: item.panelKey,
        narration,
        subtitle,
        onScreenText: item.scene.onScreenText || '',
        durationSec: estimateDurationSec(item.scene),
        cameraAngle: item.scene.cameraAngle || '',
        shotType: item.scene.shotType || '',
        sfx: item.scene.sfx || '',
        music: item.scene.music || '',
        setting: item.scene.setting || '',
        characters: item.scene.characters || '',
        action: item.scene.action || '',
        mood: item.scene.mood || '',
        imagePrompt: item.scene.imagePrompt || ''
      };
    });

    const data = {
      title,
      exportedAt: new Date().toISOString(),
      format: 'google-vids',
      scenes: scenesData
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '스토리'}-vids-storyboard.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVidsScript = () => {
    const items = collectVidsScenes();
    const lines = items.map((item, index) => {
      const narration = (item.scene.narration || item.scene.dialogue || item.scene.action || '').trim();
      const label = `${index + 1}. [${PANEL_LABELS[item.panelKey].label}]`;
      return `${label}\n${narration || '(나레이션 없음)'}\n`;
    });

    const content = [
      `제목: ${title || '스토리'}`,
      '',
      '---',
      '',
      ...lines
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '스토리'}-vids-script.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSrtTime = (seconds: number) => {
    const totalMs = Math.max(0, Math.round(seconds * 1000));
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600);

    const pad = (value: number, size = 2) => value.toString().padStart(size, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  };

  const handleDownloadVidsCaptions = () => {
    const items = collectVidsScenes();
    let cursor = 0;
    const entries: string[] = [];

    items.forEach((item) => {
      const duration = estimateDurationSec(item.scene);
      const start = cursor;
      const end = cursor + duration;
      cursor = end;

      const text = (item.scene.subtitle || item.scene.narration || item.scene.dialogue || item.scene.action || '').trim();
      if (!text) {
        return;
      }

      entries.push(
        String(entries.length + 1),
        `${formatSrtTime(start)} --> ${formatSrtTime(end)}`,
        text,
        ''
      );
    });

    const content = entries.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '스토리'}-captions.srt`;
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

        {/* Step 3: AI 완성 */}
        {currentStep === 3 && id && (
          <div className="card mb-6">
            <Step3AICompletion
              workId={id}
              scenes={scenes}
              visualDNA={localVisualDNA}
              onVisualDNAChange={(dna) => {
                setLocalVisualDNA(dna);
                setHasChanges(true);
              }}
              onVisualDNASave={async () => {
                if (!localVisualDNA) return false;
                setIsSaving(true);
                const success = await saveVisualDNA(localVisualDNA);
                setIsSaving(false);
                if (success) {
                  setHasChanges(false);
                }
                return success;
              }}
              usageStatus={usageStatus}
              hasApiKey={hasApiKey}
              onSaveApiKey={saveApiKey}
              onRemoveApiKey={removeApiKey}
              onBack={() => setCurrentStep(2)}
              isSaving={isSaving}
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleDownloadText}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileText className="w-5 h-5" />
              텍스트 파일 (.txt)
            </button>
            <button
              onClick={handleDownloadJson}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileJson className="w-5 h-5" />
              JSON 파일 (.json)
            </button>
            <button
              onClick={handleDownloadVidsStoryboard}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileJson className="w-5 h-5" />
              Vids 스토리보드 (.json)
            </button>
            <button
              onClick={handleDownloadVidsScript}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50"
            >
              <FileText className="w-5 h-5" />
              Vids 스크립트 (.txt)
            </button>
            <button
              onClick={handleDownloadVidsCaptions}
              className="btn btn-outline flex items-center justify-center gap-2 py-3 hover:bg-gray-50 sm:col-span-2"
            >
              <FileText className="w-5 h-5" />
              자막 파일 (.srt)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
