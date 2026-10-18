/**
 * 프롬프트 시스템 메인 인덱스
 *
 * AI 이미지/영상 서비스별 최적화된 프롬프트를 생성합니다.
 *
 * 지원 서비스:
 * - 이미지: Gemini, DALL-E, Midjourney, Stable Diffusion
 * - 영상: Google Vids, Sora, Runway, Pika
 */

// 타입 내보내기
export * from './types';

// 템플릿 내보내기
export * from './templates';

// 생성기 내보내기
export {
  generatePromptForScene,
  generatePromptsForStory,
  generatePromptBundle,
  promptsToText,
  promptsToJson,
  getClipboardText,
  getAllPromptsClipboardText
} from './generators/promptGenerator';
