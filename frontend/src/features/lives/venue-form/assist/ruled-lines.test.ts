import { describe, expect, it } from 'vitest';

import { fittedBackgroundRect, toPageLines } from './ruled-lines';

const A4 = { widthMm: 210, heightMm: 297 };

describe('fittedBackgroundRect', () => {
  it('同じ縦横比ならページ全体に収まる', () => {
    expect(fittedBackgroundRect(A4, 210 / 297)).toEqual({ x: 0, y: 0, w: 210, h: 297 });
  });

  it('横長の背景は上下に余白を空けて中央に置く', () => {
    const rect = fittedBackgroundRect(A4, 2);
    expect(rect.w).toBeCloseTo(210);
    expect(rect.h).toBeCloseTo(105);
    expect(rect.y).toBeCloseTo(96);
  });
});

describe('toPageLines', () => {
  it('比率の座標をページの mm に直す', () => {
    const [h, v] = toPageLines([
      { axis: 'h', pos: 0.5, from: 0.1, to: 0.9 },
      { axis: 'v', pos: 0.25, from: 0, to: 1 },
    ], A4, 210 / 297);
    expect(h).toEqual({ axis: 'h', posMm: 148.5, fromMm: 21, toMm: 189 });
    expect(v.posMm).toBeCloseTo(52.5);
    expect(v.toMm).toBeCloseTo(297);
  });
});
