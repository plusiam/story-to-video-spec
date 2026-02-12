import { useState, useCallback } from 'react';
import { ArrowLeft, Sparkles, Copy, Check } from 'lucide-react';
import type { VisualDNA, AIUsageStatus } from '@/types';
import { createEmptyVisualDNA, generateFullPrompt } from '@/types';
import type { Scene, PanelScenes } from './sceneConfig';
import { PANEL_COLORS, PANEL_LABELS } from './sceneConfig';
import VisualDNASetup from './VisualDNASetup';
import AIUsageBanner from './AIUsageBanner';

interface Step3AICompletionProps {
  workId: string;
  scenes: PanelScenes;
  visualDNA: VisualDNA | null;
  onVisualDNAChange: (dna: VisualDNA) => void;
  onVisualDNASave: () => Promise<boolean>;
  usageStatus: AIUsageStatus;
  onBack: () => void;
  isSaving: boolean;
}

type Step3SubStep = 'visual-dna' | 'scene-prompts';

/**
 * Step 3: AI 완성 단계
 * 3-A: 비주얼 DNA 설정
 * 3-B: 장면별 AI 프롬프트 생성
 */
export default function Step3AICompletion({
  workId,
  scenes,
  visualDNA,
  onVisualDNAChange,
  onVisualDNASave,
  usageStatus,
  onBack,
  isSaving
}: Step3AICompletionProps) {
  const [subStep, setSubStep] = useState<Step3SubStep>('visual-dna');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // 비주얼 DNA 초기화
  const currentDNA = visualDNA || createEmptyVisualDNA(workId);

  // 비주얼 DNA 저장 후 다음 단계로
  const handleSaveAndNext = async (): Promise<boolean> => {
    const success = await onVisualDNASave();
    if (success) {
      setSubStep('scene-prompts');
    }
    return success;
  };

  // 프롬프트 복사
  const handleCopyPrompt = useCallback(async (prompt: string, id: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  }, []);

  // 모든 장면 가져오기
  type PanelKey = 'ki' | 'seung' | 'jeon' | 'gyeol';
  const allScenes: { panelKey: PanelKey; scene: Scene; index: number }[] = [];
  (['ki', 'seung', 'jeon', 'gyeol'] as const).forEach((panelKey: PanelKey) => {
    scenes[panelKey].forEach((scene: Scene, index: number) => {
      if (scene.setting && scene.characters && scene.action) {
        allScenes.push({ panelKey, scene, index });
      }
    });
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* AI 사용량 배너 */}
      <AIUsageBanner usageStatus={usageStatus} />

      {/* 서브 스텝 탭 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setSubStep('visual-dna')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            subStep === 'visual-dna'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          3-A. 비주얼 DNA 설정
        </button>
        <button
          onClick={() => setSubStep('scene-prompts')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            subStep === 'scene-prompts'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          3-B. 프롬프트 생성
        </button>
      </div>

      {/* 3-A: 비주얼 DNA 설정 */}
      {subStep === 'visual-dna' && (
        <>
          <VisualDNASetup
            visualDNA={currentDNA}
            onChange={onVisualDNAChange}
            onSave={handleSaveAndNext}
            isSaving={isSaving}
          />

          {/* 네비게이션 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">장면 확장으로</span>
              <span className="sm:hidden">이전</span>
            </button>

            <button
              onClick={handleSaveAndNext}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
            >
              <span>프롬프트 생성으로</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* 3-B: 프롬프트 생성 */}
      {subStep === 'scene-prompts' && (
        <>
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
              AI 이미지 프롬프트
            </h2>
            <span className="text-sm text-gray-500">
              {allScenes.length}개 장면
            </span>
          </div>

          {/* 비주얼 DNA 요약 */}
          {currentDNA.characters.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-3 sm:p-4">
              <p className="text-xs text-purple-600 mb-1">적용된 비주얼 DNA:</p>
              <p className="text-sm text-purple-800">
                캐릭터: {currentDNA.characters.map(c => c.name).filter(Boolean).join(', ') || '미설정'} |
                스타일: {currentDNA.artStyle} |
                색감: {currentDNA.colorTone}
              </p>
            </div>
          )}

          {/* 장면별 프롬프트 */}
          {allScenes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>완성된 장면이 없습니다.</p>
              <p className="text-sm mt-1">Step 2에서 장면을 먼저 작성해주세요.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allScenes.map(({ panelKey, scene, index }) => {
                const colors = PANEL_COLORS[panelKey];
                const labels = PANEL_LABELS[panelKey];
                const promptId = `${panelKey}-${index}`;
                const prompt = generateFullPrompt(
                  scene,
                  currentDNA,
                  panelKey,
                  index + 1
                );

                return (
                  <div
                    key={promptId}
                    className={`border-2 ${colors.border} rounded-xl overflow-hidden`}
                  >
                    {/* 헤더 */}
                    <div className={`${colors.bg} px-4 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 ${colors.accent} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                          {labels.number}
                        </span>
                        <div>
                          <h3 className={`font-bold ${colors.text} text-sm sm:text-base`}>
                            {labels.label} - 장면 {index + 1}
                          </h3>
                          <p className="text-xs text-gray-500 truncate max-w-[200px] sm:max-w-none">
                            {scene.action}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyPrompt(prompt, promptId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          copiedPromptId === promptId
                            ? 'bg-green-500 text-white'
                            : `${colors.accent} text-white hover:opacity-90`
                        }`}
                      >
                        {copiedPromptId === promptId ? (
                          <>
                            <Check className="w-4 h-4" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            복사
                          </>
                        )}
                      </button>
                    </div>

                    {/* 프롬프트 내용 */}
                    <div className="p-4 bg-gray-50">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <pre className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {prompt}
                        </pre>
                      </div>

                      {/* 원본 장면 데이터 */}
                      <details className="mt-3">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          원본 장면 데이터 보기
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                          <p><strong>배경:</strong> {scene.setting}</p>
                          <p><strong>인물:</strong> {scene.characters}</p>
                          <p><strong>행동:</strong> {scene.action}</p>
                          {scene.dialogue && <p><strong>대사:</strong> {scene.dialogue}</p>}
                          {scene.mood && <p><strong>분위기:</strong> {scene.mood}</p>}
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 사용 가이드 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-800 mb-2">프롬프트 사용 방법</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. 원하는 장면의 "복사" 버튼 클릭</li>
              <li>2. Google AI Studio 또는 Gemini 앱 열기</li>
              <li>3. 프롬프트 붙여넣기 후 이미지 생성</li>
              <li>4. 생성된 이미지 다운로드</li>
            </ol>
          </div>

          {/* 네비게이션 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setSubStep('visual-dna')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">비주얼 DNA 수정</span>
              <span className="sm:hidden">이전</span>
            </button>

            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              장면 확장으로 돌아가기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
