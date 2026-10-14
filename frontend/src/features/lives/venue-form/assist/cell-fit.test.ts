import { describe, expect, it } from 'vitest';

import { boxInNextRow, findCell, fitToCell, fontSizeForHeight, innerBox } from './cell-fit';
import type { PageLine } from './ruled-lines';

const h = (posMm: number, fromMm: number, toMm: number): PageLine => ({ axis: 'h', posMm, fromMm, toMm });
const v = (posMm: number, fromMm: number, toMm: number): PageLine => ({ axis: 'v', posMm, fromMm, toMm });

// 2 行 2 列の表（x 10〜90、y 10〜30）と、その下の下線だけの欄（y 50 と 58、x 20〜80）
const LINES = [
  h(10, 10, 90), h(20, 10, 90), h(30, 10, 90),
  v(10, 10, 30), v(50, 10, 30), v(90, 10, 30),
  h(50, 20, 80), h(58, 20, 80),
];

describe('findCell', () => {
  it('点を囲むいちばん小さい枠を返す', () => {
    expect(findCell(60, 25, LINES)).toEqual({ left: 50, right: 90, top: 20, bottom: 30 });
  });

  it('左右の線が無い下線の欄は、下の線の端までを枠にする', () => {
    expect(findCell(40, 55, LINES)).toEqual({ left: 20, right: 80, top: 50, bottom: 58 });
  });

  it('上下の線が無ければ枠にしない', () => {
    expect(findCell(40, 100, LINES)).toBeNull();
  });
});

describe('innerBox', () => {
  it('0.5mm の余白を空ける', () => {
    expect(innerBox({ left: 50, right: 90, top: 20, bottom: 30 })).toEqual({ xMm: 50.5, yMm: 20.5, wMm: 39, hMm: 9 });
  });

  it('小さい枠は余白なし', () => {
    expect(innerBox({ left: 10, right: 14, top: 10, bottom: 30 })).toEqual({ xMm: 10, yMm: 10, wMm: 4, hMm: 20 });
  });
});

describe('fitToCell', () => {
  it('枠の内側いっぱいに広げ、文字の大きさは変えない', () => {
    const element = { id: 'e', pageId: 'p', kind: 'text', xMm: 55, yMm: 22, wMm: 10, hMm: 5, content: 'x', fontSizePt: 20 } as const;
    expect(fitToCell(element as never, LINES)).toEqual({ xMm: 50.5, yMm: 20.5, wMm: 39, hMm: 9 });
  });

  it('枠が無いところでは何もしない', () => {
    const element = { id: 'e', pageId: 'p', kind: 'shape', xMm: 100, yMm: 100, wMm: 10, hMm: 5, shape: 'rect' } as const;
    expect(fitToCell(element as never, LINES)).toBeNull();
  });
});

describe('fontSizeForHeight', () => {
  it('上限と下限の間に収める', () => {
    expect(fontSizeForHeight(1)).toBe(5);
    expect(fontSizeForHeight(100)).toBe(14);
    expect(fontSizeForHeight(4)).toBe(9);
  });
});

describe('boxInNextRow', () => {
  it('すぐ下の枠に、枠の中での上下の余白を保って移す', () => {
    expect(boxInNextRow({ xMm: 52, yMm: 11, wMm: 30, hMm: 8 }, LINES)).toEqual({ xMm: 52, yMm: 21, wMm: 30, hMm: 8 });
  });

  it('下の行の高さが違えば、余白を保ったまま高さを合わせる', () => {
    const uneven = [h(0, 0, 50), h(10, 0, 50), h(26, 0, 50)];
    expect(boxInNextRow({ xMm: 5, yMm: 1, wMm: 20, hMm: 8 }, uneven)).toEqual({ xMm: 5, yMm: 11, wMm: 20, hMm: 14 });
  });

  it('いちばん下の行や枠の外では null', () => {
    expect(boxInNextRow({ xMm: 52, yMm: 21, wMm: 30, hMm: 8 }, LINES)).toBeNull();
    expect(boxInNextRow({ xMm: 40, yMm: 90, wMm: 10, hMm: 5 }, LINES)).toBeNull();
  });
});
