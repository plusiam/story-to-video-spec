/**
 * 문서 내보내기 관련 타입 정의
 * 다양한 형식의 문서 생성을 위한 타입
 */

import type { VisualDNA, Character } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';
import type { AIService, GeneratedPrompt, PromptConfig } from '@/lib/prompts/types';

// Scene에서 내보내기에 필요한 속성 매핑 (실제 Scene 타입 기반)
// Scene 타입:
// - setting (배경/장소) -> location
// - characters (등장인물) -> characterName
// - action (행동/사건) -> description
// - dialogue (대사)
// - mood (분위기/감정) -> emotion
// - cameraAngle (카메라 앵글)
// - durationSec (장면 길이)

// ============================================
// 내보내기 형식 타입
// ============================================

/** 텍스트 형식 */
export type TextExportFormat = 'narration' | 'screenplay' | 'storyboard-text';

/** 구조화 데이터 형식 */
export type DataExportFormat = 'google-vids-json' | 'storyboard-json' | 'srt' | 'vtt';

/** 문서 형식 */
export type DocumentExportFormat = 'storyboard-pdf' | 'prompt-guide-pdf' | 'character-sheet-pdf';

/** 모든 내보내기 형식 */
export type ExportFormat = TextExportFormat | DataExportFormat | DocumentExportFormat;

/** 형식 카테고리 */
export type ExportCategory = 'text' | 'data' | 'document';

// ============================================
// 내보내기 형식 메타데이터
// ============================================

export interface ExportFormatInfo {
  id: ExportFormat;
  name: string;
  nameKo: string;
  category: ExportCategory;
  description: string;
  descriptionKo: string;
  fileExtension: string;
  mimeType: string;
  icon: string;
  useCases: string[];
  useCasesKo: string[];
}

/** 텍스트 형식 정보 */
export const TEXT_EXPORT_FORMATS: Record<TextExportFormat, ExportFormatInfo> = {
  narration: {
    id: 'narration',
    name: 'Narration Script',
    nameKo: '나레이션 스크립트',
    category: 'text',
    description: 'Script for voiceover and TTS',
    descriptionKo: '영상 나레이션, TTS용 스크립트',
    fileExtension: 'txt',
    mimeType: 'text/plain',
    icon: '🎙️',
    useCases: ['Video narration', 'TTS input', 'Audio recording'],
    useCasesKo: ['영상 나레이션', 'TTS 입력', '오디오 녹음']
  },
  screenplay: {
    id: 'screenplay',
    name: 'Screenplay',
    nameKo: '시나리오 대본',
    category: 'text',
    description: 'Professional screenplay format with dialogue and action',
    descriptionKo: '대사, 지문, 감정이 포함된 전문 시나리오',
    fileExtension: 'txt',
    mimeType: 'text/plain',
    icon: '🎬',
    useCases: ['Video production', 'Acting reference', 'Direction guide'],
    useCasesKo: ['영상 제작', '연기 참고', '연출 가이드']
  },
  'storyboard-text': {
    id: 'storyboard-text',
    name: 'Storyboard Text',
    nameKo: '스토리보드 텍스트',
    category: 'text',
    description: 'Scene descriptions with camera angles',
    descriptionKo: '장면 설명, 카메라 앵글 포함',
    fileExtension: 'txt',
    mimeType: 'text/plain',
    icon: '📋',
    useCases: ['Planning document', 'Team communication', 'Pre-production'],
    useCasesKo: ['기획 문서', '팀 커뮤니케이션', '사전 제작']
  }
};

/** 구조화 데이터 형식 정보 */
export const DATA_EXPORT_FORMATS: Record<DataExportFormat, ExportFormatInfo> = {
  'google-vids-json': {
    id: 'google-vids-json',
    name: 'Google Vids JSON',
    nameKo: 'Google Vids JSON',
    category: 'data',
    description: 'JSON format for Google Vids import',
    descriptionKo: 'Google Vids 임포트용 JSON',
    fileExtension: 'json',
    mimeType: 'application/json',
    icon: '📹',
    useCases: ['Google Vids import', 'Video timeline'],
    useCasesKo: ['Google Vids 임포트', '영상 타임라인']
  },
  'storyboard-json': {
    id: 'storyboard-json',
    name: 'Storyboard JSON',
    nameKo: '스토리보드 JSON',
    category: 'data',
    description: 'Complete structured data for developers',
    descriptionKo: '개발자용 전체 구조화 데이터',
    fileExtension: 'json',
    mimeType: 'application/json',
    icon: '🔧',
    useCases: ['API integration', 'Data backup', 'Custom tools'],
    useCasesKo: ['API 연동', '데이터 백업', '커스텀 도구']
  },
  srt: {
    id: 'srt',
    name: 'SRT Subtitles',
    nameKo: 'SRT 자막',
    category: 'data',
    description: 'SubRip subtitle format',
    descriptionKo: 'SubRip 자막 파일',
    fileExtension: 'srt',
    mimeType: 'text/plain',
    icon: '💬',
    useCases: ['Video subtitles', 'Media players'],
    useCasesKo: ['영상 자막', '미디어 플레이어']
  },
  vtt: {
    id: 'vtt',
    name: 'WebVTT Subtitles',
    nameKo: 'WebVTT 자막',
    category: 'data',
    description: 'Web Video Text Tracks format',
    descriptionKo: '웹 영상용 자막 파일',
    fileExtension: 'vtt',
    mimeType: 'text/vtt',
    icon: '🌐',
    useCases: ['Web video', 'HTML5 video', 'Streaming'],
    useCasesKo: ['웹 영상', 'HTML5 비디오', '스트리밍']
  }
};

