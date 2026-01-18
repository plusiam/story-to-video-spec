import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import SortableSceneItem from './SortableSceneItem';
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

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 모바일: 150ms 길게 누르기
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 드래그 완료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(scenes, oldIndex, newIndex);
      // order 필드 업데이트
      reordered.forEach((scene, idx) => {
        scene.order = idx + 1;
      });

      onChange(reordered);
    }
  };

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

  // 완성된 장면 수
  const completedScenes = scenes.filter(scene =>
    scene.setting && scene.characters && scene.action
  ).length;

  return (
    <div className={`border-2 ${colors.border} rounded-xl sm:rounded-2xl overflow-hidden`}>
      {/* 패널 헤더 */}
      <div
        className={`${colors.bg} px-3 sm:px-4 py-3 sm:py-4 cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`w-8 h-8 sm:w-10 sm:h-10 ${colors.accent} rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base`}>
              {labels.number}
            </span>
            <div>
              <h3 className={`font-bold ${colors.text} text-base sm:text-lg`}>
                {labels.label} ({labels.subtitle})
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {scenes.length}개 장면 · {completedScenes}개 완성
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {completedScenes === scenes.length && scenes.length > 0 && (
              <span className="text-green-500 text-xs sm:text-sm font-medium hidden sm:inline">✓ 완료</span>
            )}
            {isExpanded ? (
              <ChevronDown className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
            ) : (
              <ChevronRight className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
            )}
          </div>
        </div>

        {/* 원본 4컷 내용 미리보기 */}
        {originalContent && (
          <div className={`mt-2 sm:mt-3 p-2 sm:p-3 bg-white/60 rounded-lg`}>
            <p className="text-xs text-gray-500 mb-1">📝 원본 4컷 내용:</p>
            <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{originalContent}</p>
          </div>
        )}
      </div>

      {/* 장면 목록 */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50">
          {scenes.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <p className="text-gray-500 mb-4 text-sm sm:text-base">아직 장면이 없습니다.</p>
              <button
                onClick={handleAddScene}
                className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 ${colors.accent} text-white rounded-lg hover:opacity-90 text-sm sm:text-base`}
              >
                <Plus className="w-4 h-4" />
                첫 번째 장면 추가
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={scenes.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 sm:space-y-4">
                  {scenes.map((scene, index) => (
                    <SortableSceneItem
                      key={scene.id}
                      scene={scene}
                      sceneNumber={index + 1}
                      totalScenes={scenes.length}
                      panelKey={panelKey}
                      onChange={(updated) => handleSceneChange(index, updated)}
                      onDelete={() => handleDeleteScene(index)}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* 장면 추가 버튼 */}
              {scenes.length < 3 && (
                <button
                  onClick={handleAddScene}
                  className={`w-full py-2.5 sm:py-3 border-2 border-dashed ${colors.border} rounded-xl text-gray-500 hover:${colors.bg} hover:${colors.text} transition-colors flex items-center justify-center gap-2 text-sm sm:text-base mt-3 sm:mt-4`}
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  장면 추가 (최대 3개)
                </button>
              )}
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}
