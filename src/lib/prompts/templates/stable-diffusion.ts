/**
 * Stable Diffusion 프롬프트 템플릿
 *
 * 특징:
 * - 태그 기반 프롬프트
 * - 네거티브 프롬프트 필수
 * - 품질 태그 중요
 * - 가중치 문법 지원 (tag:1.2)
 */

import type { PromptTemplate, PromptLanguage } from '../types';
import type { VisualDNA, Character } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';
import {
  ART_STYLE_OPTIONS,
  COLOR_TONE_OPTIONS,
  LIGHTING_OPTIONS
} from '@/types/ai';

/**
 * 캐릭터 태그 생성
 */
const formatCharacterTags = (char: Character): string[] => {
  const tags: string[] = [];

  if (char.physicalTraits) {
    // 외모 특성을 개별 태그로 분리
    const traits = char.physicalTraits.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    tags.push(...traits);
  }
  if (char.clothing) {
    tags.push(char.clothing);
  }
  if (char.distinctiveFeatures) {
    tags.push(char.distinctiveFeatures);
  }

  return tags;
};

/**
 * 스타일 태그 생성 (SD 최적화)
 */
const getStyleTags = (visualDNA: VisualDNA): string[] => {
  const tags: string[] = [];

  const artStyle = ART_STYLE_OPTIONS.find(s => s.value === visualDNA.artStyle);
  const colorTone = COLOR_TONE_OPTIONS.find(c => c.value === visualDNA.colorTone);
  const lighting = LIGHTING_OPTIONS.find(l => l.value === visualDNA.lighting);

  // 아트 스타일 (SD 태그)
  if (artStyle && artStyle.value !== 'custom') {
    const sdStyleMap: Record<string, string[]> = {
      ghibli: ['ghibli style', 'anime', 'hand drawn', 'soft shading'],
      shinkai: ['makoto shinkai', 'anime', 'detailed background', 'lens flare', 'volumetric lighting'],
      webtoon: ['webtoon', 'manhwa', 'korean comic', 'clean lines', 'flat colors'],
      realistic: ['realistic', 'photorealistic', 'hyperdetailed', '8k', 'ray tracing'],
      watercolor: ['watercolor', 'traditional media', 'soft edges', 'paint splatter']
    };
    tags.push(...(sdStyleMap[artStyle.value] || []));
  }

  // 색감
  if (colorTone) {
    const colorMap: Record<string, string[]> = {
      warm: ['warm colors', 'warm lighting', 'cozy'],
      cool: ['cool colors', 'blue tones', 'cold atmosphere'],
      pastel: ['pastel colors', 'soft palette', 'light colors'],
      vibrant: ['vibrant colors', 'saturated', 'colorful'],
      monochrome: ['monochrome', 'grayscale', 'limited palette']
    };
    tags.push(...(colorMap[colorTone.value] || []));
  }

  // 조명
  if (lighting) {
    const lightMap: Record<string, string[]> = {
      daylight: ['natural lighting', 'daylight', 'sun rays'],
      golden_hour: ['golden hour', 'sunset', 'warm sunlight', 'long shadows'],
      night: ['night', 'moonlight', 'starry sky', 'dark atmosphere'],
      indoor: ['indoor', 'ambient lighting', 'soft light'],
      dramatic: ['dramatic lighting', 'high contrast', 'rim lighting', 'cinematic lighting']
    };
    tags.push(...(lightMap[lighting.value] || []));
  }

  // 커스텀 스타일
  if (visualDNA.customStylePrompt) {
    const customTags = visualDNA.customStylePrompt.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    tags.push(...customTags);
  }

  return tags;
};

/**
 * 품질 태그 (SD에서 매우 중요)
 */
const getQualityTags = (): string[] => [
  'masterpiece',
  'best quality',
  'highly detailed',
  'sharp focus',
  'professional',
  '8k'
];

/**
 * 기본 네거티브 프롬프트 태그
 */
const getDefaultNegativeTags = (): string[] => [
  'lowres',
  'bad anatomy',
  'bad hands',
  'text',
  'error',
  'missing fingers',
  'extra digit',
  'fewer digits',
  'cropped',
  'worst quality',
  'low quality',
  'normal quality',
  'jpeg artifacts',
  'signature',
  'watermark',
  'username',
  'blurry',
  'artist name',
  'deformed',
  'disfigured',
  'mutation',
  'mutated',
  'ugly'
];

/**
 * Stable Diffusion 프롬프트 템플릿
 */
export const stableDiffusionTemplate: PromptTemplate = {
  service: 'stable-diffusion',

  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    _panelKey: string,
    _sceneIndex: number,
    _language: PromptLanguage
  ): string {
    const tags: string[] = [];

    // 1. 품질 태그 (맨 앞에 위치)
    tags.push(...getQualityTags());

    // 2. 메인 행동/상황 (가중치 높임)
    if (scene.action) {
      tags.push(`(${scene.action}:1.2)`);
    }

    // 3. 캐릭터
    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0) {
      // 캐릭터 수
      if (dnaCharacters.length === 1) {
        tags.push('1girl' ); // 또는 1boy - 실제로는 캐릭터 성별에 따라
      } else if (dnaCharacters.length === 2) {
        tags.push('2girls'); // 또는 1girl 1boy 등
      } else {
        tags.push('multiple characters');
      }

      // 각 캐릭터 태그
      dnaCharacters.forEach(char => {
        const charTags = formatCharacterTags(char);
        tags.push(...charTags);
      });
    } else if (scene.characters) {
      tags.push(scene.characters);
    }

    // 4. 배경/설정
    if (scene.setting) {
      const settingTags = scene.setting.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      tags.push(...settingTags);
    }

    // 5. 환경
    if (visualDNA.environment.location) {
      tags.push(visualDNA.environment.location);
    }
    if (visualDNA.environment.era) {
      tags.push(visualDNA.environment.era);
    }
    if (visualDNA.environment.mood) {
      tags.push(`${visualDNA.environment.mood} atmosphere`);
    }

    // 6. 분위기
    if (scene.mood) {
      tags.push(scene.mood);
    }

    // 7. 스타일 태그
    tags.push(...getStyleTags(visualDNA));

    // 중복 제거 및 정리
    const uniqueTags = [...new Set(tags.map(t => t.toLowerCase()))];

    return uniqueTags.join(', ');
  },

  generateNegativePrompt(
    _scene: Scene,
    _visualDNA: VisualDNA
  ): string {
    return getDefaultNegativeTags().join(', ');
  },

  formatFinalPrompt(
    mainPrompt: string,
    negativePrompt?: string,
    _parameters?: Record<string, string | number | boolean>
  ): string {
    const parts: string[] = [];

    // 포지티브 프롬프트
    parts.push('【Positive Prompt】');
    parts.push(mainPrompt);
    parts.push('');

    // 네거티브 프롬프트 (SD에서 필수)
    parts.push('【Negative Prompt】');
    parts.push(negativePrompt || getDefaultNegativeTags().join(', '));

    return parts.join('\n');
  }
};

export default stableDiffusionTemplate;
