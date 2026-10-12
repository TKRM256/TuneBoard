/** 会場書式エディタの編集操作：Alt での吸着、次の件の貼り付け（罫線の下の枠へ）、元に戻す・やり直し。 */
import { expect, test } from '@playwright/test';

import { prepareVenueForm } from './support/api';
import { VenueEditor } from './support/venue-editor';

const PAGE_WIDTH_MM = 209.9;
/** 書式の「団体名」の行の上下の線（mm） */
const TEAM_ROW = { top: 30.3, bottom: 38.2 };
/** 出演者の表の各行の上の線（mm）。見出しの次の行から */
const MEMBER_ROW_TOPS = [82.7, 89.6, 96.7, 107.5, 114.7];
const MEMBER_TABLE_BOTTOM = 121.6;
/** 枠の内側に空ける余白（mm） */
const PADDING = 0.5;
/** 書式から読み取った罫線の位置は、上の値と 0.1mm 程度ずれることがある */
const TOLERANCE_MM = 0.2;

function expectNear(actual: number, expected: number) {
  expect(Math.abs(actual - expected), `${actual} ≒ ${expected}`).toBeLessThan(TOLERANCE_MM);
}

test('Alt を押している間だけ罫線に吸い付く', async ({ page }) => {
  const { tenant, live } = await prepareVenueForm(page, 'snap');
  const editor = new VenueEditor(page, PAGE_WIDTH_MM);
  await editor.open(tenant.id, live.id);
  await page.keyboard.press('Control+0');

  await page.locator('aside').first().getByRole('button', { name: 'テキスト' }).click();
  await editor.panelNumber(0).fill('40');
  await editor.panelNumber(1).fill('29');
  const text = editor.elements().last();

  await editor.dragElement(text, { x: 0, y: 2 });
  const [, freeY] = await editor.panelNumbers(2);
  expect(freeY).toBeCloseTo(31, 1);

  await page.keyboard.press('Control+z');
  await expect(editor.panelNumber(1)).toHaveValue('29');
  await editor.dragElement(text, { x: 0, y: 2 }, { alt: true });
  const [, snappedY, , height] = await editor.panelNumbers(4);
  const onLine = [snappedY, snappedY + height].some((edge) => [TEAM_ROW.top, TEAM_ROW.bottom].some((line) => Math.abs(edge - line) < 0.15));
  expect(onLine, `y=${snappedY} h=${height}`).toBe(true);
});

test('Ctrl+Shift+V で次の件を同じ表の下の枠に置き、表の外では真下にずらす', async ({ page }) => {
  const { tenant, live } = await prepareVenueForm(page, 'paste');
  const editor = new VenueEditor(page, PAGE_WIDTH_MM);
  await editor.open(tenant.id, live.id);
  await page.keyboard.press('Control+0');

  await test.step('見出しと 1 行目だけを囲んで、1 件目の欄を作る', async () => {
    await editor.tool('表の欄に項目を並べる').click();
    await editor.drag({ x: 13, y: 73.5 }, { x: 91.5, y: 91 });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('2行 × 4列');
    await dialog.locator('input[type=number]').first().fill('1');
    await editor.chooseInDialog(1, 'なし');
    await editor.chooseInDialog(2, '名前');
    await editor.chooseInDialog(3, '学年');
    await editor.chooseInDialog(4, '立ち位置');
    await editor.confirmDialog('並べる');
    await expect(editor.elements()).toHaveCount(3);
    expectNear(Number(await editor.panelNumber(1).inputValue()), MEMBER_ROW_TOPS[0] + PADDING);
  });

  await test.step('続けて貼ると、1 行ずつ下の枠に入り、何件目かも進む', async () => {
    await page.keyboard.press('Control+c');
    for (const top of MEMBER_ROW_TOPS.slice(1)) {
      await page.keyboard.press('Control+Shift+V');
      expectNear(Number(await editor.panelNumber(1).inputValue()), top + PADDING);
    }
    await expect(editor.elements()).toHaveCount(15);
    // 見本の提出（出演者 6 人）の 5 人目まで、それぞれの行に出る
    for (const name of ['あおい', 'ひかる', 'りく', 'そら']) await expect(editor.canvas()).toContainText(name);
  });

  await test.step('表のいちばん下からは、下の別の欄に入らず、元の要素の高さ分だけ真下にずれる', async () => {
    const [, lastY, , lastHeight] = await editor.panelNumbers(4);
    expect(lastY + lastHeight).toBeLessThan(MEMBER_TABLE_BOTTOM);
    await page.keyboard.press('Control+Shift+V');
    expectNear(Number(await editor.panelNumber(1).inputValue()), lastY + lastHeight);
    await expect(editor.elements()).toHaveCount(18);
  });

  await test.step('元に戻す・やり直しで、貼った分が消えて戻る', async () => {
    await page.keyboard.press('Control+z');
    await expect(editor.elements()).toHaveCount(15);
    expect(await editor.selectionText()).toBe('選択なし');
    await page.keyboard.press('Control+Shift+Z');
    await expect(editor.elements()).toHaveCount(18);
  });
});
