import { useCallback } from 'react';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import PanelSceneExpander from './PanelSceneExpander';
import EchinGuideCard from './EchinGuideCard';
import {
  type Scene,
  type PanelScenes,
  type PanelContent
} from './sceneConfig';

interface Step2SceneExpansionProps {
  panels: PanelContent;
  scenes: PanelScenes;
  onScenesChange: (scenes: PanelScenes) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Step 2: 장면 확장 페이지
 * 4컷 스토리를 기반으로 각 패널을 상세 장면으로 확장
 */
export default function Step2SceneExpansion({
  panels,
  scenes,
  onScenesChange,
  onBack,
  onNext
}: Step2SceneExpansionProps) {
  // 패널별 장면 변경 핸들러
  const handlePanelScenesChange = useCallback((panelKey: keyof PanelScenes, newScenes: Scene[]) => {
    onScenesChange({
      ...scenes,
      [panelKey]: newScenes
    });
  }, [scenes, onScenesChange]);

  // 전체 장면 수 계산
  const totalScenes = Object.values(scenes).reduce((sum, arr) => sum + arr.length, 0);

  // 완성된 장면 수 계산
  const completedScenes = Object.values(scenes).flat().filter(
    scene => scene.setting && scene.characters && scene.action
  ).length;

  // 진행률
  const progressPercent = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  // 다음 단계로 진행 가능 여부 (최소 1개 완성된 장면)
  const canProceed = completedScenes > 0;

  // 패널 키 배열
  const panelKeys: (keyof PanelScenes)[] = ['ki', 'seung', 'jeon', 'gyeol'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-lg sm:text-xl flex items-center gap-2">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
          장면 확장하기
        </h2>
        <div className="text-xs sm:text-sm text-gray-500">
          {completedScenes}/{totalScenes} 완성
        </div>
      </div>

      {/* 설명 - 모바일에서 간략화 */}
      <div className="bg-primary-50 rounded-xl p-3 sm:p-4">
        <p className="text-primary-700 text-xs sm:text-sm">
          <strong>💡 TIP:</strong>{' '}
          <span className="hidden sm:inline">
            4컷 스토리의 각 부분을 1~3개의 상세한 장면으로 확장해보세요.
            각 장면에는 배경, 등장인물, 행동, 대사, 분위기를 입력할 수 있어요.
            이 정보는 나중에 AI 이미지 생성에 활용됩니다!
          </span>
          <span className="sm:hidden">
            각 부분을 상세 장면으로 확장해보세요!
          </span>
        </p>
      </div>

      {/* 이친 가이드 카드 */}
      <EchinGuideCard step="step2" />

      {/* 진행률 바 */}
      <div className="space-y-1 sm:space-y-2">
        <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-right">
          {Math.round(progressPercent)}% 완성
        </p>
      </div>

      {/* 패널별 장면 확장 */}
      <div className="space-y-3 sm:space-y-4">
        {panelKeys.map((key) => (
          <PanelSceneExpander
            key={key}
            panelKey={key}
            originalContent={panels[key]}
            scenes={scenes[key]}
            onChange={(newScenes) => handlePanelScenesChange(key, newScenes)}
          />
        ))}
      </div>

      {/* 네비게이션 버튼 */}
      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">이전 단계</span>
          <span className="sm:hidden">이전</span>
        </button>

        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 rounded-lg transition-colors text-sm sm:text-base ${
            canProceed
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span className="hidden sm:inline">다음 단계</span>
          <span className="sm:hidden">다음</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {!canProceed && (
        <p className="text-center text-xs sm:text-sm text-orange-500">
          ⚠️ 최소 1개 장면을 완성해야 진행할 수 있습니다.
        </p>
      )}
    </div>
  );
}
