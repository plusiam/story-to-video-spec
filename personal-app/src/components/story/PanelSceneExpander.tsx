import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import SceneEditor from './SceneEditor';
import {
  type Scene,
  createEmptyScene,
  PANEL_COLORS,
  PANEL_LABELS
} from './sceneConfig';

interface PanelSceneExpanderProps {
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  originalContent: string;
  scenes: Scene[];
  onChange: (scenes: Scene[]) => void;
}

/**
 * 패널별 장면 확장 컴포넌트
 * 원본 4컷 내용을 보여주고, 여러 장면으로 확장할 수 있게 함
 */
export default function PanelSceneExpander({
  panelKey,
  originalContent,
  scenes,
  onChange
}: PanelSceneExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = PANEL_COLORS[panelKey];
  const labels = PANEL_LABELS[panelKey];

  // 장면 추가
  const handleAddScene = () => {
    const newScene = createEmptyScene(panelKey, scenes.length + 1);
    onChange([...scenes, newScene]);
  };

  // 장면 수정
  const handleSceneChange = (index: number, updatedScene: Scene) => {
    const newScenes = [...scenes];
    newScenes[index] = updatedScene;
    onChange(newScenes);
  };

  // 장면 삭제
  const handleDeleteScene = (index: number) => {
    if (scenes.length === 1) {
      // 마지막 장면은 삭제하지 않고 비움
      const emptyScene = createEmptyScene(panelKey, 1);
      onChange([emptyScene]);
    } else {
      const newScenes = scenes.filter((_, i) => i !== index);
      // 순서 재정렬
      newScenes.forEach((scene, i) => {
        scene.order = i + 1;
      });
      onChange(newScenes);
    }
  };

  // 장면 위로 이동
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newScenes = [...scenes];
    [newScenes[index - 1], newScenes[index]] = [newScenes[index], newScenes[index - 1]];
    newScenes.forEach((scene, i) => {
      scene.order = i + 1;
    });
    onChange(newScenes);
  };

  // 장면 아래로 이동
  const handleMoveDown = (index: number) => {
    if (index === scenes.length - 1) return;
    const newScenes = [...scenes];
    [newScenes[index], newScenes[index + 1]] = [newScenes[index + 1], newScenes[index]];
    newScenes.forEach((scene, i) => {
      scene.order = i + 1;
    });
    onChange(newScenes);
  };

  // 완성된 장면 수
  const completedScenes = scenes.filter(scene =>
    scene.setting && scene.characters && scene.action
  ).length;

  return (
    <div className={`border-2 ${colors.border} rounded-2xl overflow-hidden`}>
      {/* 패널 헤더 */}
      <div
        className={`${colors.bg} px-4 py-4 cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 ${colors.accent} rounded-full flex items-center justify-center text-white font-bold`}>
              {labels.number}
            </span>
            <div>
              <h3 className={`font-bold ${colors.text} text-lg`}>
                {labels.label} ({labels.subtitle})
              </h3>
              <p className="text-sm text-gray-500">
                {scenes.length}개 장면 · {completedScenes}개 완성
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {completedScenes === scenes.length && scenes.length > 0 && (
              <span className="text-green-500 text-sm font-medium">✓ 완료</span>
            )}
            {isExpanded ? (
              <ChevronDown className={`w-6 h-6 ${colors.text}`} />
            ) : (
              <ChevronRight className={`w-6 h-6 ${colors.text}`} />
            )}
          </div>
        </div>

        {/* 원본 4컷 내용 미리보기 */}
        {originalContent && (
          <div className={`mt-3 p-3 bg-white/60 rounded-lg`}>
            <p className="text-xs text-gray-500 mb-1">📝 원본 4컷 내용:</p>
            <p className="text-sm text-gray-700 line-clamp-2">{originalContent}</p>
          </div>
        )}
      </div>

      {/* 장면 목록 */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-gray-50">
          {scenes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">아직 장면이 없습니다.</p>
              <button
                onClick={handleAddScene}
                className={`inline-flex items-center gap-2 px-4 py-2 ${colors.accent} text-white rounded-lg hover:opacity-90`}
              >
                <Plus className="w-4 h-4" />
                첫 번째 장면 추가
              </button>
            </div>
          ) : (
            <>
              {scenes.map((scene, index) => (
                <SceneEditor
                  key={scene.id}
                  scene={scene}
                  sceneNumber={index + 1}
                  totalScenes={scenes.length}
                  panelKey={panelKey}
                  onChange={(updated) => handleSceneChange(index, updated)}
                  onDelete={() => handleDeleteScene(index)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              ))}

              {/* 장면 추가 버튼 */}
              {scenes.length < 3 && (
                <button
                  onClick={handleAddScene}
                  className={`w-full py-3 border-2 border-dashed ${colors.border} rounded-xl text-gray-500 hover:${colors.bg} hover:${colors.text} transition-colors flex items-center justify-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  장면 추가 (최대 3개)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
