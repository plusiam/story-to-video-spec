/**
 * AI 서비스 선택 컴포넌트
 */

import { useState } from 'react';
import { Sparkles, Video, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { AIService, AIServiceInfo } from '@/lib/prompts/types';
import { IMAGE_AI_SERVICES, VIDEO_AI_SERVICES } from '@/lib/prompts/types';

interface ServiceSelectorProps {
  selectedService: AIService;
  onSelect: (service: AIService) => void;
  showDetails?: boolean;
}

interface ServiceCardProps {
  service: AIServiceInfo;
  isSelected: boolean;
  onSelect: () => void;
  isRecommended?: boolean;
}

const ServiceCard = ({ service, isSelected, onSelect, isRecommended }: ServiceCardProps) => {
  return (
    <button
      onClick={onSelect}
      className={`
        relative p-4 rounded-xl border-2 text-left transition-all
        ${isSelected
          ? 'border-purple-500 bg-purple-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
        }
      `}
    >
      {/* 추천 배지 */}
      {isRecommended && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">
          추천
        </span>
      )}

      {/* 선택 표시 */}
      <div className={`
        absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
        ${isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'}
      `}>
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* 서비스 정보 */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{service.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${isSelected ? 'text-purple-900' : 'text-gray-900'}`}>
            {service.nameKo}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {service.name}
          </p>
          <p className={`text-sm mt-1 ${isSelected ? 'text-purple-700' : 'text-gray-600'}`}>
            {service.descriptionKo}
          </p>

          {/* 추가 정보 */}
          <div className="flex flex-wrap gap-2 mt-2">
            {service.supportsKorean && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                한글 지원
              </span>
            )}
            {service.supportsNegativePrompt && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                네거티브 프롬프트
              </span>
            )}
            {service.freeQuota && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                무료 티어
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default function ServiceSelector({
  selectedService,
  onSelect,
  showDetails = true
}: ServiceSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<'image' | 'video' | null>('image');

  const toggleCategory = (category: 'image' | 'video') => {
    setExpandedCategory(prev => prev === category ? null : category);
  };

  const imageServiceList = Object.values(IMAGE_AI_SERVICES);
  const videoServiceList = Object.values(VIDEO_AI_SERVICES);

  const selectedServiceInfo = { ...IMAGE_AI_SERVICES, ...VIDEO_AI_SERVICES }[selectedService];

  return (
    <div className="space-y-4">
      {/* 이미지 AI 섹션 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleCategory('image')}
          className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-800">이미지 생성 AI</span>
            <span className="text-sm text-gray-500">({imageServiceList.length}개)</span>
          </div>
          {expandedCategory === 'image' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedCategory === 'image' && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {imageServiceList.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selectedService === service.id}
                onSelect={() => onSelect(service.id)}
                isRecommended={service.id === 'gemini'}
              />
            ))}
          </div>
        )}
      </div>

      {/* 영상 AI 섹션 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleCategory('video')}
          className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-800">영상 생성 AI</span>
            <span className="text-sm text-gray-500">({videoServiceList.length}개)</span>
          </div>
          {expandedCategory === 'video' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedCategory === 'video' && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videoServiceList.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selectedService === service.id}
                onSelect={() => onSelect(service.id)}
                isRecommended={service.id === 'google-vids'}
              />
            ))}
          </div>
        )}
      </div>

      {/* 선택된 서비스 상세 정보 */}
      {showDetails && selectedServiceInfo && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-purple-900 flex items-center gap-2">
                {selectedServiceInfo.icon} {selectedServiceInfo.nameKo} 선택됨
              </h4>
              <p className="text-sm text-purple-700 mt-1">
                {selectedServiceInfo.description}
              </p>
            </div>
            <a
              href={selectedServiceInfo.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
            >
              방문 <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {selectedServiceInfo.freeQuota && (
            <p className="text-sm text-purple-600 mt-2">
              💡 무료 사용량: {selectedServiceInfo.freeQuota}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
