/**
 * 앱 설정
 */
export const CONFIG = {
  // MVP 단계: 자동 승인 (true) / 정식: 관리자 승인 (false)
  AUTO_APPROVE_USERS: import.meta.env.VITE_AUTO_APPROVE_USERS === 'true',

  // AI 기능 활성화 여부
  ENABLE_AI_FEATURES: import.meta.env.VITE_ENABLE_AI_FEATURES === 'true',

  // 관리자 이메일 목록 (자동 승인 + 관리자 권한 부여)
  ADMIN_EMAILS: (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter((email: string) => email.length > 0),

  // 심사위원 이메일 목록 (자동 승인 + 심사위원 권한 부여)
  JUDGE_EMAILS: (import.meta.env.VITE_JUDGE_EMAILS || '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter((email: string) => email.length > 0),

  // 앱 버전
  VERSION: '1.0.0',

  // 사용자 상태
  USER_STATUS: {
    PENDING: 'pending',      // 승인 대기
    APPROVED: 'approved',    // 승인됨
    REJECTED: 'rejected',    // 거절됨
    SUSPENDED: 'suspended',  // 정지됨
  } as const,

  // 사용자 역할
  USER_ROLE: {
    USER: 'user',
    JUDGE: 'judge',
    ADMIN: 'admin',
  } as const,

  // 작품 상태
  WORK_STATUS: {
    DRAFT: 'draft',
    COMPLETE: 'complete',
  } as const,
};

export type UserStatus = typeof CONFIG.USER_STATUS[keyof typeof CONFIG.USER_STATUS];
export type UserRole = typeof CONFIG.USER_ROLE[keyof typeof CONFIG.USER_ROLE];
export type WorkStatus = typeof CONFIG.WORK_STATUS[keyof typeof CONFIG.WORK_STATUS];
