/** 書式エディタを、書式の上の mm 座標で操作する（実際のマウス・キーボードを使う）。 */
import { expect, type Locator, type Page } from '@playwright/test';

export interface Mm {
  x: number;
  y: number;
}

export class VenueEditor {
  /** @param pageWidthMm 背景の書式の幅（mm） */
  constructor(readonly page: Page, private readonly pageWidthMm: number) {}

  async open(tenantId: string, liveId: string, layoutId: string) {
    await this.page.goto(`/tenants/${tenantId}/lives/${liveId}/pdf-layouts/${layoutId}`);
    await expect(this.page.getByRole('textbox', { name: '書式の名前' })).toBeVisible();
  }

  /** エディタの本体（画面全体のレイアウトの main の中にある、もう 1 つの main） */
  root(): Locator {
    return this.page.locator('main').last();
  }

  canvas(): Locator {
    return this.root().locator('div.relative.overflow-hidden.bg-white').first();
  }

  scroller(): Locator {
    return this.root().locator('.overflow-auto').first();
  }

  elements(): Locator {
    return this.page.locator('.react-draggable');
  }

  /** 書式の左下に出る「◯件選択中」。何も選んでいないときは件数が出ないので「選択なし」を返す */
  async selectionText() {
    const label = this.root().getByText(/件選択中/).first();
    if ((await label.count()) === 0) return '選択なし';
    return (await label.textContent())?.trim();
  }

  /** 右側の設定欄の数値の欄（X・Y・幅・高さ・文字の大きさ…の順） */
  panelNumber(index: number): Locator {
    return this.page.locator('aside').last().locator('input[type=number]').nth(index);
  }

  async panelNumbers(count = 4) {
    const values: number[] = [];
    for (let i = 0; i < count; i++) values.push(Number(await this.panelNumber(i).inputValue()));
    return values;
  }

  tool(label: string): Locator {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  /** 書式の mm 座標を画面の座標にする。画面の外ならスクロールして見えるところへ持ってくる。 */
  async toScreen(point: Mm) {
    const scroller = await this.scroller().boundingBox();
    if (!scroller) throw new Error('editor is not visible');
    let box = await this.canvas().boundingBox();
    if (!box) throw new Error('canvas is not visible');
    const ppm = box.width / this.pageWidthMm;
    const x = box.x + point.x * ppm;
    const y = box.y + point.y * ppm;
    const margin = 60;
    const dx = x < scroller.x + margin || x > scroller.x + scroller.width - margin ? x - (scroller.x + scroller.width / 2) : 0;
    const dy = y < scroller.y + margin || y > scroller.y + scroller.height - margin ? y - (scroller.y + scroller.height / 2) : 0;
    if (dx !== 0 || dy !== 0) {
      await this.scroller().evaluate((el, [sx, sy]) => el.scrollBy(sx, sy), [dx, dy]);
      box = (await this.canvas().boundingBox())!;
    }
    return { x: box.x + point.x * ppm, y: box.y + point.y * ppm, ppm };
  }

  async click(point: Mm) {
    const at = await this.toScreen(point);
    await this.page.mouse.click(at.x, at.y);
  }

  /** from から to まで、途中の点も通ってドラッグする。始点が見えるようにスクロールしてから測る */
  async drag(from: Mm, to: Mm, { steps = 12, alt = false, shift = false } = {}) {
    const start = await this.toScreen(from);
    const end = { x: start.x + (to.x - from.x) * start.ppm, y: start.y + (to.y - from.y) * start.ppm };
    if (alt) await this.page.keyboard.down('Alt');
    if (shift) await this.page.keyboard.down('Shift');
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(end.x, end.y, { steps });
    await this.page.mouse.up();
    if (shift) await this.page.keyboard.up('Shift');
    if (alt) await this.page.keyboard.up('Alt');
  }

  /** 要素の中心から、mm の量だけドラッグする */
  async dragElement(element: Locator, delta: Mm, options: { alt?: boolean } = {}) {
    await element.scrollIntoViewIfNeeded();
    const box = (await element.boundingBox())!;
    const canvas = (await this.canvas().boundingBox())!;
    const ppm = canvas.width / this.pageWidthMm;
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (options.alt) await this.page.keyboard.down('Alt');
    await this.page.mouse.move(start.x, start.y);
    await this.page.mouse.down();
    await this.page.mouse.move(start.x + delta.x * ppm, start.y + delta.y * ppm, { steps: 10 });
    await this.page.mouse.up();
    if (options.alt) await this.page.keyboard.up('Alt');
  }

  /** ダイアログの選択欄（上から index 番目）で選ぶ */
  async chooseInDialog(index: number, option: string) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByRole('combobox').nth(index).click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  /** ダイアログのボタンを押して、閉じるアニメーション（背景の暗幕）が消えるまで待つ */
  async confirmDialog(button: string) {
    await this.page.getByRole('dialog').getByRole('button', { name: button }).click();
    await expect(this.page.getByRole('dialog')).toHaveCount(0);
    await expect(this.page.locator('div.fixed.inset-0.z-50')).toHaveCount(0);
  }

  /** サイドバーの「項目の値」から項目を置く */
  async placeField(option: string) {
    await this.page.locator('aside').first().getByRole('combobox').filter({ hasText: '選んで置く' }).first().click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async save() {
    await this.page.getByRole('button', { name: /^保存/ }).click();
    await expect(this.page.getByText('書式を保存しました')).toBeVisible();
  }
}
