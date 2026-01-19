/**
 * 프롬프트 내보내기 메인 컴포넌트
 * AI 서비스 선택 → 프롬프트 미리보기 → 복사/다운로드
 */

import { useState, useMemo } from 'react';
import {
  Sparkles,
  Download,
  Copy,
  Check,
  FileText,
  FileJson,
  Settings2,
  ArrowLeft
} from 'lucide-react';
import ServiceSelector from './ServiceSelector';
import PromptCard from './PromptCard';
import { usePromptGenerator, convertToStoryInput } from '@/hooks/usePromptGenerator';
import type { VisualDNA } from '@/types/ai';
import type { PanelScenes } from '@/components/story/sceneConfig';
import type { PromptLanguage, AspectRatio } from '@/lib/prompts/types';

interface PromptExporterProps {
  title: string;
  scenes: PanelScenes;
  visualDNA: VisualDNA;
  onBack?: () => void;
}

type ExportStep = 'select-service' | 'preview-prompts';

export default function PromptExporter({
  title,
  scenes,
  visualDNA,
  onBack
}: PromptExporterProps) {
  const [step, setStep] = useState<ExportStep>('select-service');
  const [showSettings, setShowSettings] = useState(false);

  const {
    config,
    setService,
    setLanguage,
    setAspectRatio,
    toggleNegativePrompt,
    currentServiceInfo,
    generateBundle,
    copyToClipboard,
    copyAllToClipboard,
    downloadAsText,
    downloadAsJson,
    copiedPromptId
  } = usePromptGenerator();

  // 스토리 입력 데이터 생성
  const storyInput = useMemo(() => {
    return convertToStoryInput(title, scenes, visualDNA);
  }, [title, scenes, visualDNA]);

  // 프롬프트 번들 생성
  const promptBundle = useMemo(() => {
    if (storyInput.scenes.length === 0) return null;
    return generateBundle(storyInput);
  }, [storyInput, generateBundle]);

  // 장면이 없는 경우
  if (storyInput.scenes.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          내보낼 장면이 없습니다
        </h3>
        <p className="text-gray-500 mb-4">
          먼저 Step 2에서 장면을 작성해주세요.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg"
          >
            ← 장면 작성하러 가기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-500" />
          AI 프롬프트 내보내기
        </h2>

        {step === 'preview-prompts' && (
          <button
            onClick={() => setStep('select-service')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            서비스 변경
          </button>
        )}
      </div>

      {/* Step 1: 서비스 선택 */}
      {step === 'select-service' && (
        <>
          <p className="text-gray-600">
            프롬프트를 사용할 AI 서비스를 선택하세요.
            각 서비스에 최적화된 프롬프트가 생성됩니다.
          </p>

          <ServiceSelector
            selectedService={config.service}
            onSelect={setService}
          />

          {/* 추가 설정 */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">추가 설정</span>
              </div>
              <span className="text-sm text-gray-500">
                {showSettings ? '접기' : '펼치기'}
              </span>
            </button>

            {showSettings && (
              <div className="p-4 space-y-4">
                {/* 언어 설정 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    프롬프트 언어
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'ko', label: '한글' },
                      { value: 'en', label: '영어' },
                      { value: 'both', label: '둘 다' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setLanguage(option.value as PromptLanguage)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${config.language === option.value
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 화면 비율 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    화면 비율 (이미지/영상)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio as AspectRatio)}
                        className={`
                          px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                          ${config.aspectRatio === ratio
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 네거티브 프롬프트 */}
                {currentServiceInfo.supportsNegativePrompt && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        네거티브 프롬프트 포함
                      </p>
                      <p className="text-xs text-gray-500">
                        원하지 않는 요소를 제외하는 프롬프트
                      </p>
                    </div>
                    <button
                      onClick={toggleNegativePrompt}
                      className={`
                        relative w-12 h-6 rounded-full transition-colors
                        ${config.includeNegativePrompt ? 'bg-purple-500' : 'bg-gray-300'}
                      `}
                    >
                      <span
                        className={`
                          absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                          ${config.includeNegativePrompt ? 'left-7' : 'left-1'}
                        `}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 다음 단계 버튼 */}
          <button
            onClick={() => setStep('preview-prompts')}
            className="w-full py-3 bg-purple-500 text-white font-medium rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            프롬프트 생성하기
            <Sparkles className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Step 2: 프롬프트 미리보기 */}
      {step === 'preview-prompts' && promptBundle && (
        <>
          {/* 서비스 정보 요약 */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">
                  {currentServiceInfo.icon} {currentServiceInfo.nameKo}용 프롬프트
                </p>
                <p className="text-lg font-bold text-purple-900">
                  총 {promptBundle.prompts.length}개 장면
                </p>
              </div>

              {/* 일괄 액션 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => copyAllToClipboard(promptBundle)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${copiedPromptId === 'all'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }
                  `}
                >
                  {copiedPromptId === 'all' ? (
                    <>
                      <Check className="w-4 h-4" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      전체 복사
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 프롬프트 목록 */}
          <div className="space-y-4">
            {promptBundle.prompts.map((prompt, index) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onCopy={copyToClipboard}
                isCopied={copiedPromptId === prompt.id}
                defaultExpanded={index === 0}
              />
            ))}
          </div>

          {/* 다운로드 버튼 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" />
              파일로 저장하기
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => downloadAsText(promptBundle)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FileText className="w-4 h-4" />
                텍스트 (.txt)
              </button>
              <button
                onClick={() => downloadAsJson(promptBundle)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                JSON (.json)
              </button>
            </div>
          </div>

          {/* 사용 가이드 */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-800 mb-2">
              🎨 {currentServiceInfo.nameKo} 사용 방법
            </h4>
            <ol className="text-sm text-blue-700 space-y-1.5">
              <li className="flex gap-2">
                <span className="font-medium">1.</span>
                <span>원하는 장면의 "복사" 버튼 클릭</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">2.</span>
                <a
                  href={currentServiceInfo.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  {currentServiceInfo.name}
                </a>
                <span>접속</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">3.</span>
                <span>프롬프트 붙여넣기 후 생성</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">4.</span>
                <span>생성된 이미지/영상 다운로드</span>
              </li>
            </ol>

            {currentServiceInfo.freeQuota && (
              <p className="text-sm text-blue-600 mt-3 pt-3 border-t border-blue-200">
                💡 무료 사용량: {currentServiceInfo.freeQuota}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
