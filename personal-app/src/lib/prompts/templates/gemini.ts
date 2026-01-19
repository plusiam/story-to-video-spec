/**
 * Google Gemini (Imagen 3) 프롬프트 템플릿
 *
 * 특징:
 * - 한글 프롬프트 지원 우수
 * - 자연어 형태의 프롬프트 선호
 * - 무료 티어 제공
 */

import type { PromptTemplate, PromptLanguage } from '../types';
import type { VisualDNA, Character } from '@/types/ai';
import type { Scene } from '@/components/story/sceneConfig';
import {
  ART_STYLE_OPTIONS,
  COLOR_TONE_OPTIONS,
  LIGHTING_OPTIONS
} from '@/types/ai';
import { PANEL_LABELS_KO, PANEL_LABELS_EN } from '../types';

/**
 * 캐릭터 설명 생성 (한글)
 */
const formatCharacterKo = (char: Character): string => {
  const parts = [char.name];

  if (char.physicalTraits) {
    parts.push(char.physicalTraits);
  }
  if (char.clothing) {
    parts.push(`${char.clothing}을 입고 있는`);
  }
  if (char.distinctiveFeatures) {
    parts.push(`(${char.distinctiveFeatures})`);
  }

  return parts.join(', ');
};

/**
 * 캐릭터 설명 생성 (영어)
 */
const formatCharacterEn = (char: Character): string => {
  const parts = [char.name];

  if (char.physicalTraits) {
    parts.push(char.physicalTraits);
  }
  if (char.clothing) {
    parts.push(`wearing ${char.clothing}`);
  }
  if (char.distinctiveFeatures) {
    parts.push(`(${char.distinctiveFeatures})`);
  }

  return parts.join(', ');
};

/**
 * 스타일 프롬프트 생성 (한글)
 */
const getStylePromptKo = (visualDNA: VisualDNA): string => {
  const artStyle = ART_STYLE_OPTIONS.find(s => s.value === visualDNA.artStyle);
  const colorTone = COLOR_TONE_OPTIONS.find(c => c.value === visualDNA.colorTone);
  const lighting = LIGHTING_OPTIONS.find(l => l.value === visualDNA.lighting);

  const parts: string[] = [];

  // 아트 스타일
  if (artStyle && artStyle.value !== 'custom') {
    const styleMap: Record<string, string> = {
      ghibli: '지브리 스튜디오 애니메이션 스타일, 부드러운 손그림 느낌',
      shinkai: '신카이 마코토 스타일, 섬세한 배경, 드라마틱한 조명',
      webtoon: '한국 웹툰 스타일, 깔끔한 선, 선명한 색상',
      realistic: '사실적인 디지털 아트, 세밀한 묘사',
      watercolor: '수채화 스타일, 부드러운 경계, 자연스러운 색감'
    };
    parts.push(styleMap[artStyle.value] || artStyle.label);
  }

  // 색감
  if (colorTone) {
    const toneMap: Record<string, string> = {
      warm: '따뜻한 색감',
      cool: '차가운 색감',
      pastel: '파스텔 톤',
      vibrant: '선명하고 생동감 있는 색상',
      monochrome: '모노톤'
    };
    parts.push(toneMap[colorTone.value] || colorTone.label);
  }

  // 조명
  if (lighting) {
    const lightMap: Record<string, string> = {
      daylight: '밝은 낮 햇살',
      golden_hour: '황금빛 석양',
      night: '밤, 달빛 또는 별빛',
      indoor: '부드러운 실내 조명',
      dramatic: '드라마틱한 조명, 강한 명암'
    };
    parts.push(lightMap[lighting.value] || lighting.label);
  }

  // 커스텀 스타일
  if (visualDNA.customStylePrompt) {
    parts.push(visualDNA.customStylePrompt);
  }

  return parts.join(', ');
};

/**
 * 스타일 프롬프트 생성 (영어)
 */
const getStylePromptEn = (visualDNA: VisualDNA): string => {
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

  return parts.join(', ');
};

/**
 * 한글 프롬프트 생성
 */
