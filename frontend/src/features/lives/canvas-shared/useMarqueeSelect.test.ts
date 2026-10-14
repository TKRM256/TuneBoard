import { describe, expect, it } from 'vitest';

import { idsInRect } from './useMarqueeSelect';

const boxes = [
  { id: 'inside', xMm: 10, yMm: 10, wMm: 5, hMm: 5 },
  { id: 'edge', xMm: 0, yMm: 0, wMm: 20, hMm: 20 },
  { id: 'partial', xMm: 18, yMm: 10, wMm: 5, hMm: 5 },
  { id: 'outside', xMm: 40, yMm: 40, wMm: 5, hMm: 5 },
];

describe('idsInRect', () => {
  it('四角の中にすっかり入っている要素だけを選ぶ（ちょうど辺に重なるものは含む）', () => {
    expect(idsInRect(boxes, { xMm: 0, yMm: 0, wMm: 20, hMm: 20 })).toEqual(['inside', 'edge']);
  });
});
