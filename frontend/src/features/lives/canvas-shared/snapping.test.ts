import { describe, expect, it } from 'vitest';

import { snapMove, snapResize, type SnapLine } from './snapping';

// 縦線 x=50（y 0〜100）、横線 y=40（x 0〜200）、遠くの縦線 x=150（y 200〜300、要素と重ならない）
const LINES: SnapLine[] = [
  { axis: 'v', posMm: 50, fromMm: 0, toMm: 100 },
  { axis: 'h', posMm: 40, fromMm: 0, toMm: 200 },
  { axis: 'v', posMm: 150, fromMm: 200, toMm: 300 },
];

describe('snapMove', () => {
  it('近い端を罫線に合わせ、大きさは変えない', () => {
    const { box, guides } = snapMove({ xMm: 51, yMm: 10, wMm: 30, hMm: 29 }, LINES, 2);
    expect(box).toEqual({ xMm: 50, yMm: 11, wMm: 30, hMm: 29 });
    expect(guides).toHaveLength(2);
  });

  it('右端・下端も合わせる', () => {
    const { box } = snapMove({ xMm: 19, yMm: 50, wMm: 30, hMm: 10 }, LINES, 2);
    expect(box.xMm).toBe(20);
  });

  it('離れている線や、範囲が重ならない線には合わせない', () => {
    const { box, guides } = snapMove({ xMm: 120, yMm: 50, wMm: 29, hMm: 10 }, LINES, 2);
    expect(box).toEqual({ xMm: 120, yMm: 50, wMm: 29, hMm: 10 });
    expect(guides).toEqual([]);
  });
});

describe('snapResize', () => {
  it('動かした辺だけを合わせる', () => {
    const { box } = snapResize({ xMm: 10, yMm: 10, wMm: 41, hMm: 29 }, 'bottomRight', LINES, 2, 1);
    expect(box).toEqual({ xMm: 10, yMm: 10, wMm: 40, hMm: 30 });
  });

  it('左の辺を合わせても右の辺は動かさない', () => {
    const { box } = snapResize({ xMm: 49, yMm: 10, wMm: 20, hMm: 10 }, 'left', LINES, 2, 1);
    expect(box.xMm).toBe(50);
    expect(box.xMm + box.wMm).toBe(69);
  });

  it('合わせると小さくなりすぎるときは合わせない', () => {
    const { box, guides } = snapResize({ xMm: 49.5, yMm: 10, wMm: 1, hMm: 10 }, 'right', LINES, 2, 1);
    expect(box.wMm).toBe(1);
    expect(guides).toEqual([]);
  });
});
