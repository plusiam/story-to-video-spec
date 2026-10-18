/**
 * PDF 형식 내보내기 생성기
 * 스토리보드 PDF, 프롬프트 가이드 PDF, 캐릭터 시트 PDF
 */

import { jsPDF } from 'jspdf';
import type {
  ExportInput,
  ExportResult,
  StoryboardPdfConfig,
  PromptGuidePdfConfig,
  CharacterSheetPdfConfig
} from '../types';
import { ALL_EXPORT_FORMATS, generateExportFilename } from '../types';
import { PANEL_LABELS_KO, PANEL_LABELS_EN, ALL_AI_SERVICES } from '@/lib/prompts/types';
import type { GeneratedPrompt } from '@/lib/prompts/types';

// ============================================
// 한글 폰트 설정 (기본 내장 폰트 사용)
// ============================================

// jsPDF는 기본적으로 한글을 지원하지 않으므로
// 실제 프로덕션에서는 한글 폰트 파일을 추가해야 함
// 여기서는 기본 구조를 만들고, 폰트는 나중에 추가 가능하도록 함

const FONT_CONFIG = {
  default: 'helvetica',
  korean: 'helvetica', // TODO: 한글 폰트로 교체
  sizes: {
    title: 24,
    subtitle: 18,
    heading: 14,
    body: 11,
    small: 9,
    caption: 8
  },
  colors: {
    primary: '#1a1a2e',
    secondary: '#4a5568',
    accent: '#3182ce',
    light: '#718096',
    border: '#e2e8f0',
    background: '#f7fafc'
  }
};

// ============================================
// 스토리보드 PDF 생성
// ============================================

/**
 * 스토리보드 PDF 생성
 */
export const generateStoryboardPdf = async (
  input: ExportInput,
  config: StoryboardPdfConfig
): Promise<ExportResult> => {
  try {
    const doc = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: config.pageSize
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const isKorean = config.language === 'ko' || config.language === 'both';

    // 표지 페이지
    addCoverPage(doc, input, isKorean, pageWidth, pageHeight);

    // 장면 페이지들
    const panelsPerPage = config.panelsPerPage;
    const panelHeight = (pageHeight - margin * 2 - 20) / (panelsPerPage <= 2 ? panelsPerPage : panelsPerPage / 2);
    const panelWidth = panelsPerPage <= 2 ? contentWidth : contentWidth / 2;

    input.scenes.forEach((sceneData, index) => {
      // 새 페이지 필요 여부 확인
      if (index % panelsPerPage === 0) {
        doc.addPage();
      }

      const positionInPage = index % panelsPerPage;
      let x = margin;
      let y = margin + 10;

      if (panelsPerPage > 2) {
        x = margin + (positionInPage % 2) * panelWidth;
        y = margin + 10 + Math.floor(positionInPage / 2) * panelHeight;
      } else {
        y = margin + 10 + positionInPage * panelHeight;
      }

      addScenePanel(doc, sceneData, index, x, y, panelWidth - 5, panelHeight - 10, config, isKorean);
    });

    // 페이지 번호 추가
    if (config.includePageNumbers) {
      addPageNumbers(doc, pageWidth, pageHeight);
    }

    const pdfBlob = doc.output('blob');
    const formatInfo = ALL_EXPORT_FORMATS['storyboard-pdf'];

    return {
      success: true,
      format: 'storyboard-pdf',
      filename: generateExportFilename(input.title, 'storyboard-pdf'),
      content: pdfBlob,
      mimeType: formatInfo.mimeType,
      size: pdfBlob.size,
      metadata: {
        exportedAt: new Date(),
        scenesCount: input.scenes.length,
        language: config.language
      }
    };
  } catch (error) {
    return {
      success: false,
      format: 'storyboard-pdf',
      filename: '',
      content: '',
      mimeType: 'application/pdf',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : '스토리보드 PDF 생성 실패'
    };
  }
};

// ============================================
// 프롬프트 가이드 PDF 생성
// ============================================

/**
 * 프롬프트 가이드 PDF 생성
 */
