/**
 * OpenAI Sora 프롬프트 템플릿
 *
 * 특징:
 * - 영어 프롬프트 필수
 * - 동작과 움직임 묘사 중요
 * - 카메라 움직임 지정 가능
 * - 시간적 흐름 표현
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
 * 캐릭터 설명 생성 (영상용 - 동적 묘사 포함)
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
    parts.push(`wearing ${char.clothing}`);
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

  // 영상 스타일 매핑
  if (artStyle && artStyle.value !== 'custom') {
    const videoStyleMap: Record<string, string> = {
      ghibli: 'Studio Ghibli animation style, hand-drawn aesthetic',
      shinkai: 'Makoto Shinkai cinematic style, detailed backgrounds, beautiful lighting',
      webtoon: 'Korean animation style, clean and vibrant',
      realistic: 'photorealistic, cinematic quality, 4K resolution',
      watercolor: 'artistic watercolor animation style'
    };
    parts.push(videoStyleMap[artStyle.value] || artStyle.prompt);
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
 * 카메라 움직임 추천 (장면 유형에 따라)
 */
const suggestCameraMovement = (scene: Scene, panelKey: string): string => {
  // 장면의 특성에 따라 카메라 움직임 제안
  const action = scene.action?.toLowerCase() || '';

  if (action.includes('걷') || action.includes('walk') || action.includes('따라')) {
    return 'tracking shot following the character';
  }
  if (action.includes('뛰') || action.includes('run') || action.includes('chase')) {
    return 'dynamic tracking shot with slight shake';
  }
  if (action.includes('만나') || action.includes('meet') || action.includes('대화')) {
    return 'medium shot, slowly pushing in';
  }
  if (action.includes('발견') || action.includes('discover') || action.includes('놀라')) {
    return 'slow zoom in to capture the moment';
  }

  // 패널 유형에 따른 기본 카메라
  switch (panelKey) {
    case 'ki':
      return 'establishing shot, slow pan across the scene';
    case 'seung':
      return 'medium shot with gentle movement';
    case 'jeon':
      return 'close-up with dramatic tension';
    case 'gyeol':
      return 'wide shot pulling back slowly';
    default:
      return 'steady shot';
  }
};

/**
 * Sora 프롬프트 템플릿
 */
export const soraTemplate: PromptTemplate = {
  service: 'sora',

  generateMainPrompt(
    scene: Scene,
    visualDNA: VisualDNA,
    panelKey: string,
    sceneIndex: number,
    _language: PromptLanguage
  ): string {
    const panelLabel = PANEL_LABELS_EN[panelKey] || { label: panelKey, subtitle: '' };
    const sections: string[] = [];

    // 1. 장면 컨텍스트
    sections.push(`[Scene ${sceneIndex}: ${panelLabel.label}]`);
    sections.push('');

    // 2. 주요 동작 설명 (가장 중요)
    sections.push('ACTION:');
    if (scene.action) {
      sections.push(scene.action);
    }
    sections.push('');

    // 3. 캐릭터 (동작 포함)
    const dnaCharacters = visualDNA.characters.filter(c => c.name);
    if (dnaCharacters.length > 0 || scene.characters) {
      sections.push('CHARACTERS:');
      if (dnaCharacters.length > 0) {
        dnaCharacters.forEach(char => {
          sections.push(`- ${formatCharacter(char)}`);
        });
      } else if (scene.characters) {
        sections.push(`- ${scene.characters}`);
      }
      sections.push('');
    }

    // 4. 배경 및 환경
    sections.push('SETTING:');
    if (scene.setting) {
      sections.push(scene.setting);
    }
    const envParts = [
      visualDNA.environment.location,
      visualDNA.environment.era
    ].filter(Boolean);
    if (envParts.length > 0) {
      sections.push(envParts.join(', '));
    }
    sections.push('');

    // 5. 카메라 움직임
    const cameraMove = scene.cameraAngle || suggestCameraMovement(scene, panelKey);
    sections.push('CAMERA:');
    sections.push(cameraMove);
    sections.push('');

    // 6. 분위기 및 감정
    if (scene.mood || visualDNA.environment.mood) {
      sections.push('MOOD:');
      sections.push(scene.mood || visualDNA.environment.mood || '');
      sections.push('');
    }

    // 7. 스타일
    const styleString = getStyleString(visualDNA);
    if (styleString) {
      sections.push('STYLE:');
      sections.push(styleString);
      sections.push('');
    }

    // 8. 기술적 요구사항
    sections.push('TECHNICAL:');
    sections.push('smooth motion, consistent lighting, high quality, cinematic');

    return sections.join('\n');
  },

  formatFinalPrompt(
    mainPrompt: string,
    _negativePrompt?: string,
    _parameters?: Record<string, string | number | boolean>
  ): string {
    return mainPrompt;
  }
};

export default soraTemplate;
