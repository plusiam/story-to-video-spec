/**
 * Google Vids 프롬프트/스토리보드 템플릿
 *
 * 특징:
 * - 한글 지원
 * - 스토리보드 JSON 형식
 * - 나레이션, 자막 포함
 * - 장면 전환 효과 지정 가능
 */

import type { PromptTemplate, PromptLanguage } from '../types';
import type { VisualDNA } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';
import { PANEL_LABELS_KO, PANEL_LABELS_EN } from '../types';

/**
 * 장면 지속 시간 추정 (초)
 */
const estimateDuration = (scene: Scene): number => {
  // 나레이션/대사 기반 시간 추정
  const text = scene.narration || scene.subtitle || scene.dialogue || scene.action || '';
  const chars = text.replace(/\s+/g, '').length;

  if (!chars) return 4; // 기본 4초

  // 한글 기준 분당 약 150자 읽기 속도
  const seconds = Math.ceil(chars / 2.5); // 초당 약 2.5자
  return Math.max(4, Math.min(seconds, 15)); // 4~15초 범위
};

/**
 * 장면 전환 효과 추천
 */
const suggestTransition = (panelKey: string, isLast: boolean): string => {
  if (isLast) return 'fade_out';

  switch (panelKey) {
    case 'ki':
      return 'fade_in';
    case 'seung':
      return 'dissolve';
    case 'jeon':
      return 'cut'; // 긴장감을 위해 컷 전환
    case 'gyeol':
      return 'dissolve';
    default:
      return 'dissolve';
  }
};

/**
 * Google Vids 스토리보드 항목 인터페이스
 */
export interface VidsStoryboardItem {
  sceneNumber: number;
  stage: string;
  stageName: string;
  panelKey: string;
  narration: string;
  subtitle: string;
  onScreenText: string;
  durationSec: number;
  transition: string;
  cameraAngle: string;
  shotType: string;
  sfx: string;
  music: string;
  setting: string;
  characters: string;
  action: string;
  mood: string;
  visualDescription: string;
}

/**
 * Google Vids 스토리보드 생성
 */
export const generateVidsStoryboard = (
  scenes: Array<{ panelKey: string; scene: Scene; index: number }>,
  _visualDNA: VisualDNA,
  title: string
): {
  title: string;
  exportedAt: string;
  format: string;
  totalDuration: number;
  scenes: VidsStoryboardItem[];
} => {
  let totalDuration = 0;

  const storyboardScenes = scenes.map((item, idx) => {
    const { panelKey, scene } = item;
    const labels = PANEL_LABELS_KO[panelKey] || { label: panelKey, subtitle: '' };
    const duration = scene.durationSec || estimateDuration(scene);
    totalDuration += duration;

    const narration = (scene.narration || scene.dialogue || scene.action || '').trim();
    const subtitle = (scene.subtitle || narration).trim();

    // 비주얼 설명 생성
    const visualParts: string[] = [];
    if (scene.setting) visualParts.push(scene.setting);
    if (scene.characters) visualParts.push(`등장인물: ${scene.characters}`);
    if (scene.action) visualParts.push(scene.action);
    if (scene.mood) visualParts.push(`분위기: ${scene.mood}`);

    return {
      sceneNumber: idx + 1,
      stage: labels.label,
      stageName: labels.subtitle,
      panelKey,
      narration,
      subtitle,
      onScreenText: scene.onScreenText || '',
      durationSec: duration,
      transition: suggestTransition(panelKey, idx === scenes.length - 1),
      cameraAngle: scene.cameraAngle || '',
      shotType: scene.shotType || '',
      sfx: scene.sfx || '',
      music: scene.music || '',
      setting: scene.setting || '',
      characters: scene.characters || '',
      action: scene.action || '',
      mood: scene.mood || '',
      visualDescription: visualParts.join('. ')
    };
  });

  return {
    title,
    exportedAt: new Date().toISOString(),
    format: 'google-vids',
    totalDuration,
    scenes: storyboardScenes
  };
};

/**
 * Google Vids 프롬프트 템플릿
 */
export const googleVidsTemplate: PromptTemplate = {
  service: 'google-vids',

  generateMainPrompt(
    scene: Scene,
    _visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    language: PromptLanguage
  ): string {
    const isKorean = language === 'ko' || language === 'both';
    const labels = isKorean ? PANEL_LABELS_KO[panelKey] : PANEL_LABELS_EN[panelKey];
    const lines: string[] = [];

    // 한글 프롬프트
    if (isKorean) {
      lines.push(`━━━ ${labels?.label || panelKey} - 장면 ${sceneIndex} ━━━`);
      lines.push('');

      // 시각적 설명
      lines.push('【장면 설명】');
      if (scene.setting) {
        lines.push(`배경: ${scene.setting}`);
      }
      if (scene.characters) {
        lines.push(`등장인물: ${scene.characters}`);
      }
      if (scene.action) {
        lines.push(`상황: ${scene.action}`);
      }
      if (scene.mood) {
        lines.push(`분위기: ${scene.mood}`);
      }
      lines.push('');

      // 나레이션
      if (scene.narration || scene.dialogue) {
        lines.push('【나레이션】');
        lines.push(scene.narration || scene.dialogue || '');
        lines.push('');
      }

      // 자막
      if (scene.subtitle) {
        lines.push('【자막】');
        lines.push(scene.subtitle);
        lines.push('');
      }

      // 기술적 정보
      lines.push('【제작 정보】');
      lines.push(`예상 길이: ${scene.durationSec || estimateDuration(scene)}초`);
      if (scene.cameraAngle) {
        lines.push(`카메라: ${scene.cameraAngle}`);
      }
      if (scene.sfx) {
        lines.push(`효과음: ${scene.sfx}`);
      }
      if (scene.music) {
        lines.push(`배경음악: ${scene.music}`);
      }
    }

    // 영어 프롬프트 (language === 'en' 또는 'both')
    if (language === 'en' || language === 'both') {
      if (language === 'both') {
        lines.push('');
        lines.push('--- English Version ---');
        lines.push('');
      }

      const enLabels = PANEL_LABELS_EN[panelKey];
      lines.push(`━━━ ${enLabels?.label || panelKey} - Scene ${sceneIndex} ━━━`);
      lines.push('');

      lines.push('[VISUAL DESCRIPTION]');
      if (scene.setting) {
        lines.push(`Setting: ${scene.setting}`);
      }
      if (scene.characters) {
        lines.push(`Characters: ${scene.characters}`);
      }
      if (scene.action) {
        lines.push(`Action: ${scene.action}`);
      }
      if (scene.mood) {
        lines.push(`Mood: ${scene.mood}`);
      }
      lines.push('');

      if (scene.narration || scene.dialogue) {
        lines.push('[NARRATION]');
        lines.push(scene.narration || scene.dialogue || '');
        lines.push('');
      }

      lines.push('[PRODUCTION INFO]');
      lines.push(`Duration: ${scene.durationSec || estimateDuration(scene)} seconds`);
    }

    return lines.join('\n');
  },

  formatFinalPrompt(
    mainPrompt: string,
    _negativePrompt?: string,
    _parameters?: Record<string, string | number | boolean>
  ): string {
    return mainPrompt;
  }
};

export default googleVidsTemplate;
