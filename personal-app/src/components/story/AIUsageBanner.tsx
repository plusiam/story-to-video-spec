import { Settings, Sparkles, Key } from 'lucide-react';
import type { AIUsageStatus } from '@/types';

interface AIUsageBannerProps {
  usageStatus: AIUsageStatus;
  hasApiKey: boolean;
  onSettingsClick: () => void;
}

/**
 * AI 사용량 표시 배너
 */
export default function AIUsageBanner({
  usageStatus,
  hasApiKey,
  onSettingsClick
}: AIUsageBannerProps) {
  const { usedCount, dailyLimit, remaining, isUnlimited } = usageStatus;
  const usagePercent = isUnlimited ? 0 : Math.min((usedCount / dailyLimit) * 100, 100);
  const isLow = !isUnlimited && remaining <= 2;
  const isEmpty = !isUnlimited && remaining === 0;

  return (
    <div className={`rounded-xl p-3 sm:p-4 ${
      isEmpty ? 'bg-red-50 border border-red-200' :
      isLow ? 'bg-yellow-50 border border-yellow-200' :
      'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-5 h-5 ${
            isEmpty ? 'text-red-500' :
            isLow ? 'text-yellow-600' :
            'text-indigo-500'
          }`} />
          <span className="font-medium text-sm sm:text-base">AI 사용량</span>
        </div>
        <button
          onClick={onSettingsClick}
          className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
          title="API 키 설정"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
        </button>
      </div>

      {isUnlimited ? (
        <div className="flex items-center gap-2 text-green-600">
          <Key className="w-4 h-4" />
          <span className="text-sm">무제한 사용 가능 {hasApiKey ? '(개인 API 키)' : '(관리자)'}</span>
        </div>
      ) : (
        <>
          {/* 진행률 바 */}
          <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-300 ${
                isEmpty ? 'bg-red-500' :
                isLow ? 'bg-yellow-500' :
                'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className={
              isEmpty ? 'text-red-600' :
              isLow ? 'text-yellow-700' :
              'text-gray-600'
            }>
              오늘 사용: {usedCount}/{dailyLimit}회
            </span>
            <span className={`font-medium ${
              isEmpty ? 'text-red-600' :
              isLow ? 'text-yellow-700' :
              'text-indigo-600'
            }`}>
              {remaining}회 남음
            </span>
          </div>

          {/* 무료 사용량 소진 시 안내 */}
          {(isLow || isEmpty) && (
            <div className={`mt-3 pt-3 border-t ${
              isEmpty ? 'border-red-200' : 'border-yellow-200'
            }`}>
              <p className={`text-xs sm:text-sm ${
                isEmpty ? 'text-red-600' : 'text-yellow-700'
              }`}>
                {isEmpty ? (
                  <>💡 오늘 무료 사용량을 모두 소진했습니다.</>
                ) : (
                  <>💡 무료 사용량이 얼마 남지 않았습니다.</>
                )}
              </p>
              <button
                onClick={onSettingsClick}
                className={`mt-2 text-xs sm:text-sm font-medium ${
                  isEmpty ? 'text-red-700 hover:text-red-800' :
                  'text-yellow-700 hover:text-yellow-800'
                } hover:underline`}
              >
                개인 API 키를 등록하면 무제한으로 사용할 수 있어요! →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
