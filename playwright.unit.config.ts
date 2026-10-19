import { defineConfig } from '@playwright/test';

/** 파서·저장·호환성 시험. 브라우저나 웹 서버 없이 실행한다. */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /(?:batch-handoff|source-material|serial-records|authoring-compat)\.spec\.ts$/,
  workers: 1,
  reporter: 'list',
});