export const generatePromptGuidePdf = async (
  input: ExportInput,
  config: PromptGuidePdfConfig
): Promise<ExportResult> => {
  try {
    const doc = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: config.pageSize
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const isKorean = config.language === 'ko' || config.language === 'both';

    // 표지
    addPromptGuideCover(doc, input, config, isKorean, pageWidth, pageHeight);

    // 목차 (선택적)
    if (config.includeToc) {
      doc.addPage();
      addTableOfContents(doc, input, config, isKorean, margin, pageWidth);
    }

    // AI 서비스별 프롬프트 섹션
    config.targetServices.forEach((serviceId) => {
      doc.addPage();

      const serviceInfo = ALL_AI_SERVICES[serviceId];
      const serviceName = isKorean ? serviceInfo.nameKo : serviceInfo.name;

      // 서비스 헤더
      doc.setFontSize(FONT_CONFIG.sizes.subtitle);
      doc.setTextColor(FONT_CONFIG.colors.accent);
      doc.text(`${serviceInfo.icon || ''} ${serviceName}`, margin, margin + 10);

      // 서비스 설명
      doc.setFontSize(FONT_CONFIG.sizes.small);
      doc.setTextColor(FONT_CONFIG.colors.secondary);
      const description = isKorean ? serviceInfo.descriptionKo : serviceInfo.description;
      doc.text(description, margin, margin + 18);

      // 사용법 (선택적)
      if (config.includeUsageInstructions) {
        doc.setFontSize(FONT_CONFIG.sizes.body);
        doc.setTextColor(FONT_CONFIG.colors.primary);
        const usageY = margin + 28;
        doc.text(isKorean ? '사용 방법:' : 'How to use:', margin, usageY);

        const usageText = getServiceUsageInstructions(serviceId, isKorean);
        doc.setFontSize(FONT_CONFIG.sizes.small);
        doc.setTextColor(FONT_CONFIG.colors.secondary);

        let currentY = usageY + 6;
        usageText.forEach(line => {
          doc.text(`• ${line}`, margin + 2, currentY);
          currentY += 5;
        });
      }

      // 장면별 프롬프트
      let promptY = margin + 60;
      const prompts = input.prompts?.filter(p => p.service === serviceId) || [];

      prompts.forEach((prompt, promptIndex) => {
        // 페이지 넘김 확인
        if (promptY > pageHeight - 50) {
          doc.addPage();
          promptY = margin + 10;
        }

        addPromptBlock(doc, prompt, promptIndex, margin, promptY, pageWidth - margin * 2, isKorean);
        promptY += 45;
      });

      // 프롬프트가 없으면 안내 메시지
      if (prompts.length === 0) {
        doc.setFontSize(FONT_CONFIG.sizes.body);
        doc.setTextColor(FONT_CONFIG.colors.light);
        doc.text(
          isKorean ? '이 서비스용 프롬프트가 아직 생성되지 않았습니다.' : 'No prompts generated for this service yet.',
          margin,
          margin + 60
        );
      }
    });

    // 페이지 번호
    if (config.includePageNumbers) {
      addPageNumbers(doc, pageWidth, pageHeight);
    }

    const pdfBlob = doc.output('blob');
    const formatInfo = ALL_EXPORT_FORMATS['prompt-guide-pdf'];

    return {
      success: true,
      format: 'prompt-guide-pdf',
      filename: generateExportFilename(input.title, 'prompt-guide-pdf'),
      content: pdfBlob,
      mimeType: formatInfo.mimeType,
      size: pdfBlob.size,
      metadata: {
        exportedAt: new Date(),
        scenesCount: input.scenes.length,
        language: config.language
      }
    };
  } catch (error) {
    return {
      success: false,
      format: 'prompt-guide-pdf',
      filename: '',
      content: '',
      mimeType: 'application/pdf',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : '프롬프트 가이드 PDF 생성 실패'
    };
  }
};

// ============================================
// 캐릭터 시트 PDF 생성
// ============================================

/**
 * 캐릭터 시트 PDF 생성
 */
