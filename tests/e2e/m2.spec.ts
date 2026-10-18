import { completeStep0, expect, missingTestIds, newProject, sampleScript, test, unlabeledInputs } from './helpers';

/**
 * M2 관문: 옛이야기 1편의 원고, 장면표, 비주얼 DNA를 끝까지 만들고
 * 작업 폴더에 project.json과 script.txt가 남는다.
 */

test('1~3단계를 끝까지 진행하고 작업 폴더에 결과가 남는다', async ({ page }) => {
  test.setTimeout(90_000);
  const id = await newProject(page);
  await completeStep0(page, 3); // 3분 → 원고 638~862자, 장면 12~23개
  await page.getByTestId('app-step-next').click();
  await expect(page).toHaveURL(new RegExp(`/p/${id}/step/1$`));

  // ---------- 1단계 ----------
  for (const [i, line] of ['나무꾼이 산에서 까치를 구한다', '밤에 구렁이가 원수를 갚으러 온다', '새벽 종이 울려야 산다', '까치가 몸으로 종을 울린다'].entries()) {
    await page.getByTestId(`s1-outline-0${i + 1}`).fill(line);
  }
  await expect(page.getByTestId('s1-request-text')).toContainText('638~862자');

  // 형식이 틀린 답은 반영하지 않는다
  await page.getByTestId('s1-paste').fill('짧은 답');
  await page.getByTestId('s1-paste-apply').click();
  await expect(page.getByTestId('s1-paste-errors')).toContainText('너무 짧습니다');

  // 외부 AI 답 붙여넣기 (긴 문장과 숫자를 일부러 넣는다)
  const script = sampleScript(720);
  await page.getByTestId('s1-paste').fill(`${script}\n그날 밤 나무꾼은 3번이나 잠에서 깨어 이리저리 뒤척이며 까치를 걱정하고 또 걱정했단다.`);
  await page.getByTestId('s1-paste-apply').click();
  await expect(page.getByTestId('s1-paste-done')).toBeVisible();
  await expect(page.getByTestId('s1-flags')).not.toHaveAttribute('data-count', '0');
  await expect(page.getByTestId('s1-flag-01')).toBeVisible();
  await expect(page.getByTestId('s1-complete')).toBeDisabled();
  await expect(page.getByTestId('app-next-action')).toContainText('s1-flags');

  // 고쳐 쓰기
  await page.getByTestId('s1-full-text').fill(script);
  await expect(page.getByTestId('s1-flags')).toHaveAttribute('data-count', '0');
  await page.getByTestId('s1-own-wording').check();
  expect(await missingTestIds(page)).toEqual([]);
  expect(await unlabeledInputs(page)).toEqual([]);
  await page.getByTestId('s1-complete').click();
  await expect(page.getByTestId('app-step-done')).toContainText('원고 확정');
  await page.getByTestId('app-step-next').click();

  // ---------- 2단계 ----------
  await page.getByTestId('s2-paste').fill('이건 JSON이 아닙니다');
  await page.getByTestId('s2-paste-apply').click();
  await expect(page.getByTestId('s2-paste-errors')).toContainText('JSON을 찾지 못했습니다');

  await page.getByTestId('s2-split').click();
  const count = await page.locator('[data-testid^="s2-scene-"][data-testid$="-narration"]').count();
  expect(count).toBeGreaterThanOrEqual(12);
  expect(count).toBeLessThanOrEqual(23);
  await expect(page.getByTestId('app-next-action')).toContainText('s2-scene-01-visual');

  for (let i = 1; i <= count; i++) {
    const n = String(i).padStart(2, '0');
    await page.getByTestId(`s2-scene-${n}-visual`).fill(`장면 ${i}: 나무꾼이 산길에서 하늘을 올려다본다`);
    await page.getByTestId(`s2-scene-${n}-location`).fill(i % 2 ? '산길' : '초가집');
    await page.getByTestId(`s2-scene-${n}-characters`).fill(i % 3 ? '나무꾼, 까치' : '없음');
    await page.getByTestId(`s2-scene-${n}-emotion`).fill('평온');
  }

  // 위·아래 이동 (드래그 없이)
  const first = await page.getByTestId('s2-scene-01-narration').inputValue();
  await page.getByTestId('s2-scene-01-down').click();
  await expect(page.getByTestId('s2-scene-02-narration')).toHaveValue(first);
  await page.getByTestId('s2-scene-02-up').click();
  await expect(page.getByTestId('s2-scene-01-narration')).toHaveValue(first);

  expect(await missingTestIds(page)).toEqual([]);
  expect(await unlabeledInputs(page)).toEqual([]);
  await expect(page.getByTestId('s2-complete')).toBeEnabled();
  await page.getByTestId('s2-complete').click();
  await expect(page.getByTestId('app-step-done')).toContainText('장면표 확정');

  // 장면 주소로 바로 열기
  await page.goto(`/p/${id}/step/2?scene=05`);
  await expect(page.locator('#scene-05')).toBeInViewport();
  await page.goto(`/p/${id}/step/3`);

  // ---------- 3단계 ----------
  await expect(page.getByTestId('s3-character-list').locator('> li')).toHaveCount(2);
  await expect(page.getByTestId('s3-location-list').locator('> li')).toHaveCount(2);
  await page.getByTestId('s3-style-preset-minhwa').check();

  await page.getByTestId('s3-paste').fill('{"characters":[{"name":"나뭇꾼","age":"서른"}],"locations":[]}');
  await page.getByTestId('s3-paste-apply').click();
  await expect(page.getByTestId('s3-paste-errors')).toContainText('장면표에 없는 이름');

  await page.getByTestId('s3-paste').fill(
    '```json\n' +
      JSON.stringify({
        characters: [
          { name: '나무꾼', age: '서른 살 남짓', face: '둥근 얼굴, 순한 눈매', hair: '상투, 흰 머리띠', outfit: '흰 저고리와 회색 바지', props: '지게', colors: ['#7A4B2A', '#E9DCC4', '#3F5E4A'] },
          { name: '까치', age: '어린 까치', face: '까만 부리, 반짝이는 눈', hair: '흰 배와 검푸른 깃', outfit: '없음(새)', props: '', colors: ['#1F2A44', '#FFFFFF', '#3B6EA5'] },
        ],
        locations: [
          { name: '산길', desc: '늦가을 깊은 산속 오솔길, 단풍과 바위, 오후의 비스듬한 햇살' },
          { name: '초가집', desc: '외딴 초가집 마당과 방, 호롱불 하나, 깊은 밤' },
        ],
      }) +
      '\n```',
  );
  await page.getByTestId('s3-paste-apply').click();
  await expect(page.getByTestId('s3-paste-done')).toBeVisible();
  await expect(page.getByTestId('s3-character-01-age')).toHaveValue('서른 살 남짓');
  await expect(page.getByTestId('s3-preview-sheet')).toContainText('민화풍');
  await expect(page.getByTestId('s3-preview-scene-text')).toContainText('그림 안에 넣지 말 것');

  expect(await missingTestIds(page)).toEqual([]);
  expect(await unlabeledInputs(page)).toEqual([]);
  await expect(page.getByTestId('s3-complete')).toBeEnabled();
  await page.getByTestId('s3-complete').click();
  await expect(page.getByTestId('app-step-done')).toContainText('DNA 확정');
  await expect(page.getByTestId('app-next-action')).toContainText('4단계');

  // ---------- 작업 폴더 확인 ----------
  await expect(page.getByTestId('app-save-status')).toContainText('작업 폴더에도 저장', { timeout: 5000 });
  const files = await page.evaluate(async (pid) => {
    const root = await (await navigator.storage.getDirectory()).getDirectoryHandle('작업폴더');
    for await (const [name, h] of root as unknown as AsyncIterable<[string, FileSystemDirectoryHandle]>) {
      if (!name.startsWith(pid)) continue;
      const json = JSON.parse(await (await (await h.getFileHandle('project.json')).getFile()).text());
      const script = await (await (await h.getFileHandle('script.txt')).getFile()).text();
      return { folder: name, steps: Object.keys(json.progress), scenes: json.scenes.length, scriptChars: script.length };
    }
    return null;
  }, id);
  expect(files).not.toBeNull();
  expect(files!.folder).toBe(`${id}_은혜 갚은 까치`);
  expect(files!.steps).toEqual(['0', '1', '2', '3']);
  expect(files!.scenes).toBe(count);
  expect(files!.scriptChars).toBeGreaterThan(600);
});