/** 문서 형식 정보 */
export const DOCUMENT_EXPORT_FORMATS: Record<DocumentExportFormat, ExportFormatInfo> = {
  'storyboard-pdf': {
    id: 'storyboard-pdf',
    name: 'Storyboard PDF',
    nameKo: '스토리보드 PDF',
    category: 'document',
    description: 'Printable storyboard with image placeholders',
    descriptionKo: '인쇄 가능한 스토리보드 (이미지 자리 포함)',
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    icon: '📄',
    useCases: ['Print', 'Share', 'Presentation'],
    useCasesKo: ['인쇄', '공유', '발표']
  },
  'prompt-guide-pdf': {
    id: 'prompt-guide-pdf',
    name: 'AI Prompt Guide PDF',
    nameKo: 'AI 프롬프트 가이드 PDF',
    category: 'document',
    description: 'Complete prompt guide with usage instructions',
    descriptionKo: '서비스별 프롬프트 + 사용법 가이드',
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    icon: '📚',
    useCases: ['AI tool guide', 'Learning material', 'Reference'],
    useCasesKo: ['AI 도구 가이드', '학습 자료', '참고용']
  },
  'character-sheet-pdf': {
    id: 'character-sheet-pdf',
    name: 'Character Sheet PDF',
    nameKo: '캐릭터 시트 PDF',
    category: 'document',
    description: 'Character details for visual consistency',
    descriptionKo: '캐릭터 설정, 비주얼 DNA 문서',
    fileExtension: 'pdf',
    mimeType: 'application/pdf',
    icon: '👤',
    useCases: ['Character reference', 'Consistency guide', 'Art direction'],
    useCasesKo: ['캐릭터 참고', '일관성 가이드', '아트 디렉션']
  }
};

/** 모든 내보내기 형식 정보 */
export const ALL_EXPORT_FORMATS: Record<ExportFormat, ExportFormatInfo> = {
  ...TEXT_EXPORT_FORMATS,
  ...DATA_EXPORT_FORMATS,
  ...DOCUMENT_EXPORT_FORMATS
};

// ============================================
// 내보내기 설정
// ============================================

/** 내보내기 공통 설정 */
export interface ExportConfig {
  format: ExportFormat;
  language: 'ko' | 'en' | 'both';
  includeMetadata: boolean;
  includeTimestamps: boolean;
}

/** 나레이션 설정 */
export interface NarrationConfig extends ExportConfig {
  format: 'narration';
  includeSceneNumbers: boolean;
  includePanelLabels: boolean;
  pauseDuration: number; // 장면 간 일시정지 (초)
  speakerStyle: 'narrator' | 'character' | 'mixed';
}

/** 시나리오 설정 */
export interface ScreenplayConfig extends ExportConfig {
  format: 'screenplay';
  includeActionLines: boolean;
  includeEmotions: boolean;
  includeCameraDirections: boolean;
  formatStyle: 'standard' | 'korean' | 'simple';
}

/** 자막 설정 */
export interface SubtitleConfig extends ExportConfig {
  format: 'srt' | 'vtt';
  defaultDuration: number; // 기본 표시 시간 (초)
  scenePadding: number; // 장면 간 간격 (초)
  maxCharsPerLine: number;
  includeSceneLabels: boolean;
}

/** PDF 설정 */
export interface PdfConfig extends ExportConfig {
  format: DocumentExportFormat;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  includePageNumbers: boolean;
  includeToc: boolean; // 목차
  colorScheme: 'color' | 'grayscale';
}

/** 스토리보드 PDF 설정 */
export interface StoryboardPdfConfig extends PdfConfig {
  format: 'storyboard-pdf';
  panelsPerPage: 1 | 2 | 4 | 6;
  includeImagePlaceholders: boolean;
  includeSceneDescriptions: boolean;
  includeDialogue: boolean;
}

/** 프롬프트 가이드 PDF 설정 */
export interface PromptGuidePdfConfig extends PdfConfig {
  format: 'prompt-guide-pdf';
  targetServices: AIService[];
  includeUsageInstructions: boolean;
  includeExamples: boolean;
  includeQRCodes: boolean; // AI 서비스 링크 QR
}

/** 캐릭터 시트 PDF 설정 */
export interface CharacterSheetPdfConfig extends PdfConfig {
  format: 'character-sheet-pdf';
  includeVisualDNA: boolean;
  includeColorPalette: boolean;
  includeStyleGuide: boolean;
  includePromptTips: boolean;
}

// ============================================
// 내보내기 입력 데이터
// ============================================

