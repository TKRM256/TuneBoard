/** 「使い方」を押すと画面の上で案内が始まり、最後まで進められる（勝手には始まらない）。 */
import { expect, test, type Page } from '@playwright/test';

import { apiGet, prepareVenueForm } from './support/api';
import { FORM_EDITOR_TOUR } from '../src/features/tutorial/tours/form-editor-tour';
import { SUBMISSIONS_TOUR } from '../src/features/tutorial/tours/submissions-tour';
import { VENUE_FORM_TOUR } from '../src/features/tutorial/tours/venue-form-tour';

async function runTour(page: Page, total: number) {
  await expect(page.locator('.driver-popover')).toHaveCount(0);
  await page.getByRole('button', { name: '使い方' }).click();
  for (let step = 1; step <= total; step++) {
    await expect(page.locator('.driver-popover-progress-text')).toHaveText(`${step} / ${total}`);
    await page.locator('.driver-popover-next-btn').click();
  }
  await expect(page.locator('.driver-popover')).toHaveCount(0);
}

test('3 つの画面の使い方を最後まで進められる', async ({ page }) => {
  await page.goto('/');
  const { tenant, live } = await prepareVenueForm(page, 'tutorial');

  await test.step('会場書式', async () => {
    await page.goto(`/tenants/${tenant.id}/lives/${live.id}/venue-form`);
    await expect(page.getByText('会場書式', { exact: true })).toBeVisible();
    await runTour(page, VENUE_FORM_TOUR.length);
  });

  await test.step('提出確認', async () => {
    await page.goto(`/tenants/${tenant.id}/lives/${live.id}/submissions`);
    await expect(page.getByText('提出一覧')).toBeVisible();
    await runTour(page, SUBMISSIONS_TOUR.length);
  });

  await test.step('フォーム作成', async () => {
    const config = await apiGet<{ blocks: unknown[] }>(page, `/lives/${live.id}/setting-sheet/config`);
    expect(config.blocks.length).toBeGreaterThan(0);
    await page.goto(`/tenants/${tenant.id}/lives/${live.id}/form`);
    await expect(page.getByText('ブロック構成')).toBeVisible();
    await runTour(page, FORM_EDITOR_TOUR.length);
  });
});
