import { expect, test as base, type Page } from '@playwright/test';

/**
 * 공통 준비: 폴더 선택 창 대신 브라우저 전용 저장소(OPFS)의 "작업폴더"를 돌려준다.
 * 실제 폴더 선택 창은 운영자가 누르는 창이라 자동 검사에서는 이렇게 바꿔 끼운다.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker = async () => {
        const root = await navigator.storage.getDirectory();
        return root.getDirectoryHandle('작업폴더', { create: true });
      };
    });
    await use(page);
  },
});
export { expect };

/** 화면의 조작 가능한 요소 중 data-testid가 없는 것 (에이전트 친화 원칙 1번) */
export async function missingTestIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('button, input, textarea, select, a[href]'))
      .filter((el) => !el.getAttribute('data-testid'))
      .map((el) => `${el.tagName.toLowerCase()}「${(el.textContent || (el as HTMLInputElement).name || '').trim().slice(0, 30)}」`),
  );
}

/** 보이는 라벨과 연결되지 않은 입력칸 (원칙 2번) */
export async function unlabeledInputs(page: Page): Promise<string[]> {
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

export async function newProject(page: Page): Promise<string> {
  await page.goto('/projects');
  await page.getByTestId('app-new-project').click();
  await expect(page).toHaveURL(/\/p\/proj_[a-z0-9]+\/step\/0$/);
  return page.url().match(/\/p\/(proj_[a-z0-9]+)\//)![1];
}

export async function connectFolder(page: Page) {
  const state = page.getByTestId('app-folder').first();
  if ((await state.getAttribute('data-state')) !== 'ready') {
    await page.getByTestId('app-folder-connect').first().click();
  }
  await expect(page.getByTestId('app-folder').first()).toHaveAttribute('data-state', 'ready');
}

/** 0단계를 채워 완료한다 (목표 길이 minutes분) */
export async function completeStep0(page: Page, minutes = 3) {
  await page.getByTestId('s0-title').fill('은혜 갚은 까치');
  await page.getByTestId('s0-source-type-folktale').check();
  await page.getByTestId('s0-source-note').fill('경상도 지역 전래 민담, 할머니께 들은 줄거리');
  await page.getByTestId('s0-no-commercial-book').check();
  await page.getByTestId('s0-duration-min').fill(String(minutes));
  await connectFolder(page);
  await page.getByTestId('s0-complete').click();
  await expect(page.getByTestId('app-step-done')).toBeVisible();
}

/**
 * 시험용 원고: 공백 빼고 targetChars 근처가 될 때까지 짧은 문장을 이어 쓴다.
 * 문장마다 40자 이하, 영어·숫자 없음.
 */
export function sampleScript(targetChars: number): string {
  const pool = [
    '옛날 옛적 깊은 산골에 마음씨 착한 나무꾼이 살았단다.',
    '나무꾼은 날마다 지게를 지고 산에 올랐지요.',
    '어느 날 산길에서 까치 우는 소리가 들렸어요.',
    '큰 구렁이가 까치 둥지를 노리고 있었단다.',
    '나무꾼은 돌을 던져 구렁이를 쫓아 주었지요.',
    '까치들은 고맙다는 듯 하늘을 빙빙 돌았어요.',
    '해가 지자 나무꾼은 외딴 초가집에 묵게 되었단다.',
    '한밤중에 무언가 나무꾼의 몸을 칭칭 감았지요.',
    '낮에 쫓겨 간 구렁이가 원수를 갚으러 온 것이었어요.',
    '새벽 종이 세 번 울리면 살려 주겠다고 했단다.',
  ];
  const out: string[] = [];
  let n = 0;
  for (let i = 0; n < targetChars; i++) {
    const s = pool[i % pool.length];
    out.push(s);
    n += s.replace(/\s/g, '').length;
    if (i % 5 === 4) out.push('\n');
  }
  return out.join(' ').replace(/ \n /g, '\n');
}
