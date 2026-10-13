/** スマホの幅で、出演者の提出から管理者の確認・書式づくりまでを通す。 */
import { devices, expect, test } from '@playwright/test';

import { apiGet, applyDanceForm, createLive, createTenant, submitRichEntry } from './support/api';
import { collectPageErrors, joinTenant, performer, signIn } from './support/users';

const PHONE = { viewport: devices['iPhone 13'].viewport, isMobile: true, hasTouch: true };

test('スマホで提出し、管理者が提出を順に読み、書式を作って保存できる', async ({ browser }) => {
  const owner = await signIn(browser, 'sp-owner', 'スマホ代表', PHONE);
  const tenant = await createTenant(owner.page, 'スマホサークル');
  const live = await createLive(owner.page, tenant.id, 'スマホライブ');
  await applyDanceForm(owner.page, live.id);
  await submitRichEntry(owner.page, live.publicToken);
  const livePath = `/tenants/${tenant.id}/lives/${live.id}`;
  const errors = collectPageErrors(owner.page);

  await test.step('出演者がスマホで出演者を足して提出できる', async () => {
    const dancer = await performer(browser, PHONE);
    errors.push(...collectPageErrors(dancer.page));
    await dancer.page.goto(`/public/lives/${live.publicToken}`);
    await dancer.page.getByRole('textbox', { name: '団体名' }).fill('スマホから出るチーム');
    await dancer.page.getByRole('button', { name: '出演者を追加' }).click();
    await dancer.page.getByRole('textbox', { name: '名前' }).first().fill('はると');
    // 送信ボタンは画面の下に貼り付いていて、スクロールしなくても押せる
    await expect(dancer.page.getByRole('button', { name: '申し込む' })).toBeInViewport();
    await dancer.page.getByRole('button', { name: '申し込む' }).click();
    await expect(dancer.page.getByText('ライブフォームを送信しました。')).toBeVisible();
    await dancer.close();
  });

  await test.step('提出一覧で提出を押すと詳細が開き、前後に送って閉じると一覧に戻る', async () => {
    await owner.page.goto(`${livePath}/submissions`);
    await expect(owner.page.getByRole('tab', { name: /提出一覧/ })).toHaveAttribute('aria-selected', 'true');
    await owner.page.getByText('スマホから出るチーム', { exact: true }).click();
    const dialog = owner.page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'スマホから出るチーム' })).toBeVisible();
    await expect(dialog.getByText('はると').first()).toBeVisible();
    await expect(dialog.getByText('1 / 2')).toBeVisible();
    await dialog.getByRole('button', { name: '次の提出' }).click();
    await expect(dialog.getByText('2 / 2')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '次の提出' })).toBeDisabled();
    // 下の帯は 1 行に収まる（閉じるは右上の × だけ）
    const footer = await dialog.getByRole('button', { name: '編集リンクをコピー' }).boundingBox();
    const exportButton = await dialog.getByRole('button', { name: 'PDF出力' }).boundingBox();
    expect(Math.abs((footer?.y ?? 0) - (exportButton?.y ?? 0))).toBeLessThan(4);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(owner.page.getByRole('dialog')).toHaveCount(0);
    await expect(owner.page).not.toHaveURL(/submission=/);
  });

  await test.step('戻る操作でも詳細を閉じられる', async () => {
    await owner.page.getByText('スマホから出るチーム', { exact: true }).click();
    await expect(owner.page.getByRole('dialog')).toBeVisible();
    await owner.page.goBack();
    await expect(owner.page.getByRole('dialog')).toHaveCount(0);
    await expect(owner.page).toHaveURL(new RegExp(`${livePath}/submissions$`));
  });

  await test.step('曲かぶりのタブに切り替えられる', async () => {
    await owner.page.getByRole('tab', { name: /曲かぶり/ }).click();
    await expect(owner.page.getByText(/曲かぶり検出/)).toBeVisible();
  });

  await test.step('テンプレートから書式を作り、スマホのエディタで数値を消して打ち直し、保存できる', async () => {
    await owner.page.goto(`${livePath}/pdf-layouts`);
    await owner.page.getByRole('button', { name: '書式を作る' }).click();
    await owner.page.getByRole('dialog').getByRole('button', { name: '作る', exact: true }).click();
    await expect(owner.page.getByRole('tab', { name: '書式' })).toBeVisible();
    await owner.page.locator('.react-draggable').filter({ hasText: '使用音源を' }).click();
    await expect(owner.page.getByRole('tab', { name: '設定' })).toHaveAttribute('aria-selected', 'true');
    const x = owner.page.getByRole('textbox', { name: 'X (mm)' });
    await x.click();
    await x.press('Control+a');
    await x.press('Backspace');
    await expect(x).toHaveValue('');
    await x.pressSequentially('12');
    await expect(x).toHaveValue('12');
    await owner.page.getByRole('button', { name: /^保存/ }).click();
    await expect(owner.page.getByText('書式を保存しました')).toBeVisible();
    const [layout] = await apiGet<{ id: string }[]>(owner.page, `/lives/${live.id}/pdf-layouts`);
    const saved = await apiGet<{ document: { elements: { kind: string; xMm: number }[] } }>(owner.page, `/lives/${live.id}/pdf-layouts/${layout.id}`);
    expect(saved.document.elements.some((element) => element.kind === 'grid' && element.xMm === 12)).toBeTruthy();
  });

  await test.step('メンバーのスマホには、設定の入口が出ない', async () => {
    const member = await signIn(browser, 'sp-member', 'スマホ部員', PHONE);
    await joinTenant(owner.page, member.page, tenant.id, 'MEMBER');
    await member.page.goto(livePath);
    await expect(member.page.getByRole('link', { name: '提出確認', exact: true })).toBeVisible();
    await expect(member.page.getByRole('link', { name: 'フォーム編集' })).toHaveCount(0);
    await expect(member.page.getByRole('link', { name: '表示設定' })).toHaveCount(0);
    await member.close();
  });

  expect(errors).toEqual([]);
  await owner.close();
});