const generateKoreanPrompt = (
  scene: Scene,
  visualDNA: VisualDNA,
  panelKey: string,
  sceneIndex: number
): string => {
  const panelLabel = PANEL_LABELS_KO[panelKey] || { label: panelKey, subtitle: '' };
  const lines: string[] = [];

  // 장면 정보
  lines.push(`[${panelLabel.label} - 장면 ${sceneIndex}]`);
  lines.push('');

  // 배경 설명
  if (scene.setting) {
    lines.push(`배경: ${scene.setting}`);
  }

  // 환경 정보
  if (visualDNA.environment.location || visualDNA.environment.era) {
    const envParts = [
      visualDNA.environment.location,
      visualDNA.environment.era,
      visualDNA.environment.mood
    ].filter(Boolean);
    if (envParts.length > 0) {
      lines.push(`환경: ${envParts.join(', ')}`);
    }
  }

  // 등장인물
  if (scene.characters || visualDNA.characters.length > 0) {
    lines.push('');
    lines.push('등장인물:');

    // 비주얼 DNA의 캐릭터 정보
    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0) {
      dnaCharacters.forEach(char => {
        lines.push(`- ${formatCharacterKo(char)}`);
      });
    } else if (scene.characters) {
      lines.push(`- ${scene.characters}`);
    }
  }

  // 행동/상황
  lines.push('');
  if (scene.action) {
    lines.push(`상황: ${scene.action}`);
  }

  // 대사 (있는 경우)
  if (scene.dialogue) {
    lines.push(`대사: "${scene.dialogue}"`);
  }

  // 분위기
  if (scene.mood) {
    lines.push(`분위기: ${scene.mood}`);
  }

  // 스타일 지정
  lines.push('');
  lines.push('스타일:');
  lines.push(getStylePromptKo(visualDNA));

  // 일관성 유지 지침
  lines.push('');
  lines.push('※ 캐릭터의 외모와 의상을 모든 장면에서 일관되게 유지해주세요.');

  return lines.join('\n');
};

/**
 * 영어 프롬프트 생성
 */
const generateEnglishPrompt = (
  scene: Scene,
  visualDNA: VisualDNA,
  panelKey: string,
  sceneIndex: number
): string => {
  const panelLabel = PANEL_LABELS_EN[panelKey] || { label: panelKey, subtitle: '' };
  const lines: string[] = [];

  // Scene info
  lines.push(`[${panelLabel.label} - Scene ${sceneIndex}]`);
  lines.push('');

  // Setting
  if (scene.setting) {
    lines.push(`Setting: ${scene.setting}`);
  }

  // Environment
  if (visualDNA.environment.location || visualDNA.environment.era) {
    const envParts = [
      visualDNA.environment.location,
      visualDNA.environment.era,
      visualDNA.environment.mood
    ].filter(Boolean);
    if (envParts.length > 0) {
      lines.push(`Environment: ${envParts.join(', ')}`);
    }
  }

  // Characters
  if (scene.characters || visualDNA.characters.length > 0) {
    lines.push('');
    lines.push('Characters:');

    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0) {
      dnaCharacters.forEach(char => {
        lines.push(`- ${formatCharacterEn(char)}`);
      });
    } else if (scene.characters) {
      lines.push(`- ${scene.characters}`);
    }
  }

  // Action
  lines.push('');
  if (scene.action) {
    lines.push(`Action: ${scene.action}`);
  }

  // Dialogue
  if (scene.dialogue) {
    lines.push(`Dialogue: "${scene.dialogue}"`);
  }

  // Mood
  if (scene.mood) {
    lines.push(`Mood: ${scene.mood}`);
  }

  // Style
  lines.push('');
  lines.push('Style:');
  lines.push(getStylePromptEn(visualDNA));

  // Consistency
  lines.push('');
  lines.push('Note: Maintain consistent character appearance and clothing across all scenes.');

  return lines.join('\n');
};

/**
 * Gemini 프롬프트 템플릿
 */
export const geminiTemplate: PromptTemplate = {
  service: 'gemini',

  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    language: PromptLanguage
  ): string {
    if (language === 'en') {
      return generateEnglishPrompt(scene, visualDNA, panelKey, sceneIndex);
    }
    return generateKoreanPrompt(scene, visualDNA, panelKey, sceneIndex);
  },

  formatFinalPrompt(
    mainPrompt: string,
    _negativePrompt?: string,
    _parameters?: Record<string, string | number | boolean>
  ): string {
    // Gemini는 추가 파라미터 없이 자연어 프롬프트만 사용
    return mainPrompt;
  }
};

export default geminiTemplate;
