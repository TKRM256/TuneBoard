import { describe, expect, it } from 'vitest';

import type { PageLine } from './ruled-lines';
import { buildTableRows, detectGrid } from './table-grid';

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

describe('buildTableRows', () => {
  it('見出しを除いた行ごとに、罫線どおりの位置で 1 件ずつ書く要素を作る', () => {
    const grid = { rows: [50, 60, 70, 82, 90], cols: [20, 40, 100, 140] };
    const tables = buildTableRows(grid, { groupId: 'members', headerRows: 1, startIndex: 2, fieldIds: ['__index__', 'name'] }, 'p1');
    expect(tables.map((t) => [t.yMm, t.hMm, t.startIndex, t.maxRows])).toEqual([[60, 10, 2, 1], [70, 12, 3, 1], [82, 8, 4, 1]]);
    expect(tables[0]).toMatchObject({ xMm: 20, wMm: 120, groupId: 'members' });
    expect(tables[0].columns.map((c) => c.widthRatio)).toEqual([20 / 120, 60 / 120, 40 / 120]);
    expect(tables[0].columns.map((c) => c.fieldId)).toEqual(['__index__', 'name', '']);
    expect(tables[0].columns[0].align).toBe('center');
    expect(new Set(tables.map((t) => t.fontSizePt)).size).toBe(1);
    expect(tables[0].columns[0].id).not.toBe(tables[1].columns[0].id);
  });

  it('見出しの行数が多すぎても 1 行は残す', () => {
    const tables = buildTableRows({ rows: [0, 10, 20], cols: [0, 50] }, { groupId: 'g', headerRows: 5, startIndex: 3, fieldIds: [] }, 'p1');
    expect(tables).toHaveLength(1);
    expect(tables[0]).toMatchObject({ yMm: 10, hMm: 10, maxRows: 1, startIndex: 3 });
  });
});
