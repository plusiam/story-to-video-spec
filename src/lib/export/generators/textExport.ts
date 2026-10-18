/**
 * 텍스트 형식 내보내기 생성기
 * 나레이션, 시나리오, 스토리보드 텍스트
 */

import type {
  ExportInput,
  ExportSceneData,
  NarrationConfig,
  ScreenplayConfig,
  ExportResult,
  ExportConfig
} from '../types';
import { ALL_EXPORT_FORMATS, generateExportFilename } from '../types';
import { PANEL_LABELS_KO, PANEL_LABELS_EN } from '@/lib/prompts/types';

// ============================================
// 나레이션 스크립트 생성
// ============================================

/**
 * 나레이션 스크립트 생성
 */
export const generateNarrationScript = (
  input: ExportInput,
  config: NarrationConfig
): ExportResult => {
  try {
    const lines: string[] = [];
    const isKorean = config.language === 'ko' || config.language === 'both';
    // isEnglish removed - unused

    // 헤더
    if (config.includeMetadata) {
      lines.push('=' .repeat(60));
      lines.push(isKorean ? `제목: ${input.title}` : `Title: ${input.title}`);
      if (input.author) {
        lines.push(isKorean ? `작성자: ${input.author}` : `Author: ${input.author}`);
      }
      lines.push(isKorean ? `생성일: ${new Date().toLocaleDateString('ko-KR')}` : `Created: ${new Date().toLocaleDateString('en-US')}`);
      lines.push('=' .repeat(60));
      lines.push('');
    }

    // 장면별 나레이션
    input.scenes.forEach((sceneData, index) => {
      const panelLabel = isKorean
        ? PANEL_LABELS_KO[sceneData.panelKey]
        : PANEL_LABELS_EN[sceneData.panelKey];

      // 장면 번호/라벨
      if (config.includeSceneNumbers || config.includePanelLabels) {
        const sceneHeader: string[] = [];
        if (config.includeSceneNumbers) {
          sceneHeader.push(`[${isKorean ? '장면' : 'Scene'} ${index + 1}]`);
        }
        if (config.includePanelLabels && panelLabel) {
          sceneHeader.push(`${panelLabel.label} - ${panelLabel.subtitle}`);
        }
        lines.push(sceneHeader.join(' '));
        lines.push('-'.repeat(40));
      }

      // 나레이션 본문
      const narration = generateSceneNarration(sceneData, config);
      lines.push(narration);
      lines.push('');

      // 일시정지 표시
      if (config.pauseDuration > 0 && index < input.scenes.length - 1) {
        lines.push(`[${isKorean ? `${config.pauseDuration}초 일시정지` : `${config.pauseDuration}s pause`}]`);
        lines.push('');
      }
    });

    // 끝맺음
    if (config.includeMetadata) {
      lines.push('=' .repeat(60));
      lines.push(isKorean ? '--- 끝 ---' : '--- END ---');
    }

    const content = lines.join('\n');
    const formatInfo = ALL_EXPORT_FORMATS.narration;

    return {
      success: true,
      format: 'narration',
      filename: generateExportFilename(input.title, 'narration'),
      content,
      mimeType: formatInfo.mimeType,
      size: new Blob([content]).size,
      metadata: {
        exportedAt: new Date(),
        scenesCount: input.scenes.length,
        language: config.language
      }
    };
  } catch (error) {
    return {
      success: false,
      format: 'narration',
      filename: '',
      content: '',
      mimeType: 'text/plain',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : '나레이션 생성 실패'
    };
  }
};

/**
 * 장면별 나레이션 생성
 * Scene 타입 필드: setting, characters, action, dialogue, mood, narration
 */
const generateSceneNarration = (
  sceneData: ExportSceneData,
  config: NarrationConfig
): string => {
  const scene = sceneData.scene;
  const parts: string[] = [];

  // 나레이션이 있으면 우선 사용
  if (scene.narration) {
    parts.push(scene.narration);
  }
  // 없으면 action(행동/사건)을 사용
  else if (scene.action) {
    parts.push(scene.action);
  }

  // 대화가 있으면 추가 (스타일에 따라)
  if (scene.dialogue) {
    if (config.speakerStyle === 'character') {
      // 캐릭터 이름과 함께
      const speaker = scene.characters || '캐릭터';
      parts.push(`${speaker}: "${scene.dialogue}"`);
    } else if (config.speakerStyle === 'mixed') {
      // 나레이션 + 대화
      parts.push(`이때, ${scene.characters || '그'}가 말했다.`);
      parts.push(`"${scene.dialogue}"`);
    } else {
      // narrator - 대화만
      parts.push(`"${scene.dialogue}"`);
    }
  }

  return parts.join('\n');
};

// ============================================
// 시나리오 대본 생성
// ============================================

/**
 * 시나리오 대본 생성
 */
