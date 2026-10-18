/**
 * Runway Gen-3 프롬프트 템플릿
 *
 * 특징:
 * - 짧은 클립 생성 (4~16초)
 * - 영어 프롬프트
 * - 단일 동작/장면에 집중
 * - 명확하고 구체적인 묘사
 */

import type { PromptTemplate, PromptLanguage } from '../types';
import type { VisualDNA, Character } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';
import {
  ART_STYLE_OPTIONS,
  COLOR_TONE_OPTIONS,
  LIGHTING_OPTIONS
} from '@/types/ai';
import { PANEL_LABELS_EN } from '../types';

/**
 * 캐릭터 간단 설명
 */
const formatCharacterBrief = (char: Character): string => {
  const parts: string[] = [];

  if (char.physicalTraits) {
    parts.push(char.physicalTraits);
  }
  if (char.clothing) {
    parts.push(`in ${char.clothing}`);
  }

  return parts.join(' ');
};

/**
 * 스타일 키워드 생성
 */
const getStyleKeywords = (visualDNA: VisualDNA): string[] => {
  const keywords: string[] = [];

  const artStyle = ART_STYLE_OPTIONS.find(s => s.value === visualDNA.artStyle);
  const colorTone = COLOR_TONE_OPTIONS.find(c => c.value === visualDNA.colorTone);
  const lighting = LIGHTING_OPTIONS.find(l => l.value === visualDNA.lighting);

  if (artStyle && artStyle.value !== 'custom') {
    const styleMap: Record<string, string[]> = {
      ghibli: ['anime style', 'hand-drawn animation'],
      shinkai: ['cinematic anime', 'detailed backgrounds'],
      webtoon: ['digital animation', 'vibrant colors'],
      realistic: ['photorealistic', 'cinematic', '4K'],
      watercolor: ['artistic', 'painterly style']
    };
    keywords.push(...(styleMap[artStyle.value] || []));
  }

  if (colorTone) {
    const colorMap: Record<string, string> = {
      warm: 'warm tones',
      cool: 'cool tones',
      pastel: 'pastel colors',
      vibrant: 'vibrant colors',
      monochrome: 'monochromatic'
    };
    keywords.push(colorMap[colorTone.value] || '');
  }

  if (lighting) {
    const lightMap: Record<string, string> = {
      daylight: 'natural daylight',
      golden_hour: 'golden hour lighting',
      night: 'night scene',
      indoor: 'indoor lighting',
      dramatic: 'dramatic lighting'
    };
    keywords.push(lightMap[lighting.value] || '');
  }

  return keywords.filter(Boolean);
};

/**
 * Runway Gen-3 프롬프트 템플릿
 */
export const runwayTemplate: PromptTemplate = {
  service: 'runway',

  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    _language: PromptLanguage
  ): string {
    // Runway는 간결하고 명확한 프롬프트 선호
    const parts: string[] = [];

    // 1. 주요 동작 (가장 중요 - 첫 문장)
    if (scene.action) {
      parts.push(scene.action);
    }

    // 2. 캐릭터 (간단히)
    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0) {
      const charDesc = dnaCharacters.map(formatCharacterBrief).filter(Boolean).join(' and ');
      if (charDesc) {
        parts.push(charDesc);
      }
    } else if (scene.characters) {
      parts.push(scene.characters);
    }

    // 3. 배경 (간단히)
    if (scene.setting) {
      parts.push(`in ${scene.setting}`);
    }

    // 4. 카메라 움직임
    if (scene.cameraAngle) {
      parts.push(scene.cameraAngle);
    } else {
      // 기본 카메라 제안
      const cameraMap: Record<string, string> = {
        ki: 'wide establishing shot',
        seung: 'medium shot',
        jeon: 'close-up',
        gyeol: 'wide shot, slowly pulling back'
      };
      parts.push(cameraMap[panelKey] || 'medium shot');
    }

    // 5. 분위기
    if (scene.mood) {
      parts.push(`${scene.mood} atmosphere`);
    }

    // 6. 스타일 키워드
    const styleKeywords = getStyleKeywords(visualDNA);
    if (styleKeywords.length > 0) {
      parts.push(styleKeywords.join(', '));
    }

    // 7. 품질 태그
    parts.push('smooth motion, high quality, cinematic');

    // 하나의 문단으로 결합
    const mainPrompt = parts.join('. ').replace(/\.\./g, '.');

    // 장면 정보 주석 추가
    const panelLabel = PANEL_LABELS_EN[panelKey] || { label: panelKey, subtitle: '' };

    return [
      `// Scene ${sceneIndex} (${panelLabel.label})`,
      '',
      mainPrompt
    ].join('\n');
  },

  formatFinalPrompt(
    mainPrompt: string,
    _negativePrompt?: string,
    _parameters?: Record<string, string | number | boolean>
  ): string {
    return mainPrompt;
  }
};

export default runwayTemplate;
