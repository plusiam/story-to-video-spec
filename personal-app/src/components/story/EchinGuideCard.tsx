import { useState, useEffect } from 'react';
import { MessageCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

// 이친 Gemini Gem URL
const ECHIN_URL = 'https://gemini.google.com/gem/1XQjHdIgC33hBM5BqVFbBbxE0PeqbHYGB';

interface EchinGuideCardProps {
  /** 현재 단계 (step1 | step2) - 단계별 질문 가이드 분기 */
  step: 'step1' | 'step2';
}

/** 단계별 질문 가이드 데이터 */
const STEP_GUIDES = {
  step1: {
    title: '이야기가 떠오르지 않나요?',
    description: '이친(이야기 친구)에게 아이디어를 물어보세요!',
    suggestions: [
      '"우정에 대한 이야기를 만들고 싶어"',
      '"시작 부분을 어떻게 쓸까?"',
      '"반전이 있는 결말을 만들고 싶어"',
      '"가족 이야기를 재미있게 쓰고 싶어"',
    ],
  },
  step2: {
    title: '장면을 더 생생하게 쓰고 싶나요?',
    description: '이친에게 표현과 묘사를 도와달라고 해보세요!',
    suggestions: [
      '"이 장면에서 주인공은 뭘 느낄까?"',
      '"배경을 어떻게 묘사하면 좋을까?"',
      '"대사를 자연스럽게 쓰고 싶어"',
      '"긴장감 있는 장면을 만들고 싶어"',
    ],
  },
};

/** localStorage 키 */
const STORAGE_KEY = 'echin_guide_collapsed';

/**
 * 이친(이야기 친구) 가이드 카드
 * Step 1, 2에서 Gemini Gem 챗봇으로의 안내를 제공
 */
export default function EchinGuideCard({ step }: EchinGuideCardProps) {
  const guide = STEP_GUIDES[step];

  // 접힘 상태 (localStorage에서 복원)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // 접힘 상태 변경 시 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch {
      // localStorage 접근 실패 시 무시
    }
  }, [isCollapsed]);

  const handleOpenEchin = () => {
    window.open(ECHIN_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl overflow-hidden transition-all duration-300">
      {/* 헤더 (항상 표시) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-emerald-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="이친">🤖</span>
          <span className="font-medium text-emerald-800 text-sm sm:text-base">
            {guide.title}
          </span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-emerald-600 shrink-0" />
        ) : (
          <ChevronUp className="w-4 h-4 text-emerald-600 shrink-0" />
        )}
      </button>

      {/* 본문 (접기 가능) */}
      {!isCollapsed && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
          <p className="text-emerald-700 text-xs sm:text-sm">
            {guide.description}
          </p>

          {/* 질문 제안 */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" />
              이렇게 물어봐요:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {guide.suggestions.map((suggestion, i) => (
                <div
                  key={i}
                  className="text-xs text-emerald-700 bg-white/60 rounded-lg px-2.5 py-1.5 border border-emerald-100"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>

          {/* Google 계정 안내 + 이친 열기 버튼 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <p className="text-[11px] text-emerald-500 flex items-center gap-1">
              ⚠️ Google 계정이 필요해요
            </p>
            <button
              onClick={handleOpenEchin}
              className="sm:ml-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors text-sm font-medium shadow-sm"
            >
              <span>🤖</span>
              이친 만나러 가기
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