export const generateCharacterSheetPdf = async (
  input: ExportInput,
  config: CharacterSheetPdfConfig
): Promise<ExportResult> => {
  try {
    const doc = new jsPDF({
      orientation: config.orientation,
      unit: 'mm',
      format: config.pageSize
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const isKorean = config.language === 'ko' || config.language === 'both';

    // 표지
    doc.setFontSize(FONT_CONFIG.sizes.title);
    doc.setTextColor(FONT_CONFIG.colors.primary);
    doc.text(isKorean ? '캐릭터 시트' : 'Character Sheet', pageWidth / 2, pageHeight / 3, { align: 'center' });

    doc.setFontSize(FONT_CONFIG.sizes.subtitle);
    doc.setTextColor(FONT_CONFIG.colors.secondary);
    doc.text(input.title, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });

    doc.setFontSize(FONT_CONFIG.sizes.body);
    doc.text(new Date().toLocaleDateString(isKorean ? 'ko-KR' : 'en-US'), pageWidth / 2, pageHeight / 3 + 25, { align: 'center' });

    // Visual DNA 섹션
    // VisualDNA 타입: characters, artStyle, colorTone, lighting, environment
    if (config.includeVisualDNA && input.visualDNA) {
      doc.addPage();

      doc.setFontSize(FONT_CONFIG.sizes.heading);
      doc.setTextColor(FONT_CONFIG.colors.accent);
      doc.text(isKorean ? 'Visual DNA' : 'Visual DNA', margin, margin + 10);

      let y = margin + 25;
      const visualDNA = input.visualDNA;

      if (visualDNA.artStyle) {
        doc.setFontSize(FONT_CONFIG.sizes.body);
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? '아트 스타일:' : 'Art Style:', margin, y);
        doc.setTextColor(FONT_CONFIG.colors.secondary);
        doc.text(visualDNA.artStyle, margin + 30, y);
        y += 8;
      }

      // environment.mood 사용
      if (visualDNA.environment?.mood) {
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? '분위기:' : 'Mood:', margin, y);
        doc.setTextColor(FONT_CONFIG.colors.secondary);
        doc.text(visualDNA.environment.mood, margin + 30, y);
        y += 8;
      }

      // characters 배열에서 디자인 정보 추출
      if (visualDNA.characters && visualDNA.characters.length > 0) {
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? '캐릭터 디자인:' : 'Character Design:', margin, y);
        doc.setTextColor(FONT_CONFIG.colors.secondary);
        const charDesign = visualDNA.characters.map(c => c.physicalTraits).filter(Boolean).join(', ');
        if (charDesign) {
          const lines = doc.splitTextToSize(charDesign, pageWidth - margin * 2 - 35);
          doc.text(lines, margin + 35, y);
          y += lines.length * 5 + 8;
        }
      }

      // 컬러 톤 (colorTone 사용)
      if (config.includeColorPalette && visualDNA.colorTone) {
        y += 10;
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? '색감:' : 'Color Tone:', margin, y);
        doc.setTextColor(FONT_CONFIG.colors.secondary);
        doc.text(visualDNA.colorTone, margin + 20, y);
      }
    }

    // 캐릭터 섹션
    // Character 타입: id, name, physicalTraits, clothing, distinctiveFeatures
    input.characters.forEach((character, charIndex) => {
      doc.addPage();

      // 캐릭터 헤더
      doc.setFontSize(FONT_CONFIG.sizes.heading);
      doc.setTextColor(FONT_CONFIG.colors.accent);
      doc.text(`${isKorean ? '캐릭터' : 'Character'} ${charIndex + 1}: ${character.name}`, margin, margin + 10);

      let y = margin + 25;

      // 캐릭터 외모 특징 (physicalTraits)
      if (character.physicalTraits) {
        doc.setFontSize(FONT_CONFIG.sizes.body);
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? '외모 특징:' : 'Physical Traits:', margin, y);
        y += 6;

        doc.setTextColor(FONT_CONFIG.colors.secondary);
        const descLines = doc.splitTextToSize(character.physicalTraits, pageWidth - margin * 2);
        doc.text(descLines, margin, y);
        y += descLines.length * 5 + 10;
      }

      // 복장 (clothing)
      if (character.clothing) {
        doc.setFontSize(FONT_CONFIG.sizes.body);
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? '복장:' : 'Clothing:', margin, y);
        y += 6;

        doc.setTextColor(FONT_CONFIG.colors.secondary);
        doc.text(character.clothing, margin, y);
        y += 10;
      }

      // 특이사항 (distinctiveFeatures)
      if (character.distinctiveFeatures) {
        doc.setFontSize(FONT_CONFIG.sizes.body);
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? '특이사항:' : 'Distinctive Features:', margin, y);
        y += 6;

        doc.setTextColor(FONT_CONFIG.colors.secondary);
        doc.text(character.distinctiveFeatures, margin, y);
        y += 10;
      }

      // 프롬프트 팁 (선택적)
      if (config.includePromptTips) {
        doc.setFontSize(FONT_CONFIG.sizes.body);
        doc.setTextColor(FONT_CONFIG.colors.primary);
        doc.text(isKorean ? 'AI 프롬프트 팁:' : 'AI Prompt Tips:', margin, y);
        y += 6;

        doc.setFontSize(FONT_CONFIG.sizes.small);
        doc.setTextColor(FONT_CONFIG.colors.secondary);
        const tips = generateCharacterPromptTips(character, isKorean);
        tips.forEach((tip: string) => {
          doc.text(`• ${tip}`, margin + 5, y);
          y += 5;
        });
      }

      // 이미지 자리 (플레이스홀더)
      const imageBoxY = y + 15;
      doc.setDrawColor(FONT_CONFIG.colors.border);
      doc.setFillColor(FONT_CONFIG.colors.background);
      doc.rect(margin, imageBoxY, 60, 80, 'FD');

      doc.setFontSize(FONT_CONFIG.sizes.caption);
      doc.setTextColor(FONT_CONFIG.colors.light);
      doc.text(
        isKorean ? '[캐릭터 이미지]' : '[Character Image]',
        margin + 30,
        imageBoxY + 40,
        { align: 'center' }
      );
    });

    // 페이지 번호
    if (config.includePageNumbers) {
      addPageNumbers(doc, pageWidth, pageHeight);
    }

    const pdfBlob = doc.output('blob');
    const formatInfo = ALL_EXPORT_FORMATS['character-sheet-pdf'];

    return {
      success: true,
      format: 'character-sheet-pdf',
      filename: generateExportFilename(input.title, 'character-sheet-pdf'),
      content: pdfBlob,
      mimeType: formatInfo.mimeType,
      size: pdfBlob.size,
      metadata: {
        exportedAt: new Date(),
        scenesCount: input.scenes.length,
        language: config.language
      }
    };
  } catch (error) {
    return {
      success: false,
      format: 'character-sheet-pdf',
      filename: '',
      content: '',
      mimeType: 'application/pdf',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : '캐릭터 시트 PDF 생성 실패'
    };
  }
};