export const generateScreenplay = (
  input: ExportInput,
  config: ScreenplayConfig
): ExportResult => {
  try {
    const lines: string[] = [];
    const isKorean = config.language === 'ko' || config.language === 'both';

    // 제목 페이지
    if (config.includeMetadata) {
      lines.push('');
      lines.push('');
      lines.push('');
      lines.push(centerText(input.title.toUpperCase(), 60));
      lines.push('');
      if (input.author) {
        lines.push(centerText(isKorean ? `작성: ${input.author}` : `Written by: ${input.author}`, 60));
      }
      lines.push(centerText(new Date().toLocaleDateString(isKorean ? 'ko-KR' : 'en-US'), 60));
      lines.push('');
      lines.push('');
      lines.push('=' .repeat(60));
      lines.push('');
    }

    // 장면별 대본
    input.scenes.forEach((sceneData, index) => {
      const sceneLines = generateSceneScreenplay(sceneData, index + 1, config);
      lines.push(...sceneLines);
      lines.push('');
    });

    // 끝
    lines.push('');
    lines.push(centerText(isKorean ? '끝' : 'THE END', 60));

    const content = lines.join('\n');
    const formatInfo = ALL_EXPORT_FORMATS.screenplay;

    return {
      success: true,
      format: 'screenplay',
      filename: generateExportFilename(input.title, 'screenplay'),
      content,
      mimeType: formatInfo.mimeType,
      size: new Blob([content]).size,
      metadata: {
        exportedAt: new Date(),
        scenesCount: input.scenes.length,
        language: config.language
      }
    };
  } catch (error) {
    return {
      success: false,
      format: 'screenplay',
      filename: '',
      content: '',
      mimeType: 'text/plain',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : '시나리오 생성 실패'
    };
  }
};

/**
 * 장면별 시나리오 생성
 * Scene 타입 필드: setting, characters, action, dialogue, mood, cameraAngle
 */
const generateSceneScreenplay = (
  sceneData: ExportSceneData,
  sceneNumber: number,
  config: ScreenplayConfig
): string[] => {
  const lines: string[] = [];
  const scene = sceneData.scene;
  const isKorean = config.language === 'ko' || config.language === 'both';
  const panelLabel = isKorean
    ? PANEL_LABELS_KO[sceneData.panelKey]
    : PANEL_LABELS_EN[sceneData.panelKey];

  // 슬러그라인 (장면 헤더) - setting을 location으로 사용
  const location = scene.setting || (isKorean ? '장소 미정' : 'LOCATION TBD');
  const timeOfDay = isKorean ? '낮' : 'DAY'; // Scene에 timeOfDay 없음

  if (config.formatStyle === 'standard') {
    // 표준 영문 형식
    lines.push(`INT./EXT. ${location.toUpperCase()} - ${timeOfDay.toUpperCase()}`);
  } else if (config.formatStyle === 'korean') {
    // 한국어 형식
    lines.push(`#${sceneNumber}. ${location} (${timeOfDay}) - ${panelLabel?.label || ''}`);
  } else {
    // 간단 형식
    lines.push(`[${sceneNumber}] ${location}`);
  }
  lines.push('');

  // 지문 (액션 라인) - action을 description으로 사용
  if (config.includeActionLines && scene.action) {
    const actionText = formatActionLine(scene.action, config.formatStyle);
    lines.push(actionText);
    lines.push('');
  }

  // 카메라 방향
  if (config.includeCameraDirections && scene.cameraAngle) {
    const cameraText = isKorean
      ? `(카메라: ${scene.cameraAngle})`
      : `(CAMERA: ${scene.cameraAngle})`;
    lines.push(cameraText);
    lines.push('');
  }

  // 대사
  if (scene.dialogue) {
    // characters를 characterName으로 사용
    const character = scene.characters?.toUpperCase() || (isKorean ? '캐릭터' : 'CHARACTER');

    // 캐릭터 이름
    lines.push(centerText(character, 40));

    // 감정/톤 (괄호) - mood를 emotion으로 사용
    if (config.includeEmotions && scene.mood) {
      lines.push(centerText(`(${scene.mood})`, 40));
    }

    // 대사
    const dialogueLines = wrapText(scene.dialogue, 35);
    dialogueLines.forEach(line => {
      lines.push(centerText(line, 40));
    });
    lines.push('');
  }

  return lines;
};

// ============================================
// 스토리보드 텍스트 생성
// ============================================

/**
 * 스토리보드 텍스트 생성
 */
