/** 開発用のダミーデータ：初めてログインした人には、形の違うフォームを使う 3 つのテナントが用意される。 */
import { expect, test } from '@playwright/test';

import { apiGet, loginAsTestUser } from './support/api';

interface Tenant {
  id: string;
  name: string;
}

interface LiveSummary {
  id: string;
  name: string;
  publicToken: string;
}

test('ダミーデータは既定のフォームと、形の違う 2 つのフォームで用意される', async ({ page }) => {
  await page.goto('/');
  await loginAsTestUser(page, 'demo-seed');
  await page.goto('/tenants');
  for (const name of ['デモサークル', 'ダンス部 STEP', '合同ライブ運営チーム']) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }

  const tenants = await apiGet<Tenant[]>(page, '/tenants/list');
  const livesOf = async (name: string) => {
    const tenant = tenants.find((candidate) => candidate.name === name)!;
    return { tenant, lives: await apiGet<LiveSummary[]>(page, `/lives/tenant/${tenant.id}/list`) };
  };

  await test.step('デモサークルは既定のバンド向けフォーム', async () => {
    const { lives } = await livesOf('デモサークル');
    const config = await apiGet<{ blocks: { id: string }[] }>(page, `/lives/${lives[0].id}/setting-sheet/config`);
    expect(config.blocks.map((block) => block.id)).toContain('setlist');
  });

  await test.step('合同フェスの公開ページに、出演者の中の機材や演目の種類が出る', async () => {
    const { lives } = await livesOf('合同ライブ運営チーム');
    const fes = lives.find((live) => live.name === '合同フェス 2026')!;
    await page.goto(`/public/lives/${fes.publicToken}`);
    await expect(page.getByRole('textbox', { name: '出演名' })).toBeVisible();
    await expect(page.getByText('機材の持ち込みは事前に申請する')).toBeVisible();
    await page.getByRole('button', { name: '出演者を追加' }).click();
    await expect(page.getByRole('button', { name: '機材を追加' })).toHaveCount(2);
    // 演目は種類ごとに追加ボタンがあり、種類によって書く項目が変わる
    for (const kind of ['曲', 'トーク', '転換']) await expect(page.getByRole('button', { name: kind, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'トーク', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '話す内容' })).toBeVisible();
    await expect(page.getByText('出演順')).toHaveCount(0);
  });

  await test.step('ダンス部の提出一覧に、ダンス用の提出が並ぶ', async () => {
    const { tenant, lives } = await livesOf('ダンス部 STEP');
    const spring = lives.find((live) => live.name === '春の発表会 2026')!;
    await page.goto(`/tenants/${tenant.id}/lives/${spring.id}/submissions`);
    await expect(page.getByText('ステップスクエア').first()).toBeVisible();
    const submissions = await apiGet<unknown[]>(page, `/lives/${spring.id}/setting-sheet/submissions`);
    expect(submissions).toHaveLength(12);
  });
});
