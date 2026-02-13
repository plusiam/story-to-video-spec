export * from './database';
export * from './ai';

/**
 * 스토리 패널 타입
 */
export interface StoryPanel {
  id: string;
  order: number;
  title: string;        // 소제목
  scene: string;        // 장면 설명
  dialogue: string;     // 대사/나레이션
  emotion: string;      // 감정/분위기
  imageUrl?: string;    // AI 생성 이미지 URL
}

/**
 * 작품 데이터 타입
 */
export interface WorkData {
  title: string;
  theme?: string;
  characters?: string[];
  panels: StoryPanel[];
  notes?: string;
}

/**
 * 인증 상태
 */
export interface AuthState {
  user: import('./database').User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isJudge: boolean;
  isGuest: boolean;
}
