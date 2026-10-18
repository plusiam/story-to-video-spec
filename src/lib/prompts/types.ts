/**
 * 프롬프트 생성 관련 타입 정의
 * AI 이미지/영상 서비스별 최적화된 프롬프트 생성을 위한 타입
 */

import type { VisualDNA } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';

// ============================================
// AI 서비스 타입
// ============================================

/** 이미지 생성 AI 서비스 */
export type ImageAIService = 'gemini' | 'dalle' | 'midjourney' | 'stable-diffusion';

/** 영상 생성 AI 서비스 */
export type VideoAIService = 'google-vids' | 'sora' | 'runway' | 'pika';

/** 모든 AI 서비스 */
export type AIService = ImageAIService | VideoAIService;

/** 서비스 카테고리 */
export type ServiceCategory = 'image' | 'video';

// ============================================
// AI 서비스 메타데이터
// ============================================

export interface AIServiceInfo {
  id: AIService;
  name: string;
  nameKo: string;
  category: ServiceCategory;
  description: string;
  descriptionKo: string;
  supportsKorean: boolean;
  supportsNegativePrompt: boolean;
  maxPromptLength?: number;
  recommendedAspectRatios: AspectRatio[];
  officialUrl: string;
  apiDocsUrl?: string;
  freeQuota?: string;
  icon?: string;
}

/** 이미지 AI 서비스 정보 */
export const IMAGE_AI_SERVICES: Record<ImageAIService, AIServiceInfo> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini (Imagen 3)',
    nameKo: '구글 제미나이',
    category: 'image',
    description: 'Google AI with Imagen 3 image generation',
    descriptionKo: '한글 프롬프트 지원 우수, 무료 사용 가능',
    supportsKorean: true,
    supportsNegativePrompt: false,
    recommendedAspectRatios: ['1:1', '16:9', '9:16'],
    officialUrl: 'https://gemini.google.com',
    apiDocsUrl: 'https://ai.google.dev/docs',
    freeQuota: '분당 15회, 일일 1,500회',
    icon: '✨'
  },
  dalle: {
    id: 'dalle',
    name: 'OpenAI DALL-E 3',
    nameKo: '달리 3',
    category: 'image',
    description: 'OpenAI image generation with excellent text understanding',
    descriptionKo: '고품질 이미지, 텍스트 이해력 우수',
    supportsKorean: false,
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    recommendedAspectRatios: ['1:1', '16:9', '9:16'],
    officialUrl: 'https://openai.com/dall-e-3',
    apiDocsUrl: 'https://platform.openai.com/docs/guides/images',
    icon: '🎨'
  },
  midjourney: {
    id: 'midjourney',
    name: 'Midjourney',
    nameKo: '미드저니',
    category: 'image',
    description: 'Artistic image generation with unique aesthetic',
    descriptionKo: '예술적 스타일, 다양한 파라미터 지원',
    supportsKorean: false,
    supportsNegativePrompt: true,
    recommendedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    officialUrl: 'https://midjourney.com',
    icon: '🖼️'
  },
  'stable-diffusion': {
    id: 'stable-diffusion',
    name: 'Stable Diffusion',
    nameKo: '스테이블 디퓨전',
    category: 'image',
    description: 'Open-source image generation with extensive customization',
    descriptionKo: '태그 기반, 네거티브 프롬프트 필수',
    supportsKorean: false,
    supportsNegativePrompt: true,
    recommendedAspectRatios: ['1:1', '16:9', '9:16'],
    officialUrl: 'https://stability.ai',
    icon: '🔮'
  }
};

/** 영상 AI 서비스 정보 */
export const VIDEO_AI_SERVICES: Record<VideoAIService, AIServiceInfo> = {
  'google-vids': {
    id: 'google-vids',
    name: 'Google Vids',
    nameKo: '구글 비드',
    category: 'video',
    description: 'Google Workspace video creation tool',
    descriptionKo: 'Google Workspace 영상 제작 도구, 스토리보드 기반',
    supportsKorean: true,
    supportsNegativePrompt: false,
    recommendedAspectRatios: ['16:9'],
    officialUrl: 'https://workspace.google.com/products/vids/',
    icon: '📹'
  },
  sora: {
    id: 'sora',
    name: 'OpenAI Sora',
    nameKo: '소라',
    category: 'video',
    description: 'Text-to-video generation with realistic motion',
    descriptionKo: '텍스트→영상, 사실적인 움직임',
    supportsKorean: false,
    supportsNegativePrompt: false,
    recommendedAspectRatios: ['16:9', '9:16', '1:1'],
    officialUrl: 'https://openai.com/sora',
    icon: '🎬'
  },
  runway: {
    id: 'runway',
    name: 'Runway Gen-3',
    nameKo: '런웨이',
    category: 'video',
    description: 'AI video generation and editing platform',
    descriptionKo: '짧은 클립 생성, 영상 편집 기능',
    supportsKorean: false,
    supportsNegativePrompt: false,
    recommendedAspectRatios: ['16:9', '9:16'],
    officialUrl: 'https://runwayml.com',
    icon: '🎥'
  },
  pika: {
    id: 'pika',
    name: 'Pika Labs',
    nameKo: '피카',
    category: 'video',
    description: 'Creative AI video generation',
    descriptionKo: '창의적 영상 생성, 간결한 프롬프트',
    supportsKorean: false,
    supportsNegativePrompt: false,
    recommendedAspectRatios: ['16:9', '9:16', '1:1'],
    officialUrl: 'https://pika.art',
    icon: '⚡'
  }
};

