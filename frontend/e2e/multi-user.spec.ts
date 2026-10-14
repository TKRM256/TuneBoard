/**
 * 複数の人が同時に操作するときのシナリオ。管理者 2 人・メンバー 1 人・出演者 2 人を別々のブラウザで動かし、
 * 後から保存した人が先の人の変更を黙って消さないこと、権限のない操作が止まることを確かめる。
 */
import { expect, test } from '@playwright/test';

import { apiGet, apiPost, applyDanceForm, createLive, createTenant, submitRichEntry } from './support/api';
import { collectPageErrors, joinTenant, performer, signIn } from './support/users';

test('管理者 2 人・メンバー・出演者が同時に操作しても、変更が黙って消えない', async ({ browser }) => {
  const owner = await signIn(browser, 'mu-owner', '代表');
  const admin = await signIn(browser, 'mu-admin', '副代表');
  const member = await signIn(browser, 'mu-member', '部員');
  const tenant = await createTenant(owner.page, '同時操作サークル');
  const live = await createLive(owner.page, tenant.id, '同時操作ライブ');
  await applyDanceForm(owner.page, live.id);
  await joinTenant(owner.page, admin.page, tenant.id, 'ADMIN');
  await joinTenant(owner.page, member.page, tenant.id, 'MEMBER');
  const errors = collectPageErrors(owner.page, admin.page, member.page);
  const livePath = `/tenants/${tenant.id}/lives/${live.id}`;

  await test.step('2 人が同じフォームを開き、後から保存した人には他の人の更新を知らせる', async () => {
    await owner.page.goto(`${livePath}/form`);
    await admin.page.goto(`${livePath}/form`);
    // 2 人とも読み込み終えてから、片方が先に保存する
    for (const user of [owner, admin]) await expect(user.page.getByLabel('フォームタイトル')).toHaveValue('ダンス発表会 出演申込');
    await owner.page.getByLabel('フォームタイトル').fill('代表が直したタイトル');
    await owner.page.getByRole('button', { name: '保存する' }).click();
    await expect(owner.page.getByText('フォーム設定を保存しました')).toBeVisible();

    await admin.page.getByLabel('フォーム説明').fill('副代表が足した説明');
    await admin.page.getByRole('button', { name: '保存する' }).click();
    await expect(admin.page.getByText(/他の人がフォームの設定を更新しました/)).toBeVisible();
    const saved = await apiGet<{ title: string; description: string }>(owner.page, `/lives/${live.id}/setting-sheet/config`);
    expect(saved.title).toBe('代表が直したタイトル');
    expect(saved.description).toBe('');
  });

  await test.step('読み込み直すと、先の人の変更の上に自分の変更を足して保存できる', async () => {
    await admin.page.reload();
    await expect(admin.page.getByLabel('フォームタイトル')).toHaveValue('代表が直したタイトル');
    await admin.page.getByLabel('フォーム説明').fill('副代表が足した説明');
    await admin.page.getByRole('button', { name: '保存する' }).click();
    await expect(admin.page.getByText('フォーム設定を保存しました')).toBeVisible();
    const saved = await apiGet<{ title: string; description: string }>(owner.page, `/lives/${live.id}/setting-sheet/config`);
    expect(saved).toMatchObject({ title: '代表が直したタイトル', description: '副代表が足した説明' });
  });

  await test.step('表示設定を変えたあとに、古いフォーム編集の画面から保存しても表示設定を消さない', async () => {
    await owner.page.goto(`${livePath}/form`);
    await expect(owner.page.getByLabel('フォームタイトル')).toHaveValue('代表が直したタイトル');
    await admin.page.goto(`${livePath}/settings`);
    await admin.page.getByRole('button', { name: '全て非表示' }).first().click();
    await admin.page.getByRole('button', { name: '保存する' }).click();
    await expect(admin.page.getByText(/保存しました/)).toBeVisible();

    await owner.page.getByLabel('送信ボタン文言').fill('申し込む！');
    await owner.page.getByRole('button', { name: '保存する' }).click();
    await expect(owner.page.getByText(/他の人がフォームの設定を更新しました/)).toBeVisible();
  });

  await test.step('PDF 書式も、2 人が同時に保存すると後の人に知らせる', async () => {
    const layout = await apiPost<{ id: string }>(owner.page, `/lives/${live.id}/pdf-layouts`, { name: '標準', source: 'FORM' });
    await owner.page.goto(`${livePath}/pdf-layouts/${layout.id}`);
    await admin.page.goto(`${livePath}/pdf-layouts/${layout.id}`);
    for (const user of [owner, admin]) await expect(user.page.getByRole('textbox', { name: '書式の名前' })).toHaveValue('標準');
    await owner.page.getByRole('textbox', { name: '書式の名前' }).fill('代表の書式');
    await owner.page.getByRole('button', { name: /^保存/ }).click();
    await expect(owner.page.getByText('書式を保存しました')).toBeVisible();

    await admin.page.getByRole('textbox', { name: '書式の名前' }).fill('副代表の書式');
    await admin.page.getByRole('button', { name: /^保存/ }).click();
    await expect(admin.page.getByText(/他の人がこの書式を更新しました/)).toBeVisible();
    const saved = await apiGet<{ name: string }>(owner.page, `/lives/${live.id}/pdf-layouts/${layout.id}`);
    expect(saved.name).toBe('代表の書式');
  });

  await test.step('メンバーは設定の画面を開けず、API でも変えられない', async () => {
    for (const page of ['form', 'settings']) {
      await member.page.goto(`${livePath}/${page}`);
      await expect(member.page).toHaveURL(new RegExp(`${livePath}$`));
    }
    const response = await member.page.request.post(`/api/lives/${live.id}/setting-sheet/config`, {
      data: { title: 'x', description: '', submitButtonLabel: 'x', publicSubmissionEnabled: true, blocks: [] },
      headers: { 'X-Requested-With': 'TuneBoard' },
    });
    // 管理者でない人には、ライブがあることも見せない
    expect([403, 404]).toContain(response.status());
    const config = await apiGet<{ title: string }>(owner.page, `/lives/${live.id}/setting-sheet/config`);
    expect(config.title).toBe('代表が直したタイトル');
  });

  await test.step('メンバーは書式を見られるが、作る・消す・保存はできない', async () => {
    await member.page.goto(`${livePath}/pdf-layouts`);
    await expect(member.page.getByText('代表の書式')).toBeVisible();
    await expect(member.page.getByRole('button', { name: '書式を作る' })).toHaveCount(0);
    await expect(member.page.getByRole('button', { name: /を消す$/ })).toHaveCount(0);
    await member.page.getByText('代表の書式').click();
    await expect(member.page.getByRole('heading', { name: '代表の書式' })).toBeVisible();
    await expect(member.page.getByRole('button', { name: /^保存/ })).toHaveCount(0);
  });

  await test.step('出演者 2 人が同時に提出しても、両方とも一覧に並ぶ', async () => {
    const first = await performer(browser);
    const second = await performer(browser);
    await Promise.all([submitRichEntry(first.page, live.publicToken), submitRichEntry(second.page, live.publicToken)]);
    await first.close();
    await second.close();
    const submissions = await apiGet<unknown[]>(member.page, `/lives/${live.id}/setting-sheet/submissions`);
    expect(submissions).toHaveLength(2);
  });

  await test.step('同じ提出を 2 人の出演者が編集すると、後から送った人は食い違いを選び直せる', async () => {
    const [submission] = await apiGet<{ id: string }[]>(owner.page, `/lives/${live.id}/setting-sheet/submissions`);
    const first = await performer(browser);
    const second = await performer(browser);
    const editPath = `/public/lives/${live.publicToken}/submissions/${submission.id}`;
    await first.page.goto(editPath);
    await second.page.goto(editPath);
    // 2 人とも読み込み終えてから、片方が先に送る
    for (const user of [first, second]) await expect(user.page.getByRole('textbox', { name: '団体名' })).not.toHaveValue('');
    await first.page.getByRole('textbox', { name: '団体名' }).fill('先に直したチーム名');
    await first.page.getByRole('button', { name: '更新する' }).click();
    await expect(first.page.getByText(/送信しました|更新しました/)).toBeVisible();

    await second.page.getByRole('textbox', { name: '団体名' }).fill('後から直したチーム名');
    await second.page.getByRole('button', { name: '更新する' }).click();
    await expect(second.page.getByRole('dialog')).toContainText('先に直したチーム名');
    await first.close();
    await second.close();
  });

  await test.step('出演者がフォームを開いている間に管理者が必須の項目を足すと、読み込み直しを勧め、入力は残る', async () => {
    const dancer = await performer(browser);
    errors.push(...collectPageErrors(dancer.page));
    await dancer.page.goto(`/public/lives/${live.publicToken}`);
    await dancer.page.getByRole('textbox', { name: '団体名' }).fill('あとから出すチーム');

    const current = await apiGet<Record<string, unknown> & { blocks: Record<string, unknown>[] }>(owner.page, `/lives/${live.id}/setting-sheet/config`);
    const added = { ...current.blocks[current.blocks.length - 1], id: 'emergency', type: 'SHORT_TEXT', label: '緊急連絡先', required: true, fields: [], options: [], variants: [] };
    await apiPost(owner.page, `/lives/${live.id}/setting-sheet/config`, { ...current, baseRevision: current.revision, blocks: [...current.blocks, added] });

    await dancer.page.getByRole('button', { name: '申し込む' }).click();
    await expect(dancer.page.getByText(/フォームが新しくなりました/)).toBeVisible();
    await dancer.page.getByRole('button', { name: '読み込み直す' }).click();
    // 読み込み直すと足された項目が出て、入力は下書きから戻る
    await expect(dancer.page.getByRole('textbox', { name: '緊急連絡先' })).toBeVisible();
    await expect(dancer.page.getByRole('textbox', { name: '団体名' })).toHaveValue('あとから出すチーム');
    const submissions = await apiGet<{ recordLabel: string }[]>(owner.page, `/lives/${live.id}/setting-sheet/submissions`);
    expect(submissions.map((submission) => submission.recordLabel)).not.toContain('あとから出すチーム');
    await dancer.close();
  });

  await test.step('片方の管理者が消した提出を、もう片方が開いたままでも画面が壊れない', async () => {
    await admin.page.goto(`${livePath}/submissions`);
    const submissions = await apiGet<{ id: string; recordLabel: string }[]>(owner.page, `/lives/${live.id}/setting-sheet/submissions`);
    const target = submissions[submissions.length - 1];
    // 一覧を読み込み終えてから、もう片方が消す
    await expect(admin.page.getByText(target.recordLabel, { exact: true }).first()).toBeVisible();
    const deleted = await owner.page.request.post(`/api/lives/${live.id}/setting-sheet/submissions/${target.id}/delete`, {
      data: {}, headers: { 'X-Requested-With': 'TuneBoard' },
    });
    expect(deleted.ok()).toBeTruthy();
    await admin.page.getByText(target.recordLabel, { exact: true }).first().click();
    const dialog = admin.page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'PDF出力' }).click();
    await expect(admin.page).toHaveURL(new RegExp(`pdf-layouts\\?ids=${target.id}`));
    await admin.page.getByRole('button', { name: 'テンプレートで保存' }).click();
    await expect(admin.page.getByText(/見つかりません|失敗しました/)).toBeVisible();
  });

  expect(errors).toEqual([]);
  await Promise.all([owner.close(), admin.close(), member.close()]);
});
