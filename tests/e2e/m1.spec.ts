import { expect, test, type Page } from '@playwright/test';

/**
 * M1 관문: 빈 프로젝트로 0~7단계 이동, 브리핑 페이지 표시, 이름표 점검 통과
 */

/** 화면의 조작 가능한 요소 중 data-testid가 없는 것을 찾는다 (에이전트 친화 원칙 1번) */
async function missingTestIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button, input, textarea, select, a[href]'));
    return els
      .filter((el) => !el.getAttribute('data-testid'))
      .map((el) => `${el.tagName.toLowerCase()}「${(el.textContent || (el as HTMLInputElement).name || '').trim().slice(0, 30)}」`);
  });
}

/** 입력칸이 보이는 라벨과 연결되어 있는지 (원칙 2번) */
async function unlabeledInputs(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('input, textarea, select'))
      .filter((el) => {
        const input = el as HTMLInputElement;
        if (input.type === 'file' || input.closest('label')) return false;
        return !(input.labels && input.labels.length > 0) && !input.getAttribute('aria-label');
      })
      .map((el) => el.getAttribute('data-testid') || el.tagName),
  );
}

async function newProject(page: Page): Promise<string> {
  await page.goto('/projects');
  await page.getByTestId('app-new-project').click();
  await expect(page).toHaveURL(/\/p\/proj_[a-z0-9]+\/step\/0$/);
  return page.url().match(/\/p\/(proj_[a-z0-9]+)\//)![1];
}

test('프로젝트 목록과 새 프로젝트 만들기', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/projects$/);
  expect(await missingTestIds(page)).toEqual([]);
  const id = await newProject(page);
  await expect(page.getByTestId('app-next-action')).toContainText('0단계');
  await expect(page.getByTestId('app-log')).toContainText('프로젝트를 만들었습니다');
  await page.goto('/projects');
  await expect(page.getByTestId(`app-project-${id}`)).toBeVisible();
});

test('빈 프로젝트로 0~7단계를 주소로 이동하고, 단계마다 이름표와 지침이 있다', async ({ page }) => {
  const id = await newProject(page);
  for (let n = 0; n <= 7; n++) {
    await page.goto(`/p/${id}/step/${n}`);
    await expect(page.getByTestId(`s${n}-heading`)).toBeVisible();
    await expect(page.getByTestId('app-guide-panel')).toHaveAttribute('data-guide', `GUIDE-S${n} v1.0`);
    await expect(page.getByTestId(`app-nav-step-${n}`)).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId(`s${n}-complete`)).toBeDisabled();
    await expect(page.getByTestId('app-complete-locked-reason')).toBeVisible();
    expect(await missingTestIds(page), `${n}단계 이름표 누락`).toEqual([]);
    expect(await unlabeledInputs(page), `${n}단계 라벨 누락`).toEqual([]);
  }
  // 1단계 이후는 0단계 완료 전이라 막힘
  await expect(page.getByTestId('app-nav-step-3')).toHaveAttribute('data-status', 'blocked');
});

test('0단계: 점검을 통과해야 완료되고, 완료 후 다음 할 일이 1단계를 가리킨다', async ({ page }) => {
  const id = await newProject(page);
  const complete = page.getByTestId('s0-complete');

  await page.getByTestId('s0-title').fill('은혜 갚은 까치');
  await page.getByTestId('s0-source-type-folktale').check();
  await expect(complete).toBeDisabled();
  await expect(page.getByTestId('app-next-action')).toContainText('s0-source-note');

  await page.getByTestId('s0-source-note').fill('경상도 지역 전래 민담, 할머니께 들은 줄거리');
  await page.getByTestId('s0-no-commercial-book').check();
  await expect(page.getByTestId('app-next-action')).toContainText('s0-complete');
  await expect(complete).toBeEnabled();

  await complete.click();
  await expect(page.getByTestId('app-step-done')).toContainText('설정 완료');
  await expect(page.getByTestId('app-log')).toContainText('0단계 「프로젝트 설정」 완료');
  await expect(page.getByTestId('app-next-action')).toContainText('1단계');
  await expect(page.getByTestId('app-nav-step-0')).toHaveAttribute('data-status', 'done');

  // 자동 저장(2초) 후 새로고침해도 남아 있다
  await expect(page.getByTestId('app-save-status')).toContainText('저장됨', { timeout: 5000 });
  await page.reload();
  await expect(page.getByTestId('s0-title')).toHaveValue('은혜 갚은 까치');
  await expect(page.getByTestId('app-step-done')).toBeVisible();

  // 다시 고치기
  await page.getByTestId('s0-reopen').click();
  await expect(page.getByTestId('s0-complete')).toBeEnabled();
  await expect(page).toHaveURL(new RegExp(`/p/${id}/step/0$`));
});

test('브리핑 페이지: 진행 상태, 규칙, 8개 지침, 전체 복사', async ({ page }) => {
  const id = await newProject(page);
  await page.goto(`/p/${id}/brief`);
  await expect(page.getByTestId('app-brief-status').locator('tbody tr')).toHaveCount(8);
  for (let n = 0; n <= 7; n++) await expect(page.getByTestId(`app-brief-guide-${n}`)).toBeVisible();
  expect(await missingTestIds(page)).toEqual([]);

  await page.getByTestId('app-brief-copy').click();
  await expect(page.getByTestId('app-brief-copy')).toHaveText('복사됨');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(`# 작업 브리핑`);
  expect(copied).toContain('[GUIDE-S5 v1.0] 5단계 장면 이미지');
});

test('내보내기와 JSON 불러오기: 형식 오류는 글로 알려 준다', async ({ page }) => {
  const id = await newProject(page);
  await page.goto(`/p/${id}/export`);
  expect(await missingTestIds(page)).toEqual([]);
  const download = page.waitForEvent('download');
  await page.getByTestId('app-export-json').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(new RegExp(`^${id}_\\d{4}-\\d{2}-\\d{2}\\.json$`));

  await page.goto('/projects');
  await page.getByTestId('app-import-text').fill('{"schemaVersion":"0.9","id":"x"}');
  await page.getByTestId('app-import-submit').click();
  await expect(page.getByTestId('app-import-errors')).toContainText('schemaVersion이 "1.0"이어야 합니다');
});
