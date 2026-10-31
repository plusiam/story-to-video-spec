import { defineConfig } from '@playwright/test';

/**
 * M1 관문 점검용 E2E 설정
 * 빌드 결과를 vite preview로 띄우고 실제 브라우저로 화면을 검사한다.
 * CHROMIUM_PATH가 있으면 그 브라우저를 쓴다(미리 설치된 Chromium 재사용).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    permissions: ['clipboard-read', 'clipboard-write'],
    // 한글 폴더 이름을 바르게 다루도록 UTF-8 문자 설정으로 브라우저를 띄운다
    launchOptions: {
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
    },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
