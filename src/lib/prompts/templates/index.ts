/**
 * 프롬프트 템플릿 통합 인덱스
 */

import type { AIService, PromptTemplate } from '../types';

// 이미지 AI 템플릿
import { geminiTemplate } from './gemini';
import { dalleTemplate } from './dalle';
import { midjourneyTemplate } from './midjourney';
import { stableDiffusionTemplate } from './stable-diffusion';

// 영상 AI 템플릿
import { soraTemplate } from './sora';
import { googleVidsTemplate, generateVidsStoryboard } from './google-vids';
import { runwayTemplate } from './runway';
import { pikaTemplate } from './pika';

/**
 * 서비스별 템플릿 매핑
 */
export const templates: Record<AIService, PromptTemplate> = {
  // 이미지 AI
  gemini: geminiTemplate,
  dalle: dalleTemplate,
  midjourney: midjourneyTemplate,
  'stable-diffusion': stableDiffusionTemplate,

  // 영상 AI
  sora: soraTemplate,
  'google-vids': googleVidsTemplate,
  runway: runwayTemplate,
  pika: pikaTemplate
};

/**
 * 서비스에 맞는 템플릿 가져오기
 */
export const getTemplate = (service: AIService): PromptTemplate => {
  const template = templates[service];
  if (!template) {
    throw new Error(`Unknown AI service: ${service}`);
  }
  return template;
};

// 개별 템플릿 내보내기
export {
  geminiTemplate,
  dalleTemplate,
  midjourneyTemplate,
  stableDiffusionTemplate,
  soraTemplate,
  googleVidsTemplate,
  runwayTemplate,
  pikaTemplate,
  generateVidsStoryboard
};

// 타입 내보내기
export type { VidsStoryboardItem } from './google-vids';
