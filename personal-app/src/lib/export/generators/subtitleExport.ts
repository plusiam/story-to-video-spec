/**
 * 자막 형식 내보내기 생성기
 * SRT, VTT 자막 파일
 */

import type {
  ExportInput,
  ExportSceneData,
  SubtitleConfig,
  ExportResult
} from '../types';
import { ALL_EXPORT_FORMATS, generateExportFilename } from '../types';
import { PANEL_LABELS_KO, PANEL_LABELS_EN } from '@/lib/prompts/types';

// ============================================
// SRT 자막 생성
// ============================================

/**
 * SRT 자막 생성
 */
export const generateSrtSubtitles = (
  input: ExportInput,
  config: SubtitleConfig
): ExportResult => {
  try {
    const lines: string[] = [];
    let currentTime = 0; // 초 단위
    let subtitleIndex = 1;

    input.scenes.forEach((sceneData, sceneIndex) => {
      const subtitles = generateSceneSubtitles(sceneData, config);

      subtitles.forEach(subtitle => {
        const startTime = currentTime;
        const endTime = currentTime + subtitle.duration;

        // SRT 형식
        lines.push(String(subtitleIndex));
        lines.push(`${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}`);
        lines.push(subtitle.text);
        lines.push('');

        currentTime = endTime + 0.5; // 자막 간 간격
        subtitleIndex++;
      });

      // 장면 간 패딩
      if (sceneIndex < input.scenes.length - 1) {
        currentTime += config.scenePadding;
      }
    });

    const content = lines.join('\n');
    const formatInfo = ALL_EXPORT_FORMATS.srt;

    return {
      success: true,
      format: 'srt',
      filename: generateExportFilename(input.title, 'srt'),
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
      format: 'srt',
      filename: '',
      content: '',
      mimeType: 'text/plain',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : 'SRT 생성 실패'
    };
  }
};

/**
 * SRT 시간 형식 변환 (00:00:00,000)
 */
const formatSrtTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(ms, 3)}`;
};

// ============================================
// VTT 자막 생성
// ============================================

/**
 * WebVTT 자막 생성
 */
export const generateVttSubtitles = (
  input: ExportInput,
  config: SubtitleConfig
): ExportResult => {
  try {
    const lines: string[] = [];
    let currentTime = 0; // 초 단위

    // VTT 헤더
    lines.push('WEBVTT');
    lines.push('');

    // 메타데이터 (선택적)
    if (config.includeMetadata) {
      lines.push(`NOTE`);
      lines.push(`Title: ${input.title}`);
      lines.push(`Created: ${new Date().toISOString()}`);
      lines.push(`Scenes: ${input.scenes.length}`);
      lines.push('');
    }

    input.scenes.forEach((sceneData, sceneIndex) => {
      const isKorean = config.language === 'ko' || config.language === 'both';
      const panelLabel = isKorean
        ? PANEL_LABELS_KO[sceneData.panelKey]
        : PANEL_LABELS_EN[sceneData.panelKey];

      // 장면 라벨 (선택적)
      if (config.includeSceneLabels) {
        const startTime = currentTime;
        const endTime = currentTime + 2; // 라벨 표시 시간

        lines.push(`scene-${sceneIndex + 1}`);
        lines.push(`${formatVttTime(startTime)} --> ${formatVttTime(endTime)}`);
        lines.push(`<c.scene-label>[${panelLabel?.label || `Scene ${sceneIndex + 1}`}]</c>`);
        lines.push('');

        currentTime = endTime + 0.5;
      }

      // 장면 자막
      const subtitles = generateSceneSubtitles(sceneData, config);

      subtitles.forEach((subtitle, subIndex) => {
        const startTime = currentTime;
        const endTime = currentTime + subtitle.duration;

        // 큐 식별자 (선택적)
        lines.push(`${sceneIndex + 1}-${subIndex + 1}`);
        lines.push(`${formatVttTime(startTime)} --> ${formatVttTime(endTime)}`);

        // 스타일 클래스 적용 (옵션)
        if (subtitle.isDialogue) {
          lines.push(`<v ${subtitle.speaker || 'Character'}>${subtitle.text}</v>`);
        } else {
          lines.push(subtitle.text);
        }
        lines.push('');

        currentTime = endTime + 0.5;
      });

      // 장면 간 패딩
      if (sceneIndex < input.scenes.length - 1) {
        currentTime += config.scenePadding;
      }
    });

    const content = lines.join('\n');
    const formatInfo = ALL_EXPORT_FORMATS.vtt;

    return {
      success: true,
      format: 'vtt',
      filename: generateExportFilename(input.title, 'vtt'),
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
      format: 'vtt',
      filename: '',
      content: '',
      mimeType: 'text/vtt',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : 'VTT 생성 실패'
    };
  }
};

/**
 * VTT 시간 형식 변환 (00:00:00.000)
 */
const formatVttTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}.${pad(ms, 3)}`;
};

// ============================================
// 공통 유틸리티
// ============================================

interface SubtitleEntry {
  text: string;
  duration: number;
  isDialogue: boolean;
  speaker?: string;
}

/**
 * 장면별 자막 생성
 * Scene 타입 필드: setting, characters, action, dialogue, mood, narration, subtitle
 */
const generateSceneSubtitles = (
  sceneData: ExportSceneData,
  config: SubtitleConfig
): SubtitleEntry[] => {
  const subtitles: SubtitleEntry[] = [];
  const scene = sceneData.scene;

  // 자막이 있으면 우선 사용, 없으면 나레이션, 없으면 action
  const textContent = scene.subtitle || scene.narration || scene.action;
  if (textContent) {
    const lines = splitIntoLines(textContent, config.maxCharsPerLine);
    lines.forEach(line => {
      subtitles.push({
        text: line,
        duration: calculateDuration(line, config.defaultDuration),
        isDialogue: false
      });
    });
  }

  // 대화
  if (scene.dialogue) {
    const lines = splitIntoLines(scene.dialogue, config.maxCharsPerLine);
    lines.forEach(line => {
      subtitles.push({
        text: line,
        duration: calculateDuration(line, config.defaultDuration),
        isDialogue: true,
        speaker: scene.characters // characters를 speaker로 사용
      });
    });
  }

  return subtitles;
};

/**
 * 텍스트를 지정 길이로 분할
 */
const splitIntoLines = (text: string, maxChars: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
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
 * 텍스트 길이 기반 표시 시간 계산
 */
const calculateDuration = (text: string, defaultDuration: number): number => {
  // 한글 기준: 초당 약 4-5글자 읽기
  // 최소 2초, 최대 8초
  const charCount = text.length;
  const calculatedDuration = charCount / 4;
  return Math.max(2, Math.min(8, calculatedDuration, defaultDuration));
};

/**
 * 숫자 패딩
 */
const pad = (num: number, size: number): string => {
  let s = String(num);
  while (s.length < size) s = '0' + s;
  return s;
};

// ============================================
// 통합 내보내기 함수
// ============================================

/**
 * 자막 형식에 따라 적절한 생성기 호출
 */
export const generateSubtitles = (
  input: ExportInput,
  config: SubtitleConfig
): ExportResult => {
  if (config.format === 'vtt') {
    return generateVttSubtitles(input, config);
  }
  return generateSrtSubtitles(input, config);
};