// ============================================
// 헬퍼 함수들
// ============================================

/**
 * 표지 페이지 추가
 */
const addCoverPage = (
  doc: jsPDF,
  input: ExportInput,
  isKorean: boolean,
  pageWidth: number,
  pageHeight: number
) => {
  // 제목
  doc.setFontSize(FONT_CONFIG.sizes.title);
  doc.setTextColor(FONT_CONFIG.colors.primary);
  doc.text(input.title, pageWidth / 2, pageHeight / 3, { align: 'center' });

  // 부제목
  doc.setFontSize(FONT_CONFIG.sizes.subtitle);
  doc.setTextColor(FONT_CONFIG.colors.secondary);
  doc.text(
    isKorean ? '스토리보드' : 'Storyboard',
    pageWidth / 2,
    pageHeight / 3 + 15,
    { align: 'center' }
  );

  // 작성자
  if (input.author) {
    doc.setFontSize(FONT_CONFIG.sizes.body);
    doc.text(
      `${isKorean ? '작성자' : 'Author'}: ${input.author}`,
      pageWidth / 2,
      pageHeight / 3 + 30,
      { align: 'center' }
    );
  }

  // 날짜
  doc.setFontSize(FONT_CONFIG.sizes.small);
  doc.setTextColor(FONT_CONFIG.colors.light);
  doc.text(
    new Date().toLocaleDateString(isKorean ? 'ko-KR' : 'en-US'),
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );
};

/**
 * 장면 패널 추가
 */
