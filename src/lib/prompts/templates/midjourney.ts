/**
 * Midjourney 프롬프트 템플릿
 *
 * 특징:
 * - 영어 프롬프트 필수
 * - 파라미터 문법 지원 (--ar, --style, --v 등)
 * - 네거티브 프롬프트 지원 (--no)
 * - 콤마로 구분된 태그 형식 선호
 */

import type { PromptTemplate, PromptLanguage, PromptConfig, MidjourneyParams, AspectRatio } from '../types';
import type { VisualDNA, Character } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';
import {
  ART_STYLE_OPTIONS,
  COLOR_TONE_OPTIONS,
  LIGHTING_OPTIONS
} from '@/types/ai';
import { PANEL_LABELS_EN } from '../types';

/**
 * 캐릭터 태그 생성
 */
const formatCharacterTags = (char: Character): string => {
  const tags: string[] = [];

  if (char.physicalTraits) {
    tags.push(char.physicalTraits);
  }
  if (char.clothing) {
    tags.push(char.clothing);
  }
  if (char.distinctiveFeatures) {
    tags.push(char.distinctiveFeatures);
  }

  return tags.join(', ');
};

/**
 * 스타일 태그 생성
 */
const getStyleTags = (visualDNA: VisualDNA): string[] => {
  const tags: string[] = [];

  const artStyle = ART_STYLE_OPTIONS.find(s => s.value === visualDNA.artStyle);
  const colorTone = COLOR_TONE_OPTIONS.find(c => c.value === visualDNA.colorTone);
  const lighting = LIGHTING_OPTIONS.find(l => l.value === visualDNA.lighting);

  // 아트 스타일 매핑 (Midjourney 최적화)
  if (artStyle && artStyle.value !== 'custom') {
    const mjStyleMap: Record<string, string[]> = {
      ghibli: ['studio ghibli style', 'anime', 'hand-drawn animation', 'hayao miyazaki'],
      shinkai: ['makoto shinkai style', 'anime', 'detailed backgrounds', 'lens flare'],
      webtoon: ['korean webtoon style', 'manhwa', 'clean lineart', 'digital art'],
      realistic: ['photorealistic', 'hyperrealistic', 'detailed', '8k uhd'],
      watercolor: ['watercolor painting', 'soft edges', 'artistic', 'traditional media']
    };
    tags.push(...(mjStyleMap[artStyle.value] || [artStyle.prompt]));
  }

  // 색감
  if (colorTone) {
    const colorMap: Record<string, string[]> = {
      warm: ['warm colors', 'golden tones'],
      cool: ['cool colors', 'blue tones'],
      pastel: ['pastel colors', 'soft palette'],
      vibrant: ['vibrant colors', 'saturated'],
      monochrome: ['monochromatic', 'limited palette']
    };
    tags.push(...(colorMap[colorTone.value] || []));
  }

  // 조명
  if (lighting) {
    const lightMap: Record<string, string[]> = {
      daylight: ['natural lighting', 'daylight'],
      golden_hour: ['golden hour', 'sunset lighting', 'warm glow'],
      night: ['night scene', 'moonlight', 'atmospheric'],
      indoor: ['indoor lighting', 'soft ambient light'],
      dramatic: ['dramatic lighting', 'high contrast', 'cinematic']
    };
    tags.push(...(lightMap[lighting.value] || []));
  }

  // 커스텀 스타일
  if (visualDNA.customStylePrompt) {
    tags.push(visualDNA.customStylePrompt);
  }

  return tags;
};

/**
 * 기본 품질 태그
 */
const getQualityTags = (): string[] => [
  'high quality',
  'detailed',
  'professional illustration',
  'artstation'
];

/**
 * 기본 네거티브 태그
 */
const getDefaultNegativeTags = (): string[] => [
  'text',
  'watermark',
  'signature',
  'blurry',
  'low quality',
  'distorted',
  'deformed'
];

/**
 * 파라미터 문자열 생성
 */
