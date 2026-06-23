import { expect, test, type Page } from '@playwright/test';

const demoPassword = process.env.SEED_USER_PASSWORD ?? 'sourcewiki-demo-password';

async function login(page: Page, email: string) {
  await page.goto('/login?returnTo=%2Fsources');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(demoPassword);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/\/sources/);
}

test('signup, email verification, and session restoration', async ({ page, request }) => {
  test.setTimeout(60_000);
  const email = `browser-${Date.now()}@example.test`;
  await page.goto('/signup');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('닉네임').fill('브라우저검증');
  await page.locator('input[type="password"]').nth(0).fill('password123');
  await page.locator('input[type="password"]').nth(1).fill('password123');
  await page.getByRole('button', { name: '인증 메일 받기' }).click();
  await expect(page).toHaveURL(/\/verify-email\/pending/);

  await expect
    .poll(async () => {
      const response = await request.get('http://localhost:8025/api/v1/messages');
      const payload = (await response.json()) as {
        messages?: { ID: string; To?: { Address: string }[] }[];
      };
      return (
        payload.messages?.find((message) => message.To?.some(({ Address }) => Address === email))
          ?.ID ?? ''
      );
    })
    .not.toBe('');
  const inbox = await request.get('http://localhost:8025/api/v1/messages');
  const messages = (await inbox.json()) as {
    messages: { ID: string; To?: { Address: string }[] }[];
  };
  const id = messages.messages.find((message) =>
    message.To?.some(({ Address }) => Address === email),
  )!.ID;
  const message = (await (
    await request.get(`http://localhost:8025/api/v1/message/${id}`)
  ).json()) as { Text: string };
  const verificationUrl = message.Text.match(
    /http:\/\/localhost:3000\/verify-email\?token=[^\s]+/,
  )?.[0];
  expect(verificationUrl).toBeTruthy();
  await page.goto(verificationUrl!);
  await expect(page.getByRole('heading', { name: /인증/ })).toBeVisible();

  await page.goto('/login');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill('password123');
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '로그인' }).click();
  expect((await loginResponse).ok()).toBe(true);
  await expect(page).toHaveURL('/');
  await expect(page.getByText('브라우저검증')).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.getByText('브라우저검증')).toBeVisible({ timeout: 10_000 });
});

test('source and comment CRUD enforce owner UI', async ({ page }) => {
  await login(page, 'archive.owner@example.test');
  await page.goto('/sources/new');
  const title = `브라우저 자료 ${Date.now()}`;
  await page.getByLabel('자료 제목 *').fill(title);
  await page.getByLabel('원본 URL *').fill('https://example.com/e2e-source');
  await page.getByLabel('태그').fill('E2E, Architecture');
  await page.getByRole('button', { name: '자료 저장' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByLabel('생각을 덧붙여 주세요').fill('브라우저에서 남긴 댓글');
  await page.getByRole('button', { name: '댓글 등록' }).click();
  await expect(page.getByText('브라우저에서 남긴 댓글')).toBeVisible();
  const sourceUrl = page.url();

  await page.getByRole('button', { name: '로그아웃' }).click();
  await login(page, 'curious.reader@example.test');
  await page.goto(sourceUrl);
  await expect(page.getByRole('link', { name: '수정' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(0);

  await page.getByRole('button', { name: '로그아웃' }).click();
  await login(page, 'archive.owner@example.test');
  await page.goto(sourceUrl);
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('.detail-actions').getByRole('button', { name: '삭제' }).click();
  await expect(page).toHaveURL(/\/sources$/);
});

test('seed data provides a second page', async ({ page }) => {
  await page.goto('/sources?page=1');
  await expect(page.getByText(/개의 자료가 축적/)).toBeVisible();
  await page.getByRole('link', { name: '다음 →' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.source-card')).not.toHaveCount(0);
});