const addScenePanel = (
  doc: jsPDF,
  sceneData: ExportInput['scenes'][0],
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  config: StoryboardPdfConfig,
  isKorean: boolean
) => {
  const scene = sceneData.scene;
  const panelLabel = isKorean
    ? PANEL_LABELS_KO[sceneData.panelKey]
    : PANEL_LABELS_EN[sceneData.panelKey];

  // 패널 테두리
  doc.setDrawColor(FONT_CONFIG.colors.border);
  doc.rect(x, y, width, height);

  // 패널 헤더
  doc.setFontSize(FONT_CONFIG.sizes.body);
  doc.setTextColor(FONT_CONFIG.colors.accent);
  doc.text(`${index + 1}. ${panelLabel?.label || ''} - ${panelLabel?.subtitle || ''}`, x + 3, y + 6);

  // 이미지 자리
  if (config.includeImagePlaceholders) {
    const imageHeight = height * 0.5;
    doc.setFillColor(FONT_CONFIG.colors.background);
    doc.rect(x + 3, y + 10, width - 6, imageHeight, 'F');

    doc.setFontSize(FONT_CONFIG.sizes.caption);
    doc.setTextColor(FONT_CONFIG.colors.light);
    doc.text(
      isKorean ? '[이미지 영역]' : '[Image Area]',
      x + width / 2,
      y + 10 + imageHeight / 2,
      { align: 'center' }
    );
  }

  // 장면 설명 - Scene 타입: action 필드 사용
  let textY = y + (config.includeImagePlaceholders ? height * 0.55 + 12 : 12);

  if (config.includeSceneDescriptions && scene.action) {
    doc.setFontSize(FONT_CONFIG.sizes.small);
    doc.setTextColor(FONT_CONFIG.colors.primary);
    const descLines = doc.splitTextToSize(scene.action, width - 6);
    doc.text(descLines.slice(0, 3), x + 3, textY); // 최대 3줄
    textY += Math.min(descLines.length, 3) * 4 + 4;
  }

  // 대사 - Scene 타입: characters 필드를 speaker로 사용
  if (config.includeDialogue && scene.dialogue) {
    doc.setFontSize(FONT_CONFIG.sizes.caption);
    doc.setTextColor(FONT_CONFIG.colors.secondary);
    const speaker = scene.characters || (isKorean ? '캐릭터' : 'Character');
    const dialogueText = `${speaker}: "${scene.dialogue}"`;
    const dialogueLines = doc.splitTextToSize(dialogueText, width - 6);
    doc.text(dialogueLines.slice(0, 2), x + 3, textY); // 최대 2줄
  }
};

/**
 * 페이지 번호 추가
 */
