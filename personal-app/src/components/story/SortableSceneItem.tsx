import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import SceneEditor from './SceneEditor';
import type { Scene } from './sceneConfig';
import { PANEL_COLORS } from './sceneConfig';

interface SortableSceneItemProps {
  scene: Scene;
  sceneNumber: number;
  totalScenes: number;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  onChange: (scene: Scene) => void;
  onDelete: () => void;
}

/**
 * 드래그 가능한 장면 아이템 래퍼
 */
export default function SortableSceneItem({
  scene,
  sceneNumber,
  totalScenes,
  panelKey,
  onChange,
  onDelete
}: SortableSceneItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: scene.id });

  const colors = PANEL_COLORS[panelKey];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'opacity-90' : ''}`}
    >
      {/* 드래그 핸들 - 카드 왼쪽에 별도로 배치 */}
      <div className="flex gap-2">
        <button
          {...attributes}
          {...listeners}
          className={`
            flex-shrink-0 w-6 sm:w-8 flex items-center justify-center
            text-gray-400 hover:text-gray-600
            hover:bg-gray-100 rounded-lg
            cursor-grab active:cursor-grabbing
            touch-none select-none
            transition-colors
            ${isDragging ? `${colors.text} bg-gray-100` : ''}
          `}
          aria-label={`장면 ${sceneNumber} 순서 변경. 드래그하여 이동`}
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* 장면 에디터 */}
        <div className={`flex-1 transition-all ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}>
          <SceneEditor
            scene={scene}
            sceneNumber={sceneNumber}
            totalScenes={totalScenes}
            panelKey={panelKey}
            onChange={onChange}
            onDelete={onDelete}
            onMoveUp={() => {}} // 드래그로 대체
            onMoveDown={() => {}} // 드래그로 대체
            hideMoveButtons={true}
          />
        </div>
      </div>

      {/* 드래그 중 오버레이 효과 */}
      {isDragging && (
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute inset-0 ${colors.bg} opacity-20 rounded-xl`} />
        </div>
      )}
    </div>
  );
}
