/**
 * JSON 형식 내보내기 생성기
 * Google Vids JSON, 스토리보드 JSON
 */

import type {
  ExportInput,
  ExportSceneData,
  ExportConfig,
  ExportResult
} from '../types';
import { ALL_EXPORT_FORMATS, generateExportFilename } from '../types';
import { PANEL_LABELS_KO, PANEL_LABELS_EN } from '@/lib/prompts/types';

// ============================================
// Google Vids JSON 생성
// ============================================

interface GoogleVidsScene {
  id: string;
  order: number;
  title: string;
  description: string;
  narration?: string;
  duration: number;
  transition: string;
  media?: {
    type: 'image' | 'video' | 'placeholder';
    prompt?: string;
  };
}

interface GoogleVidsExport {
  version: string;
  metadata: {
    title: string;
    author?: string;
    createdAt: string;
    totalDuration: number;
    scenesCount: number;
  };
  settings: {
    aspectRatio: string;
    defaultTransition: string;
    defaultSceneDuration: number;
  };
  scenes: GoogleVidsScene[];
}

/**
 * Google Vids JSON 생성
 */
export const generateGoogleVidsJson = (
  input: ExportInput,
  config: ExportConfig
): ExportResult => {
  try {
    const defaultDuration = 5; // 기본 장면 길이 (초)

    const scenes: GoogleVidsScene[] = input.scenes.map((sceneData, index) => {
      const panelLabel = PANEL_LABELS_KO[sceneData.panelKey];
      const scene = sceneData.scene;

      // Scene 타입 필드 매핑: setting, characters, action, dialogue, mood, narration
      return {
        id: `scene-${index + 1}`,
        order: index + 1,
        title: scene.onScreenText || `${panelLabel?.label || '장면'} ${index + 1}`,
        description: scene.action || '',
        narration: scene.narration || scene.dialogue || undefined,
        duration: sceneData.duration || scene.durationSec || defaultDuration,
        transition: index === 0 ? 'fade-in' : 'crossfade',
        media: {
          type: 'placeholder' as const,
          prompt: generateImagePrompt(sceneData, input.visualDNA)
        }
      };
    });

    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

    const exportData: GoogleVidsExport = {
      version: '1.0',
      metadata: {
        title: input.title,
        author: input.author,
        createdAt: new Date().toISOString(),
        totalDuration,
        scenesCount: scenes.length
      },
      settings: {
        aspectRatio: '16:9',
        defaultTransition: 'crossfade',
        defaultSceneDuration: defaultDuration
      },
      scenes
    };

    const content = JSON.stringify(exportData, null, 2);
    const formatInfo = ALL_EXPORT_FORMATS['google-vids-json'];

    return {
      success: true,
      format: 'google-vids-json',
      filename: generateExportFilename(input.title, 'google-vids-json'),
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
      format: 'google-vids-json',
      filename: '',
      content: '',
      mimeType: 'application/json',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : 'Google Vids JSON 생성 실패'
    };
  }
};

// ============================================
// 스토리보드 JSON 생성
// ============================================

interface StoryboardJsonScene {
  id: string;
  panelKey: string;
  panelLabel: {
    ko: string;
    en: string;
  };
  sceneIndex: number;
  content: {
    title?: string;
    description?: string;
    dialogue?: string;
    characterName?: string;
    emotion?: string;
  };
  setting: {
    location?: string;
    timeOfDay?: string;
    weather?: string;
    cameraAngle?: string;
  };
  timing?: {
    duration?: number;
    startTime?: number;
  };
  prompts?: {
    imagePrompt?: string;
    negativePrompt?: string;
  };
}

interface StoryboardJsonExport {
  version: string;
  exportedAt: string;
  metadata: {
    title: string;
    author?: string;
    createdAt: string;
    totalScenes: number;
    structure: string;
  };
  visualDNA: {
    artStyle?: string;
    colorPalette?: string[];
    characterDesign?: string;
    mood?: string;
  };
  characters: Array<{
    id: string;
    name: string;
    description?: string;
    traits?: string[];
  }>;
  scenes: StoryboardJsonScene[];
}

