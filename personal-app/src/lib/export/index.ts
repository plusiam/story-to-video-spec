/**
 * 내보내기 모듈 진입점
 */

// 타입 내보내기
export * from './types';

// 텍스트 생성기
export {
  generateNarrationScript,
  generateScreenplay,
  generateStoryboardText
} from './generators/textExport';

// 자막 생성기
export {
  generateSrtSubtitles,
  generateVttSubtitles,
  generateSubtitles
} from './generators/subtitleExport';

// JSON 생성기
export {
  generateGoogleVidsJson,
  generateStoryboardJson
} from './generators/jsonExport';

// PDF 생성기
export {
  generateStoryboardPdf,
  generatePromptGuidePdf,
  generateCharacterSheetPdf
} from './generators/pdfExport';

// ============================================
// 통합 내보내기 함수
// ============================================

import type {
  ExportFormat,
  ExportInput,
  ExportConfig,
  ExportResult,
  NarrationConfig,
  ScreenplayConfig,
  SubtitleConfig,
  StoryboardPdfConfig,
  PromptGuidePdfConfig,
  CharacterSheetPdfConfig
} from './types';
import { getDefaultConfig } from './types';
import { generateNarrationScript, generateScreenplay, generateStoryboardText } from './generators/textExport';
import { generateSubtitles } from './generators/subtitleExport';
import { generateGoogleVidsJson, generateStoryboardJson } from './generators/jsonExport';
import { generateStoryboardPdf, generatePromptGuidePdf, generateCharacterSheetPdf } from './generators/pdfExport';

/**
 * 형식에 따라 적절한 내보내기 함수 호출
 */
export const exportDocument = async (
  input: ExportInput,
  format: ExportFormat,
  config?: Partial<ExportConfig>
): Promise<ExportResult> => {
  const defaultConfig = getDefaultConfig(format);
  const mergedConfig = { ...defaultConfig, ...config } as ExportConfig;

  switch (format) {
    case 'narration':
      return generateNarrationScript(input, mergedConfig as NarrationConfig);

    case 'screenplay':
      return generateScreenplay(input, mergedConfig as ScreenplayConfig);

    case 'storyboard-text':
      return generateStoryboardText(input, mergedConfig);

    case 'srt':
    case 'vtt':
      return generateSubtitles(input, { ...mergedConfig, format } as SubtitleConfig);

    case 'google-vids-json':
      return generateGoogleVidsJson(input, mergedConfig);

    case 'storyboard-json':
      return generateStoryboardJson(input, mergedConfig);

    case 'storyboard-pdf':
      return await generateStoryboardPdf(input, mergedConfig as StoryboardPdfConfig);

    case 'prompt-guide-pdf':
      return await generatePromptGuidePdf(input, mergedConfig as PromptGuidePdfConfig);

    case 'character-sheet-pdf':
      return await generateCharacterSheetPdf(input, mergedConfig as CharacterSheetPdfConfig);

    default:
      return {
        success: false,
        format,
        filename: '',
        content: '',
        mimeType: '',
        size: 0,
        metadata: {
          exportedAt: new Date(),
          scenesCount: 0,
          language: 'ko'
        },
        error: `지원하지 않는 형식: ${format}`
      };
  }
};

/**
 * 여러 형식으로 일괄 내보내기
 */
export const exportMultiple = async (
  input: ExportInput,
  formats: ExportFormat[],
  configs?: Record<ExportFormat, Partial<ExportConfig>>
): Promise<ExportResult[]> => {
  const results = await Promise.all(
    formats.map(format =>
      exportDocument(input, format, configs?.[format])
    )
  );
  return results;
};