/** 모든 AI 서비스 정보 */
export const ALL_AI_SERVICES: Record<AIService, AIServiceInfo> = {
  ...IMAGE_AI_SERVICES,
  ...VIDEO_AI_SERVICES
};

// ============================================
// 프롬프트 설정
// ============================================

/** 화면 비율 */
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9';

/** 프롬프트 언어 */
export type PromptLanguage = 'ko' | 'en' | 'both';

/** 프롬프트 생성 설정 */
export interface PromptConfig {
  service: AIService;
  language: PromptLanguage;
  includeStyle: boolean;
  includeNegativePrompt: boolean;
  includeCharacterConsistency: boolean;
  aspectRatio?: AspectRatio;
  customSuffix?: string;
}

/** 기본 프롬프트 설정 */
export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  service: 'gemini',
  language: 'ko',
  includeStyle: true,
  includeNegativePrompt: false,
  includeCharacterConsistency: true
};

// ============================================
// 생성된 프롬프트
// ============================================

/** 단일 프롬프트 결과 */
export interface GeneratedPrompt {
  id: string;
  service: AIService;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  sceneIndex: number;
  sceneTitle: string;

  // 프롬프트 내용
  mainPrompt: string;
  mainPromptEn?: string;  // 영어 번역본
  negativePrompt?: string;

  // Midjourney 전용 파라미터
  parameters?: MidjourneyParams;

  // 메타데이터
  promptLength: number;
  createdAt: Date;
}

/** Midjourney 파라미터 */
export interface MidjourneyParams {
  ar?: string;        // --ar 16:9
  style?: string;     // --style raw
  stylize?: number;   // --s 100
  chaos?: number;     // --c 0
  version?: string;   // --v 6.1
  quality?: number;   // --q 1
  tile?: boolean;     // --tile
  weird?: number;     // --weird 0
  niji?: boolean;     // --niji 6
  no?: string;        // --no text, watermark
}

/** 프롬프트 일괄 내보내기 결과 */
export interface PromptExportBundle {
  title: string;
  service: AIService;
  serviceInfo: AIServiceInfo;
  prompts: GeneratedPrompt[];
  config: PromptConfig;
  visualDNA: VisualDNA;
  metadata: {
    totalScenes: number;
    totalCharacters: number;
    exportedAt: Date;
    version: string;
  };
}

// ============================================
// 장면 입력 데이터
// ============================================

/** 장면 데이터 (프롬프트 생성용) */
export interface SceneInput {
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  sceneIndex: number;
  scene: Scene;
}

/** 전체 스토리 데이터 (프롬프트 생성용) */
export interface StoryInput {
  title: string;
  scenes: SceneInput[];
  visualDNA: VisualDNA;
}

// ============================================
// 프롬프트 템플릿
// ============================================

/** 프롬프트 템플릿 인터페이스 */
export interface PromptTemplate {
  service: AIService;

  /** 메인 프롬프트 생성 */
  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    language: PromptLanguage
  ): string;

  /** 네거티브 프롬프트 생성 (지원하는 서비스만) */
  generateNegativePrompt?(
    scene: Scene,
    visualDNA: VisualDNA
  ): string;

  /** 파라미터 생성 (Midjourney 등) */
  generateParameters?(
    config: PromptConfig
  ): Record<string, string | number | boolean>;

  /** 최종 프롬프트 포맷팅 */
  formatFinalPrompt(
    mainPrompt: string,
    negativePrompt?: string,
    parameters?: Record<string, string | number | boolean>
  ): string;
}

// ============================================
// 유틸리티 타입
// ============================================

/** 패널 라벨 */
export const PANEL_LABELS_KO: Record<string, { label: string; subtitle: string }> = {
  ki: { label: '기(起)', subtitle: '시작' },
  seung: { label: '승(承)', subtitle: '전개' },
  jeon: { label: '전(轉)', subtitle: '위기' },
  gyeol: { label: '결(結)', subtitle: '결말' }
};

/** 패널 라벨 (영어) */
export const PANEL_LABELS_EN: Record<string, { label: string; subtitle: string }> = {
  ki: { label: 'Introduction', subtitle: 'Beginning' },
  seung: { label: 'Development', subtitle: 'Rising Action' },
  jeon: { label: 'Twist', subtitle: 'Climax' },
  gyeol: { label: 'Conclusion', subtitle: 'Resolution' }
};

/** 고유 ID 생성 */
export const generatePromptId = (
  service: AIService,
  panelKey: string,
  sceneIndex: number
): string => {
  return `${service}-${panelKey}-${sceneIndex}-${Date.now()}`;
};
