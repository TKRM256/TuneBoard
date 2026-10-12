import { describe, expect, it } from 'vitest';

import type { PageLine } from './ruled-lines';
import { buildCellTexts, detectGrid, INDEX_FIELD, itemValueExpression } from './table-grid';

const h = (posMm: number, fromMm: number, toMm: number): PageLine => ({ axis: 'h', posMm, fromMm, toMm });
const v = (posMm: number, fromMm: number, toMm: number): PageLine => ({ axis: 'v', posMm, fromMm, toMm });

// 見出し 1 行 + 4 行、3 列（x 20 / 40 / 100 / 140）の表。y 50〜100 を 10mm ごと
const TABLE = [
  ...[50, 60, 70, 80, 90, 100].map((y) => h(y, 20, 140)),
  ...[20, 40, 100, 140].map((x) => v(x, 50, 100)),
];

describe('detectGrid', () => {
  it('囲んだ範囲の行と列の境目を読み取る（少しはみ出して囲んでもよい）', () => {
    expect(detectGrid({ left: 18, top: 48, right: 143, bottom: 102 }, TABLE)).toEqual({
      rows: [50, 60, 70, 80, 90, 100],
      cols: [20, 40, 100, 140],
    });
  });

  it('範囲の外の線や、範囲を少しかすめるだけの線は使わない', () => {
    const lines = [...TABLE, h(120, 20, 140), v(60, 95, 140)];
    expect(detectGrid({ left: 18, top: 48, right: 143, bottom: 102 }, lines)?.cols).toEqual([20, 40, 100, 140]);
  });

  it('縦線の無い下線だけの行は、横線の端を両端にする', () => {
    const lines = [h(200, 30, 120), h(208, 30, 120), h(216, 30, 120)];
    expect(detectGrid({ left: 25, top: 195, right: 130, bottom: 220 }, lines)).toEqual({
      rows: [200, 208, 216],
      cols: [30, 120],
    });
  });

  it('横線が 2 本未満なら表にできない', () => {
    expect(detectGrid({ left: 0, top: 0, right: 50, bottom: 50 }, [h(10, 0, 50)])).toBeNull();
  });
});

describe('buildCellTexts', () => {
  const grid = { rows: [50, 60, 70, 82], cols: [20, 40, 100, 140] };

  it('見出しを除いたマスごとに、何件目の項目の値を書く式のテキストを罫線どおりに置く', () => {
    const texts = buildCellTexts(grid, { groupId: 'members', headerRows: 1, startIndex: 2, fieldIds: [INDEX_FIELD, 'name', ''] }, 'p1');
    expect(texts.map((t) => t.content)).toEqual(['2', itemValueExpression('members', 1, 'name'), '3', itemValueExpression('members', 2, 'name')]);
    expect(itemValueExpression('members', 1, 'name')).toBe("${groups['members'].items[1].field('name').value}");
    expect(texts[1]).toMatchObject({ kind: 'text', xMm: 40.5, yMm: 60.5, wMm: 59, hMm: 9, align: 'left' });
    expect(texts[3]).toMatchObject({ yMm: 70.5, hMm: 11 });
    expect(texts[0]).toMatchObject({ align: 'center', condition: "${count(groups['members'].items) >= 2}" });
    expect(texts[1].condition).toBeUndefined();
    expect(new Set(texts.map((t) => t.fontSizePt)).size).toBe(1);
  });

  it('見出しの行数が多すぎても 1 行は残す', () => {
    const texts = buildCellTexts({ rows: [0, 10, 20], cols: [0, 50] }, { groupId: 'g', headerRows: 5, startIndex: 3, fieldIds: ['f'] }, 'p1');
    expect(texts.map((t) => [t.yMm, t.content])).toEqual([[10.5, itemValueExpression('g', 2, 'f')]]);
  });
});
