/**
 * OpenAI DALL-E 3 프롬프트 템플릿
 *
 * 특징:
 * - 영어 프롬프트 권장
 * - 최대 4000자
 * - 구조화된 설명 선호
 * - 텍스트 이해력 우수
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
 * 캐릭터 설명 생성 (영어, DALL-E 최적화)
 */
const formatCharacter = (char: Character): string => {
  const parts: string[] = [];

  if (char.name) {
    parts.push(char.name);
  }
  if (char.physicalTraits) {
    parts.push(char.physicalTraits);
  }
  if (char.clothing) {
    parts.push(`dressed in ${char.clothing}`);
  }
  if (char.distinctiveFeatures) {
    parts.push(`with ${char.distinctiveFeatures}`);
  }

  return parts.join(', ');
};

/**
 * 스타일 문자열 생성
 */
const getStyleString = (visualDNA: VisualDNA): string => {
  const artStyle = ART_STYLE_OPTIONS.find(s => s.value === visualDNA.artStyle);
  const colorTone = COLOR_TONE_OPTIONS.find(c => c.value === visualDNA.colorTone);
  const lighting = LIGHTING_OPTIONS.find(l => l.value === visualDNA.lighting);

  const parts: string[] = [];

  if (artStyle && artStyle.value !== 'custom') {
    parts.push(artStyle.prompt);
  }
  if (colorTone) {
    parts.push(colorTone.prompt);
  }
  if (lighting) {
    parts.push(lighting.prompt);
  }
  if (visualDNA.customStylePrompt) {
    parts.push(visualDNA.customStylePrompt);
  }

  return parts.join('. ');
};

/**
 * 환경 설명 생성
 */
const getEnvironmentString = (visualDNA: VisualDNA): string => {
  const parts = [
    visualDNA.environment.location,
    visualDNA.environment.era,
    visualDNA.environment.mood
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : '';
};

/**
 * DALL-E 3 프롬프트 템플릿
 */
export const dalleTemplate: PromptTemplate = {
  service: 'dalle',

  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    language: PromptLanguage
  ): string {
    // DALL-E는 영어 프롬프트가 더 효과적
    const panelLabel = PANEL_LABELS_EN[panelKey] || { label: panelKey, subtitle: '' };
    const sections: string[] = [];

    // 1. 장면 컨텍스트
    sections.push(`Scene ${sceneIndex} (${panelLabel.label} - ${panelLabel.subtitle}):`);

    // 2. 메인 설명 - 단일 문단으로 구성
    const descriptionParts: string[] = [];

    // 배경/설정
    if (scene.setting) {
      descriptionParts.push(scene.setting);
    }

    // 환경
    const envString = getEnvironmentString(visualDNA);
    if (envString) {
      descriptionParts.push(`in ${envString}`);
    }

    // 캐릭터
    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0) {
      const charDescs = dnaCharacters.map(formatCharacter);
      descriptionParts.push(`featuring ${charDescs.join(' and ')}`);
    } else if (scene.characters) {
      descriptionParts.push(`featuring ${scene.characters}`);
    }

    // 행동
    if (scene.action) {
      descriptionParts.push(scene.action);
    }

    // 분위기
    if (scene.mood) {
      descriptionParts.push(`with a ${scene.mood} atmosphere`);
    }

    sections.push(descriptionParts.join('. ') + '.');

    // 3. 스타일 지정
    const styleString = getStyleString(visualDNA);
    if (styleString) {
      sections.push('');
      sections.push(`Art style: ${styleString}`);
    }

    // 4. 품질 및 일관성 지침
    sections.push('');
    sections.push('Technical requirements: High quality digital illustration, consistent character design, professional composition, no text or watermarks.');

    // 5. 한글 원문 참조 (language가 both인 경우)
    if (language === 'both' || language === 'ko') {
      sections.push('');
      sections.push('---');
      sections.push('Korean reference:');
      if (scene.setting) sections.push(`배경: ${scene.setting}`);
      if (scene.action) sections.push(`행동: ${scene.action}`);
      if (scene.mood) sections.push(`분위기: ${scene.mood}`);
    }

    return sections.join('\n');
  },

  formatFinalPrompt(
    mainPrompt: string,
    _negativePrompt?: string,
    _parameters?: Record<string, string | number | boolean>
  ): string {
    // DALL-E 3는 네거티브 프롬프트나 특별한 파라미터 없음
    // 단, 프롬프트 길이 제한 확인
    const maxLength = 4000;
    if (mainPrompt.length > maxLength) {
      console.warn(`DALL-E prompt exceeds ${maxLength} chars, truncating...`);
      return mainPrompt.substring(0, maxLength - 3) + '...';
    }
    return mainPrompt;
  }
};

export default dalleTemplate;
