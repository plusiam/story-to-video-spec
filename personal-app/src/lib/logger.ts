/**
 * 환경별 로거
 * - DEV: 모든 로그 출력
 * - PROD: 에러만 출력 (디버깅 및 모니터링용)
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    // 프로덕션에서도 에러는 기록 (추후 Sentry 연동 시 여기에 추가)
    console.error('[ERROR]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.warn(...args);
    }
  },
};
