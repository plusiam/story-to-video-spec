/**
 * AI 관련 타입 정의
 */

// 캐릭터 정보
export interface Character {
  id: string;
  name: string;
  physicalTraits: string;  // 외모 특징
  clothing: string;        // 복장
  distinctiveFeatures: string; // 특이사항
}

// 비주얼 DNA - 스토리 전체에 적용되는 시각적 설정
export interface VisualDNA {
  id?: string;
  workId: string;

  // 캐릭터 정보
  characters: Character[];

  // 아트 스타일
  artStyle: ArtStyleType;
  colorTone: ColorToneType;
  lighting: LightingType;

  // 배경 환경
  environment: {
    location: string;   // 장소
    era: string;        // 시대
    mood: string;       // 분위기
  };

  // 커스텀 스타일 프롬프트 (고급 사용자용)
  customStylePrompt?: string;
}

// 아트 스타일 프리셋
export type ArtStyleType = 'ghibli' | 'shinkai' | 'webtoon' | 'realistic' | 'watercolor' | 'custom';

export const ART_STYLE_OPTIONS: { value: ArtStyleType; label: string; prompt: string }[] = [
  {
    value: 'ghibli',
    label: '지브리풍',
    prompt: 'Studio Ghibli style animation, soft hand-drawn aesthetic, warm nostalgic atmosphere'
  },
  {
    value: 'shinkai',
    label: '신카이풍',
    prompt: 'Makoto Shinkai style, detailed backgrounds, dramatic lighting, photorealistic skies'
  },
  {
    value: 'webtoon',
    label: '웹툰',
    prompt: 'Korean webtoon style, clean lines, vibrant colors, manhwa aesthetic'
  },
  {
    value: 'realistic',
    label: '사실적',
    prompt: 'realistic digital art, detailed rendering, cinematic composition'
  },
  {
    value: 'watercolor',
    label: '수채화',
    prompt: 'watercolor painting style, soft edges, flowing colors, artistic brushstrokes'
  },
  {
    value: 'custom',
    label: '커스텀',
    prompt: ''
  }
];

// 색감 프리셋
export type ColorToneType = 'warm' | 'cool' | 'pastel' | 'vibrant' | 'monochrome';

export const COLOR_TONE_OPTIONS: { value: ColorToneType; label: string; prompt: string }[] = [
  { value: 'warm', label: '따뜻한 톤', prompt: 'warm color palette, golden tones, cozy atmosphere' },
  { value: 'cool', label: '차가운 톤', prompt: 'cool color palette, blue tones, calm atmosphere' },
  { value: 'pastel', label: '파스텔', prompt: 'soft pastel colors, gentle hues, dreamy feeling' },
  { value: 'vibrant', label: '선명한', prompt: 'vibrant saturated colors, bold and energetic' },
  { value: 'monochrome', label: '모노톤', prompt: 'monochromatic color scheme, limited palette' }
];

// 조명 프리셋
export type LightingType = 'daylight' | 'golden_hour' | 'night' | 'indoor' | 'dramatic';

export const LIGHTING_OPTIONS: { value: LightingType; label: string; prompt: string }[] = [
  { value: 'daylight', label: '낮 햇살', prompt: 'bright daylight, natural sunlight, clear sky' },
  { value: 'golden_hour', label: '석양', prompt: 'golden hour lighting, warm sunset glow, long shadows' },
  { value: 'night', label: '밤', prompt: 'nighttime scene, moonlight, city lights or stars' },
  { value: 'indoor', label: '실내등', prompt: 'indoor lighting, soft ambient light, warm interior' },
  { value: 'dramatic', label: '드라마틱', prompt: 'dramatic lighting, high contrast, cinematic shadows' }
];

// AI 사용량 상태
export interface AIUsageStatus {
  usedCount: number;
  dailyLimit: number;
  remaining: number;
  isUnlimited: boolean;
}

// AI 생성 결과
export interface AIGeneratedContent {
  detailedStory: string;      // 상세 스토리
  sceneDescription: string;   // 장면 묘사
  suggestedDialogue: string;  // 대사 제안
  imagePrompt: string;        // 이미지 생성 프롬프트
}

// AI 생성 요청
export interface AIGenerateRequest {
  scene: {
    setting: string;
    characters: string;
    action: string;
    dialogue?: string;
    mood?: string;
  };
  visualDNA: VisualDNA;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  sceneNumber: number;
}

// 빈 비주얼 DNA 생성
export const createEmptyVisualDNA = (workId: string): VisualDNA => ({
  workId,
  characters: [],
  artStyle: 'ghibli',
  colorTone: 'warm',
  lighting: 'daylight',
  environment: {
    location: '',
    era: '',
    mood: ''
  }
});

// 빈 캐릭터 생성
export const createEmptyCharacter = (): Character => ({
  id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: '',
  physicalTraits: '',
  clothing: '',
  distinctiveFeatures: ''
});

// 프롬프트 생성 함수
export const generateFullPrompt = (
  scene: AIGenerateRequest['scene'],
  visualDNA: VisualDNA,
  panelKey: string,
  sceneNumber: number
): string => {
  const artStylePrompt = ART_STYLE_OPTIONS.find(s => s.value === visualDNA.artStyle)?.prompt || '';
  const colorTonePrompt = COLOR_TONE_OPTIONS.find(c => c.value === visualDNA.colorTone)?.prompt || '';
  const lightingPrompt = LIGHTING_OPTIONS.find(l => l.value === visualDNA.lighting)?.prompt || '';

  // 캐릭터 설명 조합
  const characterDescriptions = visualDNA.characters
    .filter(c => c.name && c.physicalTraits)
    .map(c => `${c.name}: ${c.physicalTraits}, wearing ${c.clothing || 'casual clothes'}${c.distinctiveFeatures ? `, ${c.distinctiveFeatures}` : ''}`)
    .join('; ');

  // 배경 설명
  const environmentDesc = [
    visualDNA.environment.location,
    visualDNA.environment.era,
    visualDNA.environment.mood
  ].filter(Boolean).join(', ');

  // 최종 프롬프트 조합
  const parts = [
    `[Scene ${sceneNumber} - ${panelKey.toUpperCase()}]`,
    '',
    characterDescriptions && `CHARACTERS: ${characterDescriptions}`,
    '',
    `SETTING: ${scene.setting}`,
    environmentDesc && `ENVIRONMENT: ${environmentDesc}`,
    '',
    `ACTION: ${scene.action}`,
    scene.mood && `MOOD: ${scene.mood}`,
    '',
    'STYLE:',
    artStylePrompt,
    colorTonePrompt,
    lightingPrompt,
    visualDNA.customStylePrompt && `CUSTOM: ${visualDNA.customStylePrompt}`,
    '',
    'CONSISTENCY: Maintain same character proportions and art style throughout all scenes'
  ].filter(Boolean);

  return parts.join('\n');
};