const formatParameters = (params: MidjourneyParams): string => {
  const parts: string[] = [];

  if (params.ar) parts.push(`--ar ${params.ar}`);
  if (params.style) parts.push(`--style ${params.style}`);
  if (params.stylize !== undefined) parts.push(`--s ${params.stylize}`);
  if (params.chaos !== undefined) parts.push(`--c ${params.chaos}`);
  if (params.version) parts.push(`--v ${params.version}`);
  if (params.quality !== undefined) parts.push(`--q ${params.quality}`);
  if (params.tile) parts.push('--tile');
  if (params.weird !== undefined) parts.push(`--weird ${params.weird}`);
  if (params.niji) parts.push('--niji 6');
  if (params.no) parts.push(`--no ${params.no}`);

  return parts.join(' ');
};

/**
 * 화면 비율을 Midjourney 형식으로 변환
 */
const formatAspectRatio = (ratio?: AspectRatio): string => {
  if (!ratio) return '16:9';

  const ratioMap: Record<AspectRatio, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
    '21:9': '21:9'
  };

  return ratioMap[ratio] || '16:9';
};

/**
 * Midjourney 프롬프트 템플릿
 */
export const midjourneyTemplate: PromptTemplate = {
  service: 'midjourney',

  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    _language: PromptLanguage
  ): string {
    // Midjourney는 영어 전용
    const panelLabel = PANEL_LABELS_EN[panelKey] || { label: panelKey, subtitle: '' };
    const promptParts: string[] = [];

    // 1. 메인 주제/행동 (가장 중요)
    if (scene.action) {
      promptParts.push(scene.action);
    }

    // 2. 캐릭터 설명
    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0) {
      dnaCharacters.forEach(char => {
        const charTags = formatCharacterTags(char);
        if (charTags) {
          promptParts.push(charTags);
        }
      });
    } else if (scene.characters) {
      promptParts.push(scene.characters);
    }

    // 3. 배경/설정
    if (scene.setting) {
      promptParts.push(scene.setting);
    }

    // 4. 환경
    const envParts = [
      visualDNA.environment.location,
      visualDNA.environment.era,
      visualDNA.environment.mood
    ].filter(Boolean);
    if (envParts.length > 0) {
      promptParts.push(envParts.join(', '));
    }

    // 5. 분위기
    if (scene.mood) {
      promptParts.push(`${scene.mood} mood`);
    }

    // 6. 스타일 태그
    const styleTags = getStyleTags(visualDNA);
    promptParts.push(...styleTags);

    // 7. 품질 태그
    promptParts.push(...getQualityTags());

    // 8. 장면 컨텍스트 (맨 끝에)
    promptParts.push(`scene ${sceneIndex}`, panelLabel.subtitle.toLowerCase());

    return promptParts.join(', ');
  },

  generateNegativePrompt(
    _scene: Scene,
    _visualDNA: VisualDNA
  ): string {
    return getDefaultNegativeTags().join(', ');
  },

  generateParameters(config: PromptConfig): Record<string, string | number | boolean> {
    const params: MidjourneyParams = {
      ar: formatAspectRatio(config.aspectRatio),
      style: 'raw',  // 또는 'scenic'
      stylize: 100,
      version: '6.1',
      quality: 1
    };
    // MidjourneyParams를 Record<string, string | number | boolean>로 변환
    return params as Record<string, string | number | boolean>;
  },

  formatFinalPrompt(
    mainPrompt: string,
    negativePrompt?: string,
    parameters?: Record<string, string | number | boolean>
  ): string {
    const parts: string[] = [mainPrompt];

    // 파라미터 추가
    if (parameters) {
      const paramString = formatParameters(parameters as MidjourneyParams);
      if (paramString) {
        parts.push(paramString);
      }
    }

    // 네거티브 프롬프트는 --no 파라미터로 추가
    if (negativePrompt) {
      parts.push(`--no ${negativePrompt}`);
    }

    return parts.join(' ');
  }
};

export default midjourneyTemplate;