export const generateStoryboardText = (
  input: ExportInput,
  config: ExportConfig
): ExportResult => {
  try {
    const lines: string[] = [];
    const isKorean = config.language === 'ko' || config.language === 'both';

    // 헤더
    lines.push('╔' + '═'.repeat(58) + '╗');
    lines.push('║' + centerText(isKorean ? '스토리보드' : 'STORYBOARD', 58) + '║');
    lines.push('╠' + '═'.repeat(58) + '╣');
    lines.push('║' + padRight(` ${isKorean ? '제목' : 'Title'}: ${input.title}`, 58) + '║');
    if (input.author) {
      lines.push('║' + padRight(` ${isKorean ? '작성자' : 'Author'}: ${input.author}`, 58) + '║');
    }
    lines.push('║' + padRight(` ${isKorean ? '총 장면' : 'Total Scenes'}: ${input.scenes.length}`, 58) + '║');
    lines.push('╚' + '═'.repeat(58) + '╝');
    lines.push('');

    // 장면별 스토리보드
    input.scenes.forEach((sceneData, index) => {
      const panelLabel = isKorean
        ? PANEL_LABELS_KO[sceneData.panelKey]
        : PANEL_LABELS_EN[sceneData.panelKey];

      lines.push('┌' + '─'.repeat(58) + '┐');
      lines.push('│' + padRight(` ${isKorean ? '장면' : 'Scene'} ${index + 1}: ${panelLabel?.label || ''} (${panelLabel?.subtitle || ''})`, 58) + '│');
      lines.push('├' + '─'.repeat(58) + '┤');

      // 이미지 자리
      lines.push('│' + centerText('[이미지 영역 / Image Area]', 58) + '│');
      lines.push('│' + ' '.repeat(58) + '│');
      lines.push('│' + ' '.repeat(58) + '│');
      lines.push('│' + ' '.repeat(58) + '│');
      lines.push('├' + '─'.repeat(58) + '┤');

      // 장면 정보 - Scene 타입 필드 사용
      const scene = sceneData.scene;

      // setting을 장소로 사용
      if (scene.setting) {
        lines.push('│' + padRight(` ${isKorean ? '장소' : 'Location'}: ${scene.setting}`, 58) + '│');
      }

      // 등장인물
      if (scene.characters) {
        lines.push('│' + padRight(` ${isKorean ? '등장인물' : 'Characters'}: ${scene.characters}`, 58) + '│');
      }

      lines.push('├' + '─'.repeat(58) + '┤');

      // 행동/사건을 설명으로 사용
      lines.push('│' + padRight(` ${isKorean ? '행동/사건' : 'Action'}:`, 58) + '│');
      if (scene.action) {
        const descLines = wrapText(scene.action, 56);
        descLines.forEach(line => {
          lines.push('│' + padRight(` ${line}`, 58) + '│');
        });
      }

      // 대사
      if (scene.dialogue) {
        lines.push('├' + '─'.repeat(58) + '┤');
        lines.push('│' + padRight(` ${isKorean ? '대사' : 'Dialogue'}:`, 58) + '│');
        const speaker = scene.characters || (isKorean ? '캐릭터' : 'Character');
        lines.push('│' + padRight(` ${speaker}: "${scene.dialogue}"`, 58) + '│');
      }

      // 분위기
      if (scene.mood) {
        lines.push('├' + '─'.repeat(58) + '┤');
        lines.push('│' + padRight(` ${isKorean ? '분위기' : 'Mood'}: ${scene.mood}`, 58) + '│');
      }

      // 카메라
      if (scene.cameraAngle) {
        lines.push('├' + '─'.repeat(58) + '┤');
        lines.push('│' + padRight(` ${isKorean ? '카메라' : 'Camera'}: ${scene.cameraAngle}`, 58) + '│');
      }

      lines.push('└' + '─'.repeat(58) + '┘');
      lines.push('');
    });

    const content = lines.join('\n');
    const formatInfo = ALL_EXPORT_FORMATS['storyboard-text'];

    return {
      success: true,
      format: 'storyboard-text',
      filename: generateExportFilename(input.title, 'storyboard-text'),
      content,
      mimeType: formatInfo.mimeType,
      size: new Blob([content]).size,
      metadata: {
        exportedAt: new Date(),
        scenesCount: input.scenes.length,
        language: config.language
      }
    };
  } catch (error) {
    return {
      success: false,
      format: 'storyboard-text',
      filename: '',
      content: '',
      mimeType: 'text/plain',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : '스토리보드 생성 실패'
    };
  }
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 텍스트 중앙 정렬
 */
const centerText = (text: string, width: number): string => {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text + ' '.repeat(width - padding - text.length);
};

/**
 * 텍스트 오른쪽 패딩
 */
const padRight = (text: string, width: number): string => {
  if (text.length >= width) return text.substring(0, width);
  return text + ' '.repeat(width - text.length);
};

/**
 * 텍스트 줄바꿈
 */
const wrapText = (text: string, maxWidth: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
};

/**
 * 지문 포맷팅
 */
const formatActionLine = (text: string, style: string): string => {
  if (style === 'standard') {
    // 표준 형식: 모두 대문자
    return text.toUpperCase();
  }
  return text;
};
