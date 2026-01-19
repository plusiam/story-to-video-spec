/**
 * Pika Labs 프롬프트 템플릿
 *
 * 특징:
 * - 간결한 프롬프트 선호
 * - 영어 프롬프트
 * - 창의적 영상 생성
 * - 핵심 동작에 집중
 */

import type { PromptTemplate, PromptLanguage } from '../types';
import type { VisualDNA, Character } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';
import {
  ART_STYLE_OPTIONS,
  COLOR_TONE_OPTIONS
} from '@/types/ai';
import { PANEL_LABELS_EN } from '../types';

/**
 * 캐릭터 핵심만 추출
 */
const getCharacterEssence = (char: Character): string => {
  const parts: string[] = [];

  // 가장 눈에 띄는 특징만
  if (char.physicalTraits) {
    // 첫 번째 특징만 사용
    const firstTrait = char.physicalTraits.split(/[,，]/)[0].trim();
    if (firstTrait) parts.push(firstTrait);
  }
  if (char.clothing) {
    parts.push(char.clothing);
  }

  return parts.join(', ');
};

/**
 * 스타일 간단 요약
 */
const getStyleBrief = (visualDNA: VisualDNA): string => {
  const artStyle = ART_STYLE_OPTIONS.find(s => s.value === visualDNA.artStyle);
  const colorTone = COLOR_TONE_OPTIONS.find(c => c.value === visualDNA.colorTone);

  const parts: string[] = [];

  if (artStyle && artStyle.value !== 'custom') {
    const briefMap: Record<string, string> = {
      ghibli: 'anime style',
      shinkai: 'cinematic anime',
      webtoon: 'digital art',
      realistic: 'photorealistic',
      watercolor: 'painterly'
    };
    parts.push(briefMap[artStyle.value] || '');
  }

  if (colorTone) {
    const colorMap: Record<string, string> = {
      warm: 'warm',
      cool: 'cool',
      pastel: 'pastel',
      vibrant: 'vibrant',
      monochrome: 'monochrome'
    };
    parts.push(colorMap[colorTone.value] || '');
  }

  return parts.filter(Boolean).join(', ');
};

/**
 * Pika Labs 프롬프트 템플릿
 */
export const pikaTemplate: PromptTemplate = {
  service: 'pika',

  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    _language: PromptLanguage
  ): string {
    // Pika는 매우 간결한 프롬프트 선호 (1-2문장)
    const segments: string[] = [];

    // 1. 핵심 동작 (필수)
    if (scene.action) {
      segments.push(scene.action);
    }

    // 2. 캐릭터 (있으면)
    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0) {
      const charEssence = dnaCharacters.map(getCharacterEssence).filter(Boolean).join(' and ');
      if (charEssence) {
        segments.push(charEssence);
      }
    } else if (scene.characters) {
      // 간단히만
      segments.push(scene.characters.split(/[,，]/)[0].trim());
    }

    // 3. 배경 (간단히)
    if (scene.setting) {
      // 핵심 장소만
      const mainSetting = scene.setting.split(/[,，]/)[0].trim();
      segments.push(mainSetting);
    }

    // 4. 스타일 (간단히)
    const styleBrief = getStyleBrief(visualDNA);
    if (styleBrief) {
      segments.push(styleBrief);
    }

    // 5. 분위기 (선택)
    if (scene.mood) {
      segments.push(`${scene.mood} mood`);
    }

    // 간결한 문장으로 결합
    const prompt = segments.join(', ');

    // 장면 정보 (참고용 주석)
    const panelLabel = PANEL_LABELS_EN[panelKey] || { label: panelKey, subtitle: '' };

    return [
      `[${panelLabel.label} - Scene ${sceneIndex}]`,
      '',
      prompt,
      '',
      '// Tip: Pika works best with simple, clear descriptions'
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

export default pikaTemplate;
