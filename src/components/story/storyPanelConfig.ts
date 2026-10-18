/**
 * 4컷 스토리 패널 설정
 */

export interface PanelConfig {
  id: number;
  key: 'ki' | 'seung' | 'jeon' | 'gyeol';
  label: string;
  subtitle: string;
  color: {
    border: string;
    borderActive: string;
    bg: string;
    bgFilled: string;
    accent: string;
    text: string;
  };
  hint: string;
  placeholder: string;
  example: string;
}

export const PANEL_CONFIG: PanelConfig[] = [
  {
    id: 1,
    key: 'ki',
    label: '기',
    subtitle: '시작',
    color: {
      border: 'border-blue-200',
      borderActive: 'border-blue-400',
      bg: 'bg-blue-50',
      bgFilled: 'bg-blue-100',
      accent: 'bg-blue-500',
      text: 'text-blue-600'
    },
    hint: '이야기는 어디서, 누구와 함께 시작하나요?',
    placeholder: '주인공과 배경을 소개해보세요...',
    example: '어느 작은 마을에 호기심 많은 소녀 민지가 살고 있었습니다. 민지는 매일 학교가 끝나면 뒷산에 올라가 하늘을 바라보는 것을 좋아했어요.'
  },
  {
    id: 2,
    key: 'seung',
    label: '승',
    subtitle: '전개',
    color: {
      border: 'border-green-200',
      borderActive: 'border-green-400',
      bg: 'bg-green-50',
      bgFilled: 'bg-green-100',
      accent: 'bg-green-500',
      text: 'text-green-600'
    },
    hint: '어떤 일이 일어나기 시작했나요?',
    placeholder: '사건이 시작되는 부분을 써보세요...',
    example: '어느 날, 민지는 숲에서 반짝이는 이상한 돌을 발견했습니다. 돌은 무지개빛으로 빛나고 있었고, 신비로운 기운이 느껴졌어요.'
  },
  {
    id: 3,
    key: 'jeon',
    label: '전',
    subtitle: '위기',
    color: {
      border: 'border-orange-200',
      borderActive: 'border-orange-400',
      bg: 'bg-orange-50',
      bgFilled: 'bg-orange-100',
      accent: 'bg-orange-500',
      text: 'text-orange-600'
    },
    hint: '가장 큰 문제나 위기는 무엇인가요?',
    placeholder: '긴장감 넘치는 장면을 써보세요...',
    example: '그 돌을 만지자 민지는 갑자기 작아지기 시작했습니다! 개미만큼 작아진 민지는 거대해 보이는 풀숲에서 길을 잃고 말았어요.'
  },
  {
    id: 4,
    key: 'gyeol',
    label: '결',
    subtitle: '결말',
    color: {
      border: 'border-purple-200',
      borderActive: 'border-purple-400',
      bg: 'bg-purple-50',
      bgFilled: 'bg-purple-100',
      accent: 'bg-purple-500',
      text: 'text-purple-600'
    },
    hint: '문제가 어떻게 해결되었나요?',
    placeholder: '이야기의 마무리를 써보세요...',
    example: '민지는 용기를 내어 돌에게 진심으로 소원을 빌었고, 다시 원래 크기로 돌아왔습니다. 그 후로 민지는 작은 것들도 소중히 여기게 되었답니다.'
  }
];

export interface PanelContent {
  ki: string;
  seung: string;
  jeon: string;
  gyeol: string;
}

export const EMPTY_PANELS: PanelContent = {
  ki: '',
  seung: '',
  jeon: '',
  gyeol: ''
};