test('스키마 1.0 백업을 불러오면 1.1로 올린다', async ({ page }) => {
  await page.goto('/projects');
  const old = {
    schemaVersion: '1.0',
    id: 'proj_old001',
    title: '옛 백업',
    createdAt: '2026-10-18T20:00:00+09:00',
    updatedAt: '2026-10-18T20:00:00+09:00',
    source: { type: 'folktale', note: '전래 민담 줄거리 메모입니다', noCommercialBookConfirmed: true },
    target: { durationSec: 360, aspect: '16:9', series: '' },
    script: { outline: ['', '', '', ''], fullText: '', status: 'draft' },
    visualDNA: { stylePreset: null, customStyle: '', negatives: ['글자', '워터마크'], characters: [], locations: [] },
    scenes: [],
    voice: { service: 'typecast', voiceName: '', speed: 0.9, pauseSec: 0.6 },
    publish: { youtubeTitle: '', description: '', tags: [], aiDisclosure: true, policyChecks: {} },
    progress: {},
    log: [],
  };
  await page.getByTestId('app-import-text').fill(JSON.stringify(old));
  await page.getByTestId('app-import-submit').click();
  await expect(page).toHaveURL(/\/p\/proj_old001\/step\/0$/);
  await expect(page.getByTestId('app-log')).toContainText('스키마 1.1로 올렸습니다');
  await page.goto('/p/proj_old001/step/3');
  await expect(page.getByTestId('s3-negatives')).toHaveValue('글자, 워터마크');
});