/**
 * 스토리보드 JSON 생성
 */
export const generateStoryboardJson = (
  input: ExportInput,
  config: ExportConfig
): ExportResult => {
  try {
    let currentTime = 0;

    const scenes: StoryboardJsonScene[] = input.scenes.map((sceneData, index) => {
      const scene = sceneData.scene;
      const duration = sceneData.duration || scene.durationSec || 5;

      // Scene 타입 필드 매핑: setting, characters, action, dialogue, mood, cameraAngle
      const storyboardScene: StoryboardJsonScene = {
        id: `scene-${sceneData.panelKey}-${index}`,
        panelKey: sceneData.panelKey,
        panelLabel: {
          ko: PANEL_LABELS_KO[sceneData.panelKey]?.label || '',
          en: PANEL_LABELS_EN[sceneData.panelKey]?.label || ''
        },
        sceneIndex: index,
        content: {
          title: scene.onScreenText,
          description: scene.action,
          dialogue: scene.dialogue,
          characterName: scene.characters,
          emotion: scene.mood
        },
        setting: {
          location: scene.setting,
          timeOfDay: undefined,
          weather: undefined,
          cameraAngle: scene.cameraAngle
        },
        timing: {
          duration,
          startTime: currentTime
        },
        prompts: {
          imagePrompt: generateImagePrompt(sceneData, input.visualDNA),
          negativePrompt: 'text, watermark, blurry, low quality'
        }
      };

      currentTime += duration;
      return storyboardScene;
    });

    // VisualDNA 타입 필드: characters, artStyle, colorTone, lighting, environment
    // Character 타입 필드: id, name, physicalTraits, clothing, distinctiveFeatures
    const exportData: StoryboardJsonExport = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        title: input.title,
        author: input.author,
        createdAt: input.createdAt.toISOString(),
        totalScenes: input.scenes.length,
        structure: '기승전결 (Ki-Seung-Jeon-Gyeol)'
      },
      visualDNA: {
        artStyle: input.visualDNA?.artStyle,
        colorPalette: input.visualDNA?.colorTone ? [input.visualDNA.colorTone] : undefined,
        characterDesign: input.visualDNA?.characters?.map(c => c.physicalTraits).join(', '),
        mood: input.visualDNA?.environment?.mood
      },
      characters: input.characters.map((char, idx) => ({
        id: `char-${idx}`,
        name: char.name,
        description: `${char.physicalTraits}, ${char.clothing}`,
        traits: char.distinctiveFeatures ? [char.distinctiveFeatures] : []
      })),
      scenes
    };

    const content = JSON.stringify(exportData, null, 2);
    const formatInfo = ALL_EXPORT_FORMATS['storyboard-json'];

    return {
      success: true,
      format: 'storyboard-json',
      filename: generateExportFilename(input.title, 'storyboard-json'),
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
      format: 'storyboard-json',
      filename: '',
      content: '',
      mimeType: 'application/json',
      size: 0,
      metadata: {
        exportedAt: new Date(),
        scenesCount: 0,
        language: config.language
      },
      error: error instanceof Error ? error.message : '스토리보드 JSON 생성 실패'
    };
  }
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 간단한 이미지 프롬프트 생성
 * Scene 타입 필드: setting, characters, action, dialogue, mood
 */
const generateImagePrompt = (
  sceneData: ExportSceneData,
  visualDNA: ExportInput['visualDNA']
): string => {
  const scene = sceneData.scene;
  const parts: string[] = [];

  // 행동/사건을 설명으로 사용
  if (scene.action) {
    parts.push(scene.action);
  }

  // 장소 (setting)
  if (scene.setting) {
    parts.push(`장소: ${scene.setting}`);
  }

  // 분위기
  if (scene.mood) {
    parts.push(scene.mood);
  }

  // 스타일
  if (visualDNA?.artStyle) {
    parts.push(`${visualDNA.artStyle} 스타일`);
  }

  return parts.join(', ');
};