const addPageNumbers = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(FONT_CONFIG.sizes.caption);
    doc.setTextColor(FONT_CONFIG.colors.light);
    doc.text(`${i} / ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
};

/**
 * 프롬프트 가이드 표지
 */
const addPromptGuideCover = (
  doc: jsPDF,
  input: ExportInput,
  config: PromptGuidePdfConfig,
  isKorean: boolean,
  pageWidth: number,
  pageHeight: number
) => {
  doc.setFontSize(FONT_CONFIG.sizes.title);
  doc.setTextColor(FONT_CONFIG.colors.primary);
  doc.text(
    isKorean ? 'AI 프롬프트 가이드' : 'AI Prompt Guide',
    pageWidth / 2,
    pageHeight / 3,
    { align: 'center' }
  );

  doc.setFontSize(FONT_CONFIG.sizes.subtitle);
  doc.setTextColor(FONT_CONFIG.colors.secondary);
  doc.text(input.title, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });

  // 대상 서비스 목록
  doc.setFontSize(FONT_CONFIG.sizes.body);
  doc.setTextColor(FONT_CONFIG.colors.light);
  const serviceNames = config.targetServices.map(s => {
    const info = ALL_AI_SERVICES[s];
    return isKorean ? info.nameKo : info.name;
  });
  doc.text(serviceNames.join(' | '), pageWidth / 2, pageHeight / 3 + 30, { align: 'center' });

  doc.setFontSize(FONT_CONFIG.sizes.small);
  doc.text(
    new Date().toLocaleDateString(isKorean ? 'ko-KR' : 'en-US'),
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );
};

/**
 * 목차 추가
 */
const addTableOfContents = (
  doc: jsPDF,
  _input: ExportInput,
  config: PromptGuidePdfConfig,
  isKorean: boolean,
  margin: number,
  _pageWidth: number
) => {
  doc.setFontSize(FONT_CONFIG.sizes.heading);
  doc.setTextColor(FONT_CONFIG.colors.primary);
  doc.text(isKorean ? '목차' : 'Table of Contents', margin, margin + 10);

  let y = margin + 25;
  let pageNum = 3; // 표지, 목차 후 시작

  config.targetServices.forEach(serviceId => {
    const info = ALL_AI_SERVICES[serviceId];
    const name = isKorean ? info.nameKo : info.name;

    doc.setFontSize(FONT_CONFIG.sizes.body);
    doc.setTextColor(FONT_CONFIG.colors.secondary);
    doc.text(`${info.icon || ''} ${name}`, margin, y);
    doc.text(String(pageNum), 180, y);

    y += 8;
    pageNum++;
  });
};

/**
 * 프롬프트 블록 추가
 */
const addPromptBlock = (
  doc: jsPDF,
  prompt: GeneratedPrompt,
  _index: number,
  x: number,
  y: number,
  width: number,
  isKorean: boolean
) => {
  const panelLabel = isKorean
    ? PANEL_LABELS_KO[prompt.panelKey]
    : PANEL_LABELS_EN[prompt.panelKey];

  // 헤더
  doc.setFontSize(FONT_CONFIG.sizes.body);
  doc.setTextColor(FONT_CONFIG.colors.primary);
  doc.text(`${panelLabel?.label || prompt.panelKey} - ${prompt.sceneTitle}`, x, y);

  // 프롬프트 내용 (박스)
  doc.setDrawColor(FONT_CONFIG.colors.border);
  doc.setFillColor(FONT_CONFIG.colors.background);
  doc.rect(x, y + 3, width, 30, 'FD');

  doc.setFontSize(FONT_CONFIG.sizes.small);
  doc.setTextColor(FONT_CONFIG.colors.secondary);
  const promptLines = doc.splitTextToSize(prompt.mainPrompt, width - 6);
  doc.text(promptLines.slice(0, 5), x + 3, y + 9); // 최대 5줄
};

/**
 * 서비스별 사용법 안내
 */
const getServiceUsageInstructions = (serviceId: string, isKorean: boolean): string[] => {
  const instructions: Record<string, { ko: string[]; en: string[] }> = {
    gemini: {
      ko: [
        'Google AI Studio (ai.google.dev)에 접속',
        'Gemini 모델 선택 후 프롬프트 입력',
        '이미지 생성 옵션 활성화'
      ],
      en: [
        'Go to Google AI Studio (ai.google.dev)',
        'Select Gemini model and enter prompt',
        'Enable image generation option'
      ]
    },
    dalle: {
      ko: [
        'ChatGPT Plus에서 DALL-E 3 사용',
        '또는 OpenAI API playground 이용',
        '프롬프트는 영어로 입력 권장'
      ],
      en: [
        'Use DALL-E 3 in ChatGPT Plus',
        'Or use OpenAI API playground',
        'English prompts recommended'
      ]
    },
    midjourney: {
      ko: [
        'Discord에서 Midjourney 봇 사용',
        '/imagine 명령어와 함께 프롬프트 입력',
        '파라미터는 프롬프트 끝에 추가'
      ],
      en: [
        'Use Midjourney bot in Discord',
        'Enter prompt with /imagine command',
        'Add parameters at the end of prompt'
      ]
    }
  };

  const defaultInstructions = {
    ko: ['해당 서비스 공식 사이트 방문', '프롬프트 입력 후 생성'],
    en: ['Visit the official service website', 'Enter prompt and generate']
  };

  return (instructions[serviceId] || defaultInstructions)[isKorean ? 'ko' : 'en'];
};

/**
 * 캐릭터 프롬프트 팁 생성
 * Character 타입: id, name, physicalTraits, clothing, distinctiveFeatures
 */
const generateCharacterPromptTips = (
  character: ExportInput['characters'][0],
  isKorean: boolean
): string[] => {
  const tips: string[] = [];

  if (isKorean) {
    tips.push(`캐릭터 이름을 프롬프트에 포함: "${character.name}"`);
    if (character.physicalTraits) {
      tips.push('외모 특징을 상세히 묘사하여 일관성 유지');
    }
    if (character.distinctiveFeatures) {
      tips.push(`특이사항 반영: ${character.distinctiveFeatures}`);
    }
    tips.push('매 장면에서 동일한 의상/스타일 설명 유지');
  } else {
    tips.push(`Include character name in prompt: "${character.name}"`);
    if (character.physicalTraits) {
      tips.push('Describe appearance details for consistency');
    }
    if (character.distinctiveFeatures) {
      tips.push(`Reflect distinctive features: ${character.distinctiveFeatures}`);
    }
    tips.push('Maintain same outfit/style description across scenes');
  }

  return tips;
};
