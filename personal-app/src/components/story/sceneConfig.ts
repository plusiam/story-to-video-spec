/**
 * 장면 확장(Step 2) 설정
 * 4컷 스토리의 각 패널을 상세 장면으로 확장하기 위한 타입과 설정
 */

// storyPanelConfig에서 PanelContent 타입 재사용
export type { PanelContent } from './storyPanelConfig';

// 장면 데이터 구조
export interface Scene {
  id: string;
  panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol';
  order: number;

  // 사용자 입력 데이터
  setting: string;      // 배경/장소
  characters: string;   // 등장인물
  action: string;       // 행동/사건
  dialogue: string;     // 대사
  mood: string;         // 분위기/감정

  // Vids용 확장 필드
  narration: string;    // 나레이션
  subtitle: string;     // 자막
  onScreenText: string; // 화면 텍스트
  durationSec?: number; // 장면 길이(초)
  cameraAngle: string;  // 카메라 앵글
  shotType: string;     // 샷 타입
  sfx: string;          // 효과음
  music: string;        // 배경음

  // AI 이미지 생성용 프롬프트 (자동 생성)
  imagePrompt?: string;
}

// 패널별 장면 컬렉션
export interface PanelScenes {
  ki: Scene[];
  seung: Scene[];
  jeon: Scene[];
  gyeol: Scene[];
}

// 빈 장면 생성
export const createEmptyScene = (panelKey: 'ki' | 'seung' | 'jeon' | 'gyeol', order: number): Scene => ({
  id: `${panelKey}-${order}-${Date.now()}`,
  panelKey,
  order,
  setting: '',
  characters: '',
  action: '',
  dialogue: '',
  mood: '',
  narration: '',
  subtitle: '',
  onScreenText: '',
  durationSec: undefined,
  cameraAngle: '',
  shotType: '',
  sfx: '',
  music: ''
});

// 빈 패널 장면 컬렉션
export const EMPTY_PANEL_SCENES: PanelScenes = {
  ki: [],
  seung: [],
  jeon: [],
  gyeol: []
};

// 장면 입력 필드 설정
export interface SceneFieldConfig {
  key: keyof Omit<Scene, 'id' | 'panelKey' | 'order' | 'imagePrompt'>;
  label: string;
  placeholder: string;
  icon: string;
  hint: string;
  multiline: boolean;
  inputType?: 'text' | 'number';
}

export const SCENE_FIELDS: SceneFieldConfig[] = [
  {
    key: 'setting',
    label: '배경/장소',
    placeholder: '예: 햇살이 비치는 아늑한 카페 안, 창가 자리',
    icon: '🏠',
    hint: '장면이 펼쳐지는 공간을 묘사해주세요',
    multiline: false
  },
  {
    key: 'characters',
    label: '등장인물',
    placeholder: '예: 주인공(민수), 친구(지연)',
    icon: '👥',
    hint: '이 장면에 나오는 인물들을 적어주세요',
    multiline: false
  },
  {
    key: 'action',
    label: '행동/사건',
    placeholder: '예: 민수가 지연에게 조심스럽게 편지를 건넨다',
    icon: '🎬',
    hint: '이 장면에서 일어나는 일을 설명해주세요',
    multiline: true
  },
  {
    key: 'dialogue',
    label: '대사',
    placeholder: '예: "이거... 어제 쓴 건데, 읽어볼래?"',
    icon: '💬',
    hint: '인물의 대사나 나레이션을 적어주세요 (선택)',
    multiline: true
  },
  {
    key: 'mood',
    label: '분위기/감정',
    placeholder: '예: 설렘, 긴장, 따뜻함',
    icon: '✨',
    hint: '장면의 분위기나 감정을 표현해주세요',
    multiline: false
  }
];

// Vids용 확장 필드
export const VIDS_FIELDS: SceneFieldConfig[] = [
  {
    key: 'narration',
    label: '나레이션',
    placeholder: '예: 민지는 깊게 숨을 들이쉬고 작은 문을 조심스럽게 연다.',
    icon: '🎙️',
    hint: 'Vids 내레이터가 읽을 문장을 적어주세요',
    multiline: true
  },
  {
    key: 'subtitle',
    label: '자막',
    placeholder: '예: 민지는 문을 조심스럽게 열었다.',
    icon: '📝',
    hint: '자막으로 표시할 문장 (기본은 나레이션과 동일)',
    multiline: true
  },
  {
    key: 'onScreenText',
    label: '화면 텍스트',
    placeholder: '예: 첫 번째 모험의 시작',
    icon: '🏷️',
    hint: '화면에 크게 보여줄 키워드/타이틀',
    multiline: false
  },
  {
    key: 'durationSec',
    label: '장면 길이(초)',
    placeholder: '예: 6',
    icon: '⏱️',
    hint: '비워두면 나레이션 길이로 자동 추정',
    multiline: false,
    inputType: 'number'
  },
  {
    key: 'cameraAngle',
    label: '카메라 앵글',
    placeholder: '예: wide / medium / close-up',
    icon: '📷',
    hint: '장면의 구도/앵글을 적어주세요',
    multiline: false
  },
  {
    key: 'shotType',
    label: '샷 타입',
    placeholder: '예: establish / action / reaction',
    icon: '🎞️',
    hint: '샷의 성격을 간단히 지정해주세요',
    multiline: false
  },
  {
    key: 'sfx',
    label: '효과음',
    placeholder: '예: 문이 삐걱이며 열린다',
    icon: '🔊',
    hint: '필요한 효과음을 적어주세요',
    multiline: false
  },
  {
    key: 'music',
    label: '배경음',
    placeholder: '예: 잔잔하고 따뜻한 피아노',
    icon: '🎵',
    hint: '배경 음악 분위기를 적어주세요',
    multiline: false
  }
];

// AI 이미지 프롬프트 생성 함수
export const generateImagePrompt = (scene: Scene): string => {
  const parts: string[] = [];

  if (scene.setting) {
    parts.push(`Setting: ${scene.setting}`);
  }
  if (scene.characters) {
    parts.push(`Characters: ${scene.characters}`);
  }
  if (scene.action) {
    parts.push(`Action: ${scene.action}`);
  }
  if (scene.mood) {
    parts.push(`Mood: ${scene.mood}`);
  }

  return parts.join('. ') + '. Illustrated in a warm, storybook style.';
};

// 패널별 색상 (storyPanelConfig와 일치)
export const PANEL_COLORS = {
  ki: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    accent: 'bg-blue-500',
    text: 'text-blue-700',
    light: 'bg-blue-100'
  },
  seung: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    accent: 'bg-green-500',
    text: 'text-green-700',
    light: 'bg-green-100'
  },
  jeon: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    accent: 'bg-orange-500',
    text: 'text-orange-700',
    light: 'bg-orange-100'
  },
  gyeol: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    accent: 'bg-purple-500',
    text: 'text-purple-700',
    light: 'bg-purple-100'
  }
};

// 패널 라벨
export const PANEL_LABELS = {
  ki: { label: '기', subtitle: '시작', number: 1 },
  seung: { label: '승', subtitle: '전개', number: 2 },
  jeon: { label: '전', subtitle: '위기', number: 3 },
  gyeol: { label: '결', subtitle: '결말', number: 4 }
};
