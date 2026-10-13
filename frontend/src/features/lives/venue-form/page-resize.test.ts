import { describe, expect, it } from 'vitest';

import { getPaperDimensions } from './paper';
import { resizePage } from './page-resize';
import { createBlankPage, createElement } from './venue-element-factory';
import type { VenueFormDocument } from './venue-form-schema';

function b4Doc(): VenueFormDocument {
  const b4 = getPaperDimensions('B4', 'PORTRAIT');
  const page = { ...createBlankPage(), id: 'p1', ...b4 };
  const other = { ...createBlankPage(), id: 'p2', ...b4 };
  const text = { ...createElement({ kind: 'text' }, 'p1', { xMm: 0, yMm: 0 }), id: 't', xMm: 25.7, yMm: 36.4, wMm: 128.5, hMm: 18.2, fontSizePt: 12 };
  const stay = { ...createElement({ kind: 'text' }, 'p2', { xMm: 0, yMm: 0 }), id: 's', xMm: 25.7, yMm: 36.4 };
  return { pages: [page, other], elements: [text, stay] };
}

describe('用紙の大きさを替える', () => {
  it('B4 から A4 にすると、そのページの要素の位置・大きさ・文字が同じ比で縮む', () => {
    const a4 = getPaperDimensions('A4', 'PORTRAIT');
    const doc = resizePage(b4Doc(), 'p1', a4);
    expect(doc.pages[0]).toMatchObject(a4);
    const text = doc.elements[0];
    expect(text.xMm).toBeCloseTo(21, 0);
    expect(text.yMm).toBeCloseTo(29.7, 0);
    expect(text.wMm).toBeCloseTo(105, 0);
    expect(text.kind === 'text' && text.fontSizePt).toBe(10);
  });

  it('ほかのページの要素とページは変えない', () => {
    const before = b4Doc();
    const doc = resizePage(before, 'p1', getPaperDimensions('A4', 'PORTRAIT'));
    expect(doc.pages[1]).toEqual(before.pages[1]);
    expect(doc.elements[1]).toEqual(before.elements[1]);
  });
});
