import { useState, useRef, useEffect } from 'react';
import { Check, Lightbulb, Edit3 } from 'lucide-react';
import type { PanelConfig } from './storyPanelConfig';

interface StoryPanelProps {
  config: PanelConfig;
  content: string;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onChange: (content: string) => void;
}

/**
 * 개별 스토리 패널 컴포넌트
 * 상태: empty → editing → filled
 */
export default function StoryPanel({
  config,
  content,
  isActive,
  onActivate,
  onDeactivate,
  onChange
}: StoryPanelProps) {
  const [showExample, setShowExample] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isEmpty = !content.trim();
  const isFilled = !isEmpty && !isActive;

  // 편집 모드 진입 시 textarea에 포커스
  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  // 외부 클릭 감지
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onDeactivate();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActive, onDeactivate]);

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDeactivate();
    }
  };

  // 패널 클릭 핸들러
  const handlePanelClick = () => {
    if (!isActive) {
      onActivate();
    }
  };

  const { color } = config;
  const charCount = content.length;
  const isLongEnough = charCount >= 20;

  return (
    <div
      ref={panelRef}
      onClick={handlePanelClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${config.id}번 칸: ${config.label}(${config.subtitle}) - ${isEmpty ? '클릭하여 작성' : '클릭하여 편집'}`}
      aria-expanded={isActive}
      className={`
        relative rounded-xl transition-all duration-200 cursor-pointer
        ${isActive
          ? `${color.bg} border-2 ${color.borderActive} shadow-lg transform scale-[1.02]`
          : isFilled
            ? `${color.bgFilled} border-2 ${color.border} hover:shadow-md`
            : `bg-white border-2 border-dashed ${color.border} hover:${color.bg} hover:border-solid`
        }
        ${isActive ? 'z-10' : ''}
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      `}
    >
      {/* 완료 체크 아이콘 */}
      {isFilled && isLongEnough && (
        <div className={`absolute -top-2 -right-2 w-6 h-6 ${color.accent} rounded-full flex items-center justify-center shadow-sm`}>
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* 편집 모드 */}
      {isActive ? (
        <div className="p-4 min-h-[200px] flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 ${color.accent} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                {config.id}
              </span>
              <div>
                <span className={`font-bold ${color.text}`}>{config.label}</span>
                <span className="text-gray-400 text-sm ml-1">({config.subtitle})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${charCount > 0 ? (isLongEnough ? 'text-green-500' : 'text-orange-500') : 'text-gray-400'}`}>
                {charCount}자 {!isLongEnough && charCount > 0 && '(20자 이상 권장)'}
              </span>
            </div>
          </div>

          {/* 힌트 */}
          <p className={`text-sm ${color.text} mb-3 opacity-80`}>
            💡 {config.hint}
          </p>

          {/* 텍스트 입력 */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={config.placeholder}
            className={`
              flex-1 w-full p-3 rounded-lg border ${color.border}
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:${color.borderActive}
              resize-none bg-white/80 text-gray-700 placeholder-gray-400
              min-h-[100px]
            `}
            onClick={(e) => e.stopPropagation()}
          />

          {/* 예시 보기 버튼 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowExample(!showExample);
            }}
            className={`mt-3 text-sm ${color.text} hover:underline flex items-center gap-1 self-start`}
          >
            <Lightbulb className="w-4 h-4" />
            {showExample ? '예시 닫기' : '예시 보기'}
          </button>

          {/* 예시 */}
          {showExample && (
            <div className={`mt-2 p-3 rounded-lg ${color.bg} border ${color.border} text-sm text-gray-600`}>
              <p className="font-medium mb-1">예시:</p>
              <p className="italic">"{config.example}"</p>
            </div>
          )}
        </div>
      ) : isFilled ? (
        /* 채워진 상태 */
        <div className="p-4 min-h-[150px] flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 ${color.accent} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                {config.id}
              </span>
              <span className={`font-medium ${color.text} text-sm`}>
                {config.label}({config.subtitle})
              </span>
            </div>
            <Edit3 className={`w-4 h-4 ${color.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
          </div>

          {/* 내용 미리보기 */}
          <p className="text-gray-700 text-sm line-clamp-4 flex-1">
            {content}
          </p>

          {/* 글자 수 */}
          <div className="mt-2 text-xs text-gray-400 text-right">
            {charCount}자
          </div>
        </div>
      ) : (
        /* 빈 상태 */
        <div className="p-4 min-h-[150px] flex flex-col items-center justify-center text-center group">
          <span className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center text-xl font-bold mb-2 group-hover:scale-110 transition-transform`}>
            {config.id}
          </span>
          <span className={`font-bold ${color.text}`}>{config.label}</span>
          <span className="text-gray-400 text-sm">({config.subtitle})</span>
          <p className="text-gray-400 text-xs mt-2">클릭하여 작성</p>
        </div>
      )}
    </div>
  );
}
