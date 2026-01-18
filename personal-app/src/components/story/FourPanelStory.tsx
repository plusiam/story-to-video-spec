import { useState, useCallback, useEffect } from 'react';
import StoryPanel from './StoryPanel';
import { PANEL_CONFIG, EMPTY_PANELS, type PanelContent } from './storyPanelConfig';
import { Sparkles } from 'lucide-react';

interface FourPanelStoryProps {
  panels: PanelContent;
  onChange: (panels: PanelContent) => void;
  onAutoSave?: () => void;
}

/**
 * 4컷 스토리 컨테이너 컴포넌트
 * 기-승-전-결 구조의 스토리 입력을 관리
 */
export default function FourPanelStory({
  panels,
  onChange,
  onAutoSave
}: FourPanelStoryProps) {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  // 자동 저장 (debounce)
  useEffect(() => {
    if (!onAutoSave) return;

    const timer = setTimeout(() => {
      onAutoSave();
    }, 2000);

    return () => clearTimeout(timer);
  }, [panels, onAutoSave]);

  // 패널 내용 변경
  const handlePanelChange = useCallback((key: keyof PanelContent, content: string) => {
    onChange({
      ...panels,
      [key]: content
    });
  }, [panels, onChange]);

  // 완료된 패널 수 계산
  const completedCount = PANEL_CONFIG.filter(
    config => panels[config.key].trim().length >= 20
  ).length;

  // 전체 글자 수
  const totalChars = Object.values(panels).reduce((sum, text) => sum + text.length, 0);

  // 진행률 계산 (각 패널당 25%)
  const progressPercent = (completedCount / 4) * 100;

  return (
    <div className="space-y-6">
      {/* 진행 상태 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          스토리 구성
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {completedCount}/4 완료
          </span>
          <span className="text-sm text-gray-400">
            총 {totalChars}자
          </span>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-green-500 via-orange-500 to-purple-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 4컷 패널 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PANEL_CONFIG.map((config) => (
          <StoryPanel
            key={config.key}
            config={config}
            content={panels[config.key]}
            isActive={activePanel === config.key}
            onActivate={() => setActivePanel(config.key)}
            onDeactivate={() => setActivePanel(null)}
            onChange={(content) => handlePanelChange(config.key, content)}
          />
        ))}
      </div>

      {/* 완료 메시지 */}
      {completedCount === 4 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 text-center animate-fade-in">
          <p className="text-purple-700 font-medium">
            🎉 모든 스토리를 완성했어요! 훌륭해요!
          </p>
          <p className="text-purple-500 text-sm mt-1">
            저장 버튼을 눌러 작품을 저장하세요.
          </p>
        </div>
      )}

      {/* 작성 팁 */}
      {completedCount < 4 && (
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">💡 스토리 구성 TIP</p>
          <p>
            {activePanel === null
              ? '각 칸을 클릭하여 이야기를 작성해보세요. 기→승→전→결 순서로 작성하면 자연스러운 흐름이 만들어져요!'
              : activePanel === 'ki'
                ? '시작 부분에서는 주인공과 배경을 소개해주세요. 독자가 이야기에 빠져들 수 있도록!'
                : activePanel === 'seung'
                  ? '전개 부분에서는 사건이 시작됩니다. 주인공에게 어떤 일이 일어나나요?'
                  : activePanel === 'jeon'
                    ? '위기 부분이 가장 중요해요! 긴장감 넘치는 장면을 만들어보세요.'
                    : '결말에서 모든 것을 마무리해주세요. 해피엔딩? 열린 결말? 당신의 선택이에요!'
            }
          </p>
        </div>
      )}
    </div>
  );
}

// 기본 내보내기와 함께 설정도 내보내기
export { PANEL_CONFIG, EMPTY_PANELS, type PanelContent };
