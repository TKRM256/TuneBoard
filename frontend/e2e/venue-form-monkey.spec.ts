/**
 * モンキーテスト：実際のマウス・キーボードで、書式エディタをでたらめに操作し続ける。
 * 乱数の種を固定しているので、落ちたときは同じ種で同じ操作を再現できる（失敗時は直前の操作の記録を出す）。
 */
import { expect, test, type Page } from '@playwright/test';

import { prepareVenueForm } from './support/api';
import { VenueEditor } from './support/venue-editor';

const PAGE_WIDTH_MM = 209.9;
const STEPS = 250;
const SEEDS = [1, 2];
/** 押すと画面を離れたり、ファイルを選ぶ画面が開いたりするボタン */
const UNSAFE = /戻る|ログアウト|Logout|書式を取り込む|他のライブから取り込む|Dark/;
/** 開発時だけ出る、動作には関係しない警告 */
const IGNORED_CONSOLE = [/Download the React DevTools/, /Missing `Description`/];

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

for (const seed of SEEDS) {
  test(`でたらめに ${STEPS} 回操作しても壊れない（種 ${seed}）`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' && !IGNORED_CONSOLE.some((pattern) => pattern.test(message.text()))) {
        errors.push(`console: ${message.text().slice(0, 300)}`);
      }
    });

    const { tenant, live, layout } = await prepareVenueForm(page, `monkey-${seed}`);
    const editor = new VenueEditor(page, PAGE_WIDTH_MM);
    await editor.open(tenant.id, live.id, layout.id);
    await page.keyboard.press('Control+0');

    const rand = random(seed);
    const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
    const somewhere = () => ({ x: 5 + rand() * 200, y: 5 + rand() * 287 });
    const log: string[] = [];

    const actions: Record<string, () => Promise<string>> = {
      click: async () => { await editor.click(somewhere()); return 'click'; },
      drag: async () => {
        const alt = rand() < 0.3;
        const shift = rand() < 0.2;
        const from = somewhere();
        await editor.drag(from, { x: from.x + (rand() - 0.5) * 60, y: from.y + (rand() - 0.5) * 60 }, { alt, shift, steps: 6 });
        return `drag alt=${alt} shift=${shift}`;
      },
      dragElement: async () => {
        const count = await editor.elements().count();
        if (count === 0) return 'no element';
        await editor.dragElement(editor.elements().nth(Math.floor(rand() * count)), { x: (rand() - 0.5) * 30, y: (rand() - 0.5) * 30 }, { alt: rand() < 0.5 });
        return 'drag element';
      },
      doubleClick: async () => {
        const count = await editor.elements().count();
        if (count === 0) return 'no element';
        await editor.elements().nth(Math.floor(rand() * count)).locator('> div').first().dblclick({ force: true });
        return 'double click';
      },
      key: async () => {
        const key = pick(['Control+z', 'Control+Shift+Z', 'Delete', 'Escape', 'Control+c', 'Control+v', 'Control+Shift+V',
          'Control+a', 'Control+d', 'ArrowLeft', 'Shift+ArrowDown', 'Control+0', 'Control+=', 'Control+-']);
        await page.keyboard.press(key);
        return `key ${key}`;
      },
      tool: async () => {
        const label = pick(['罫線を表示', '表の欄に項目を並べる', '選択肢の印を置く']);
        const button = editor.tool(label);
        if (await button.isEnabled()) await button.click();
        return `tool ${label}`;
      },
      palette: async () => {
        const label = pick(['テキスト', '丸囲み', '四角', '横線', 'アイコン']);
        await page.locator('aside').first().getByRole('button', { name: label }).click();
        return `palette ${label}`;
      },
      panel: async () => {
        const inputs = page.locator('aside').last().locator('input[inputmode=decimal]');
        const count = await inputs.count();
        if (count === 0) return 'no input';
        const value = pick(['0', '-5', '3.5', '999', '7', '0.5']);
        await inputs.nth(Math.floor(rand() * count)).fill(value);
        return `panel ${value}`;
      },
      wheel: async () => {
        const at = await editor.toScreen(somewhere());
        await page.mouse.move(at.x, at.y);
        await page.keyboard.down('Control');
        await page.mouse.wheel(0, (rand() - 0.5) * 800);
        await page.keyboard.up('Control');
        return 'wheel zoom';
      },
    };
    const weights: Record<string, number> = { click: 8, drag: 14, dragElement: 12, doubleClick: 5, key: 16, tool: 8, palette: 6, panel: 6, wheel: 3 };
    const bag = Object.entries(weights).flatMap(([name, weight]) => Array<string>(weight).fill(name));

    for (let step = 0; step < STEPS; step++) {
      const result = await handleDialog(page, rand) ?? await actions[pick(bag)]();
      log.push(`${step} ${result}`);
      if (await page.getByText('Unexpected Application Error').isVisible()) break;
    }

    expect(errors, log.slice(-20).join('\n')).toEqual([]);
    await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);

    // 散らかったままでも保存でき、読み込み直すと同じ数の要素がある
    await page.keyboard.press('Escape');
    while (await page.getByRole('dialog').isVisible()) await page.keyboard.press('Escape');
    const count = await editor.elements().count();
    await editor.save();
    await page.reload();
    await expect(editor.elements()).toHaveCount(count);
  });
}

/** ダイアログが開いていれば、閉じるか中のボタンを押す。開いていなければ null */
async function handleDialog(page: Page, rand: () => number) {
  const dialog = page.getByRole('dialog');
  if (!(await dialog.isVisible())) return null;
  if (rand() < 0.4) {
    await page.keyboard.press('Escape');
    return 'dialog escape';
  }
  const buttons = dialog.getByRole('button');
  const count = await buttons.count();
  for (let attempt = 0; attempt < 5 && count > 0; attempt++) {
    const button = buttons.nth(Math.floor(rand() * count));
    // 一覧が再描画されてボタンが入れ替わることもあるので、読めなければ次を試す
    const label = ((await button.textContent({ timeout: 1000 }).catch(() => null)) ?? '').trim();
    const enabled = await button.isEnabled({ timeout: 1000 }).catch(() => false);
    if (UNSAFE.test(label) || !enabled) continue;
    // アイコンの一覧のように、開く途中や再描画で押せないボタンは諦めて閉じる
    const clicked = await button.click({ timeout: 2000 }).then(() => true, () => false);
    if (!clicked) break;
    return `dialog ${label || 'button'}`;
  }
  await page.keyboard.press('Escape');
  return 'dialog escape';
}
