import { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import {
  type Scene,
  type SceneFieldConfig,
  SCENE_FIELDS,
  PANEL_COLORS,
  generateImagePrompt
} from './sceneConfig';

interface SceneEditorProps {
  scene: Scene;
  sceneNumber: number;
  totalScenes: number;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  onChange: (scene: Scene) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  hideMoveButtons?: boolean;
}

/**
 * 개별 장면 편집 컴포넌트
 */
export default function SceneEditor({
  scene,
  sceneNumber,
  totalScenes,
  panelKey,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  hideMoveButtons = false
}: SceneEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const colors = PANEL_COLORS[panelKey];

  // 필드 값 변경 핸들러
  const handleFieldChange = (key: SceneFieldConfig['key'], value: string) => {
    const updatedScene = { ...scene, [key]: value };
    // 프롬프트 자동 업데이트
    updatedScene.imagePrompt = generateImagePrompt(updatedScene);
    onChange(updatedScene);
  };

  // 장면이 비어있는지 확인
  const isEmpty = !scene.setting && !scene.characters && !scene.action && !scene.dialogue && !scene.mood;

  // 완성도 계산 (필수 필드: setting, characters, action)
  const completeness = [scene.setting, scene.characters, scene.action].filter(Boolean).length;
  const isComplete = completeness === 3;

  return (
    <div className={`border-2 ${colors.border} rounded-xl overflow-hidden transition-all ${isExpanded ? 'shadow-md' : ''}`}>
      {/* 헤더 */}
      <div
        className={`${colors.light} px-3 sm:px-4 py-3 flex items-center justify-between cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className={`w-7 h-7 sm:w-8 sm:h-8 ${colors.accent} rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0`}>
            {sceneNumber}
          </span>
          <div className="min-w-0 flex-1">
            <span className={`font-medium ${colors.text} text-sm sm:text-base`}>
              장면 {sceneNumber}
            </span>
            {!isExpanded && !isEmpty && (
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {scene.action || scene.setting || '내용 없음'}
              </p>
            )}
          </div>
          {isComplete && (
            <span className="text-green-500 text-xs sm:text-sm flex-shrink-0 hidden xs:inline">✓ 완성</span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* 순서 변경 버튼 - hideMoveButtons가 true면 숨김 (드래그로 대체) */}
          {!hideMoveButtons && (
            <div className="hidden sm:flex flex-col">
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                disabled={sceneNumber === 1}
                className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
                title="위로 이동"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                disabled={sceneNumber === totalScenes}
                className="p-1 hover:bg-white/50 rounded disabled:opacity-30"
                title="아래로 이동"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 삭제 버튼 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg text-red-500"
            title="장면 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* 확장/축소 */}
          <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* 내용 */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-white">
          {SCENE_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-1">
                <span>{field.icon}</span>
                {field.label}
                {['setting', 'characters', 'action'].includes(field.key) && (
                  <span className="text-red-400 text-xs">*</span>
                )}
              </label>
              {field.multiline ? (
                <textarea
                  value={scene[field.key]}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full p-2.5 sm:p-3 border ${colors.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:${colors.border} resize-none text-sm sm:text-base`}
                  rows={2}
                />
              ) : (
                <input
                  type="text"
                  value={scene[field.key]}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full p-2.5 sm:p-3 border ${colors.border} rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:${colors.border} text-sm sm:text-base`}
                />
              )}
              <p className="text-xs text-gray-400 mt-1 hidden sm:block">{field.hint}</p>
            </div>
          ))}

          {/* AI 프롬프트 미리보기 */}
          <div className="pt-3 sm:pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${colors.text} hover:underline`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {showPrompt ? 'AI 프롬프트 숨기기' : 'AI 프롬프트 보기'}
            </button>

            {showPrompt && scene.imagePrompt && (
              <div className={`mt-2 p-2 sm:p-3 ${colors.bg} rounded-lg text-xs sm:text-sm text-gray-600 font-mono break-words`}>
                {scene.imagePrompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
