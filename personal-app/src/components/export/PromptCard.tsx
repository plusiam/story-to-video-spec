/**
 * 프롬프트 카드 컴포넌트
 * 개별 장면의 프롬프트를 표시하고 복사 기능 제공
 */

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { GeneratedPrompt } from '@/lib/prompts/types';
import { PANEL_LABELS_KO } from '@/lib/prompts/types';

interface PromptCardProps {
  prompt: GeneratedPrompt;
  onCopy: (prompt: GeneratedPrompt) => Promise<boolean>;
  isCopied: boolean;
  defaultExpanded?: boolean;
}

// 패널별 색상 설정
const PANEL_COLORS: Record<string, {
  border: string;
  bg: string;
  accent: string;
  text: string;
}> = {
  ki: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    accent: 'bg-blue-500',
    text: 'text-blue-800'
  },
  seung: {
    border: 'border-green-300',
    bg: 'bg-green-50',
    accent: 'bg-green-500',
    text: 'text-green-800'
  },
  jeon: {
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    accent: 'bg-orange-500',
    text: 'text-orange-800'
  },
  gyeol: {
    border: 'border-purple-300',
    bg: 'bg-purple-50',
    accent: 'bg-purple-500',
    text: 'text-purple-800'
  }
};

export default function PromptCard({
  prompt,
  onCopy,
  isCopied,
  defaultExpanded = true
}: PromptCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colors = PANEL_COLORS[prompt.panelKey] || PANEL_COLORS.ki;
  const labels = PANEL_LABELS_KO[prompt.panelKey] || { label: prompt.panelKey, subtitle: '' };

  const handleCopy = async () => {
    await onCopy(prompt);
  };

  return (
    <div className={`border-2 ${colors.border} rounded-xl overflow-hidden transition-all`}>
      {/* 헤더 */}
      <div className={`${colors.bg} px-4 py-3 flex items-center justify-between`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1"
        >
          <span className={`
            w-8 h-8 ${colors.accent} rounded-full flex items-center justify-center
            text-white font-bold text-sm
          `}>
            {prompt.sceneIndex}
          </span>
          <div className="text-left">
            <h3 className={`font-bold ${colors.text} text-sm sm:text-base`}>
              {labels.label} - 장면 {prompt.sceneIndex}
            </h3>
            <p className="text-xs text-gray-500">
              {prompt.promptLength}자
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 ml-2" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />
          )}
        </button>

        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-all
            ${isCopied
              ? 'bg-green-500 text-white'
              : `${colors.accent} text-white hover:opacity-90`
            }
          `}
        >
          {isCopied ? (
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
      {isExpanded && (
        <div className="p-4 bg-white">
          {/* 메인 프롬프트 */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <pre className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
              {prompt.mainPrompt}
            </pre>
          </div>

          {/* 네거티브 프롬프트 (있는 경우) */}
          {prompt.negativePrompt && prompt.service !== 'stable-diffusion' && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Negative Prompt:
              </p>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono">
                  {prompt.negativePrompt}
                </pre>
              </div>
            </div>
          )}

          {/* 파라미터 (Midjourney 등) */}
          {prompt.parameters && Object.keys(prompt.parameters).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Parameters:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(prompt.parameters).map(([key, value]) => (
                  <span
                    key={key}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-mono"
                  >
                    --{key} {String(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 복사 안내 */}
          <p className="mt-3 text-xs text-gray-400 text-center">
            💡 복사 버튼을 눌러 프롬프트를 복사한 후 AI 서비스에 붙여넣기 하세요
          </p>
        </div>
      )}
    </div>
  );
}