/** 장면 입력 데이터 */
export interface ExportSceneData {
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  panelLabel: string;
  panelLabelKo: string;
  sceneIndex: number;
  scene: Scene;
  duration?: number; // 예상 시간 (초)
}

/** 내보내기 입력 데이터 */
export interface ExportInput {
  title: string;
  author?: string;
  createdAt: Date;
  scenes: ExportSceneData[];
  visualDNA: VisualDNA;
  characters: Character[];
  prompts?: GeneratedPrompt[];
  promptConfig?: PromptConfig;
}

// ============================================
// 내보내기 결과
// ============================================

/** 내보내기 결과 */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  content: string | Blob;
  mimeType: string;
  size: number; // bytes
  metadata: {
    exportedAt: Date;
    scenesCount: number;
    language: string;
  };
  error?: string;
}

/** 일괄 내보내기 결과 */
export interface BulkExportResult {
  success: boolean;
  results: ExportResult[];
  totalSize: number;
  exportedAt: Date;
  errors: string[];
}

// ============================================
// 기본 설정
// ============================================

export const DEFAULT_NARRATION_CONFIG: NarrationConfig = {
  format: 'narration',
  language: 'ko',
  includeMetadata: true,
  includeTimestamps: false,
  includeSceneNumbers: true,
  includePanelLabels: true,
  pauseDuration: 2,
  speakerStyle: 'narrator'
};

export const DEFAULT_SCREENPLAY_CONFIG: ScreenplayConfig = {
  format: 'screenplay',
  language: 'ko',
  includeMetadata: true,
  includeTimestamps: false,
  includeActionLines: true,
  includeEmotions: true,
  includeCameraDirections: false,
  formatStyle: 'korean'
};

export const DEFAULT_SUBTITLE_CONFIG: SubtitleConfig = {
  format: 'srt',
  language: 'ko',
  includeMetadata: false,
  includeTimestamps: true,
  defaultDuration: 4,
  scenePadding: 1,
  maxCharsPerLine: 40,
  includeSceneLabels: true
};

export const DEFAULT_STORYBOARD_PDF_CONFIG: StoryboardPdfConfig = {
  format: 'storyboard-pdf',
  language: 'ko',
  includeMetadata: true,
  includeTimestamps: true,
  pageSize: 'A4',
  orientation: 'portrait',
  includePageNumbers: true,
  includeToc: false,
  colorScheme: 'color',
  panelsPerPage: 2,
  includeImagePlaceholders: true,
  includeSceneDescriptions: true,
  includeDialogue: true
};

export const DEFAULT_PROMPT_GUIDE_PDF_CONFIG: PromptGuidePdfConfig = {
  format: 'prompt-guide-pdf',
  language: 'both',
  includeMetadata: true,
  includeTimestamps: true,
  pageSize: 'A4',
  orientation: 'portrait',
  includePageNumbers: true,
  includeToc: true,
  colorScheme: 'color',
  targetServices: ['gemini', 'dalle', 'midjourney'],
  includeUsageInstructions: true,
  includeExamples: true,
  includeQRCodes: false
};

export const DEFAULT_CHARACTER_SHEET_PDF_CONFIG: CharacterSheetPdfConfig = {
  format: 'character-sheet-pdf',
  language: 'ko',
  includeMetadata: true,
  includeTimestamps: true,
  pageSize: 'A4',
  orientation: 'portrait',
  includePageNumbers: true,
  includeToc: false,
  colorScheme: 'color',
  includeVisualDNA: true,
  includeColorPalette: true,
  includeStyleGuide: true,
  includePromptTips: true
};

// ============================================
// 유틸리티
// ============================================

/** 형식별 기본 설정 가져오기 */
export const getDefaultConfig = (format: ExportFormat): ExportConfig => {
  switch (format) {
    case 'narration':
      return DEFAULT_NARRATION_CONFIG;
    case 'screenplay':
      return DEFAULT_SCREENPLAY_CONFIG;
    case 'srt':
    case 'vtt':
      return { ...DEFAULT_SUBTITLE_CONFIG, format };
    case 'storyboard-pdf':
      return DEFAULT_STORYBOARD_PDF_CONFIG;
    case 'prompt-guide-pdf':
      return DEFAULT_PROMPT_GUIDE_PDF_CONFIG;
    case 'character-sheet-pdf':
      return DEFAULT_CHARACTER_SHEET_PDF_CONFIG;
    default:
      return {
        format,
        language: 'ko',
        includeMetadata: true,
        includeTimestamps: true
      };
  }
};

/** 파일명 생성 */
export const generateExportFilename = (
  title: string,
  format: ExportFormat,
  timestamp?: Date
): string => {
  const info = ALL_EXPORT_FORMATS[format];
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_');
  const dateStr = (timestamp || new Date()).toISOString().split('T')[0];
  return `${sanitizedTitle}_${info.nameKo}_${dateStr}.${info.fileExtension}`;
};

/** 카테고리별 형식 목록 */
export const getFormatsByCategory = (category: ExportCategory): ExportFormatInfo[] => {
  return Object.values(ALL_EXPORT_FORMATS).filter(f => f.category === category);
};
