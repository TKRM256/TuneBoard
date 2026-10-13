/**
 * 長いシナリオ：バンド以外の提出フォーム（ダンス発表会の出演申込）で、
 * ライブを作る → 公開ページから提出 → 会場の書式を取り込んであてふり補助で組む → 保存 → PDF を出す、までを通す。
 */
import { expect, test } from '@playwright/test';

import {
  apiGet,
  apiPost,
  createTenant,
  DANCE_FORM_PDF,
  loginAsTestUser,
  submitRichEntry,
  applyDanceForm,
  type Live,
} from './support/api';
import { VenueEditor } from './support/venue-editor';

/** 書式（e2e/fixtures/dance-form.pdf）の幅と、表や欄の位置（mm）。 */
const PAGE_WIDTH_MM = 209.9;
const MEMBERS_TABLE = { from: { x: 13, y: 73.5 }, to: { x: 91.5, y: 122.5 } };
const TRACKS_TABLE = { from: { x: 93.5, y: 73.5 }, to: { x: 197, y: 122.5 } };
const GENRE_BOXES = [44.45, 70.45, 87.1, 104.4, 121.25].map((x) => ({ x, y: 50.25 }));
const LIVE_NAME = '合同ダンス発表会（シナリオ）';

test('バンド以外のフォームで、提出から会場の書式に書き込んだ PDF までを通す', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await loginAsTestUser(page, 'scenario');
  const tenant = await createTenant(page, 'シナリオ用サークル');
  let live!: Live;

  await test.step('画面からライブを作る（説明文は既定で空）', async () => {
    await page.goto(`/tenants/${tenant.id}/lives`);
    await page.getByRole('button', { name: '新規ライブ作成' }).click();
    await page.getByRole('textbox', { name: 'ライブ名' }).fill(LIVE_NAME);
    await page.getByRole('button', { name: '作成', exact: true }).click();
    await page.getByRole('button', { name: '本当に作成' }).click();
    await expect(page.getByText(LIVE_NAME)).toBeVisible();
    const lives = await apiGet<(Live & { name: string })[]>(page, `/lives/tenant/${tenant.id}/list`);
    live = lives.find((candidate) => candidate.name === LIVE_NAME)!;
    const config = await apiGet<{ description: string; blocks: { description: string }[] }>(page, `/lives/${live.id}/setting-sheet/config`);
    expect(config.description).toBe('');
    expect(config.blocks.every((block) => block.description === '')).toBe(true);
  });

  await test.step('提出フォームをダンス発表会用に作り替えて公開する', async () => {
    await applyDanceForm(page, live.id);
    await apiPost(page, '/lives/update', { id: live.id, name: LIVE_NAME, status: 'PUBLISHED' });
  });

  await test.step('公開ページから 1 件提出する', async () => {
    await page.goto(`/public/lives/${live.publicToken}`);
    await page.getByRole('textbox', { name: '団体名' }).fill('ステップスクエア');
    await page.getByRole('textbox', { name: '代表者' }).fill('山田 花子');
    await page.getByRole('combobox', { name: 'ジャンル' }).click();
    await page.getByRole('option', { name: 'K-POP', exact: true }).click();
    await page.getByText('スポット', { exact: true }).click();
    await page.getByRole('button', { name: '出演者を追加' }).click();
    await page.getByRole('textbox', { name: '名前' }).first().fill('さくら');
    await page.getByRole('button', { name: '申し込む' }).click();
    await expect(page.getByText('ライブフォームを送信しました。')).toBeVisible();
    await submitRichEntry(page, live.publicToken);
  });

  const editor = new VenueEditor(page, PAGE_WIDTH_MM);

  await test.step('書式の一覧から、会場の用紙（PDF）に書き込む書式を作る', async () => {
    await page.goto(`/tenants/${tenant.id}/lives/${live.id}/pdf-layouts`);
    await expect(page.getByText('書式はまだありません')).toBeVisible();
    await page.getByRole('button', { name: '書式を作る' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('名前').fill('会場書式');
    await dialog.getByText('会場の用紙に書き込む').click();
    // 用紙を選ぶまでは作れない
    await expect(dialog.getByRole('button', { name: '作る', exact: true })).toBeDisabled();
    await dialog.getByLabel('会場の用紙', { exact: true }).setInputFiles(DANCE_FORM_PDF);
    await expect(dialog.getByText('dance-form.pdf')).toBeVisible();
    await dialog.getByRole('button', { name: '作る', exact: true }).click();
    await expect(page.getByRole('textbox', { name: '書式の名前' })).toHaveValue('会場書式');
  });

  await test.step('取り込んだ用紙が 1 ページ目になり、罫線を読み取れる', async () => {
    await expect(page.getByRole('button', { name: /^1ページ目/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^2ページ目/ })).toHaveCount(0);
    await expect(editor.tool('罫線を表示')).toBeEnabled();
    await page.keyboard.press('Control+0');
  });

  await test.step('出演者の表を囲み、マスごとに項目を並べる', async () => {
    await editor.tool('表の欄に項目を並べる').click();
    await editor.drag(MEMBERS_TABLE.from, MEMBERS_TABLE.to);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('6行 × 4列');
    await dialog.locator('input[type=number]').first().fill('1');
    await editor.chooseInDialog(1, 'なし');
    await editor.chooseInDialog(2, '名前');
    await editor.chooseInDialog(3, '学年');
    await editor.chooseInDialog(4, '立ち位置');
    await expect(dialog).toContainText('1〜5件目を書きます');
    await editor.confirmDialog('並べる');
    await expect(editor.elements()).toHaveCount(15);
    expect(await editor.selectionText()).toBe('15件選択中');
  });

  await test.step('並べた直後の 15 個をまとめて 8pt にする', async () => {
    await editor.panelNumber(4).fill('8');
    await expect(editor.panelNumber(4)).toHaveValue('8');
  });

  await test.step('使用音源の表も並べる', async () => {
    await editor.tool('表の欄に項目を並べる').click();
    await editor.drag(TRACKS_TABLE.from, TRACKS_TABLE.to);
    await editor.chooseInDialog(0, '使用音源');
    await page.getByRole('dialog').locator('input[type=number]').first().fill('1');
    await editor.chooseInDialog(1, 'なし');
    await editor.chooseInDialog(2, '曲名');
    await editor.chooseInDialog(3, '尺');
    await editor.chooseInDialog(4, 'きっかけ');
    await editor.confirmDialog('並べる');
    await expect(editor.elements()).toHaveCount(27);
  });

  await test.step('団体名を置き、ダブルクリックで枠いっぱいにする（文字の大きさは変えない）', async () => {
    await editor.placeField('団体情報 > 団体名');
    await expect(editor.elements()).toHaveCount(28);
    await editor.panelNumber(0).fill('90');
    await editor.panelNumber(1).fill('31');
    await editor.elements().last().locator('> div').first().dblclick();
    const [x, y, w] = await editor.panelNumbers(3);
    expect(x).toBeCloseTo(38.7, 0);
    expect(y).toBeCloseTo(30.8, 0);
    expect(w).toBeCloseTo(156.7, 0);
    await expect(editor.panelNumber(4)).toHaveValue('10');
  });

  await test.step('ジャンルの □ に ✓ を順に置く（案内は「ジャンルが ○○ の場合」）', async () => {
    await editor.tool('選択肢の印を置く').click();
    await editor.chooseInDialog(0, '団体情報 > ジャンル');
    await editor.confirmDialog('始める');
    await expect(editor.root()).toContainText('ジャンルが ヒップホップ の場合');
    for (const box of GENRE_BOXES) await editor.click(box);
    await expect(page.getByText('5個の印を置きました')).toBeVisible();
    await expect(editor.elements()).toHaveCount(33);
  });

  await test.step('出演枠と小道具は ○ で囲む', async () => {
    for (const [field, boxes] of [
      ['団体情報 > 出演枠', [[{ x: 42, y: 55.2 }, { x: 55, y: 61.5 }], [{ x: 62.5, y: 55.2 }, { x: 75.5, y: 61.5 }]]],
      ['団体情報 > 小道具あり', [[{ x: 144, y: 55.2 }, { x: 152.5, y: 61.5 }], [{ x: 158.5, y: 55.2 }, { x: 167, y: 61.5 }]]],
    ] as const) {
      await editor.tool('選択肢の印を置く').click();
      await editor.chooseInDialog(0, field);
      await editor.chooseInDialog(1, '○ 囲み');
      await editor.confirmDialog('始める');
      for (const [from, to] of boxes) await editor.drag(from, to);
    }
    await expect(editor.elements()).toHaveCount(37);
  });

  await test.step('何もないところから四角で囲み、出演者の表だけを選ぶ', async () => {
    await page.keyboard.press('Escape');
    await editor.drag({ x: 12, y: 72 }, { x: 92, y: 123 });
    expect(await editor.selectionText()).toBe('15件選択中');
  });

  await test.step('保存して読み込み直しても残っている', async () => {
    await editor.save();
    await page.reload();
    await expect(editor.elements()).toHaveCount(37);
  });

  await test.step('書ききれない 6 人目を警告し、PDF を出せる', async () => {
    const submissions = await apiGet<{ id: string; recordLabel: string }[]>(page, `/lives/${live.id}/setting-sheet/submissions`);
    const rich = submissions.find((submission) => submission.recordLabel.startsWith('国際文化大学'))!;
    const [layout] = await apiGet<{ id: string; name: string }[]>(page, `/lives/${live.id}/pdf-layouts`);
    expect(layout.name).toBe('会場書式');
    const check = await apiPost<{ warnings: string[] }>(page, `/lives/${live.id}/pdf-layouts/check`, { submissionId: rich.id, layoutId: layout.id });
    expect(check.warnings.join('\n')).toContain('入りきらない回答が1件');
    const pdf = await page.request.post(`/api/lives/${live.id}/pdf-layouts/submissions/${rich.id}/pdf`, {
      data: { layoutId: layout.id }, headers: { 'X-Requested-With': 'TuneBoard' },
    });
    expect(pdf.ok()).toBeTruthy();
    expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');
  });

  await test.step('エディタのプレビューで、提出を前後に送って順に確かめられる', async () => {
    await page.getByRole('button', { name: 'プレビュー' }).click();
    const dialog = page.getByRole('dialog');
    const submissions = await apiGet<unknown[]>(page, `/lives/${live.id}/setting-sheet/submissions`);
    await expect(dialog.getByText(`1 / ${submissions.length}`)).toBeVisible();
    await dialog.getByRole('button', { name: '次の提出' }).click();
    await expect(dialog.getByText(`2 / ${submissions.length}`)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'このPDFを保存' })).toBeEnabled();
    await page.keyboard.press('Escape');
  });

  await test.step('エディタの「PDF出力」で、すべての提出を Zip で保存できる', async () => {
    await page.getByRole('button', { name: 'PDF出力' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: /すべての提出/ })).toBeChecked();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: /件をZipで保存/ }).click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  });

  await test.step('白紙のページの用紙を A4 から A5 にすると、置いた要素も縮む', async () => {
    await page.getByRole('button', { name: '白紙を足す' }).click();
    await expect(page.getByRole('button', { name: /^2ページ目/ })).toBeVisible();
    await page.getByRole('button', { name: 'テキスト', exact: true }).click();
    await editor.panelNumber(2).fill('100');
    await expect(editor.panelNumber(2)).toHaveValue('100');
    await page.getByRole('combobox', { name: '用紙' }).click();
    await page.getByRole('option', { name: 'A5', exact: true }).click();
    // A5 の幅は A4 の 148 / 210
    expect(Number(await editor.panelNumber(2).inputValue())).toBeCloseTo(70.48, 1);
  });

  await test.step('提出確認の「全件をPDF出力」で書式を選んで保存できる', async () => {
    await page.goto(`/tenants/${tenant.id}/lives/${live.id}/submissions`);
    await page.getByRole('button', { name: '全件をPDF出力' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('会場書式')).toBeVisible();
    await expect(dialog.getByText('フォームの項目を並べる')).toBeVisible();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: /Zipで保存/ }).click();
    expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  });

  expect(pageErrors).toEqual([]);
});
