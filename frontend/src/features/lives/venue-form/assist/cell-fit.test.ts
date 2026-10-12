import { describe, expect, it } from 'vitest';

import { findCell, fitToCell, fontSizeForHeight, innerBox } from './cell-fit';
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
