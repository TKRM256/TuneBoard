/** 複数の人を、それぞれ別のブラウザ（Cookie を分けた別の context）で動かす。 */
import type { Browser, BrowserContextOptions, Page } from '@playwright/test';

import { apiPost, loginAsTestUser } from './api';

export interface User {
  page: Page;
  close: () => Promise<void>;
}

/** ログインした管理者・メンバー。key ごとに別のユーザーになる。 */
export async function signIn(browser: Browser, key: string, name: string, options?: BrowserContextOptions): Promise<User> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto('/');
  await loginAsTestUser(page, key, name);
  return { page, close: () => context.close() };
}

/** ログインしない出演者。 */
export async function performer(browser: Browser, options?: BrowserContextOptions): Promise<User> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

/** owner がテナントへ招待し、user が受け入れる。 */
export async function joinTenant(owner: Page, user: Page, tenantId: string, role: 'ADMIN' | 'MEMBER') {
  const invitation = await apiPost<{ token: string }>(owner, `/tenants/${tenantId}/invitations`, { role });
  const response = await user.request.post(`/api/invitations/${invitation.token}/accept`, { headers: { 'X-Requested-With': 'TuneBoard' } });
  if (!response.ok()) throw new Error(`accept failed: ${response.status()} ${await response.text()}`);
}

/** 画面で起きた例外を集める（最後に空であることを確かめる）。 */
export function collectPageErrors(...pages: Page[]) {
  const errors: string[] = [];
  for (const page of pages) page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}
