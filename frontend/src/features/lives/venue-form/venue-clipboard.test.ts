import { describe, expect, it } from 'vitest';

import { createBlankPage, createElement } from './venue-element-factory';
import { advanceItemIndexes, copyElements, pasteElements } from './venue-clipboard';
import type { VenueFormDocument } from './venue-form-schema';

function doc(): VenueFormDocument {
  const page = { ...createBlankPage(), id: 'p1' };
  const name = {
    ...createElement({ kind: 'text', content: "${groups['members'].items[0].field('member-name').value}" }, 'p1', { xMm: 10, yMm: 20 }),
    id: 'name',
    hMm: 6,
    condition: "${count(groups['members'].items[0].field('member-name').values) > 0}",
  };
  return { pages: [page, { ...createBlankPage(), id: 'p2' }], elements: [name] };
}

describe('venue clipboard', () => {
  it('advances every items[N] in an expression', () => {
    expect(advanceItemIndexes('${a.items[0].x} ${a.items[9].y}')).toBe('${a.items[1].x} ${a.items[10].y}');
    expect(advanceItemIndexes(undefined)).toBeUndefined();
  });

  it('pastes a plain copy slightly offset on the same page', () => {
    const base = doc();
    const { doc: next, pasted } = pasteElements(base, copyElements(base, new Set(['name'])), 'p1', 'same');
    expect(next.elements).toHaveLength(2);
    expect(pasted[0]).toMatchObject({ xMm: 13, yMm: 23, pageId: 'p1' });
    expect(pasted[0].id).not.toBe('name');
  });

  it('keeps the position when pasting onto another page', () => {
    const base = doc();
    const { pasted } = pasteElements(base, copyElements(base, new Set(['name'])), 'p2', 'same');
    expect(pasted[0]).toMatchObject({ xMm: 10, yMm: 20, pageId: 'p2' });
  });

  it('pastes the next item right below with advanced indexes', () => {
    const base = doc();
    const first = pasteElements(base, copyElements(base, new Set(['name'])), 'p1', 'next');
    expect(first.pasted[0]).toMatchObject({ xMm: 10, yMm: 26 });
    expect(first.pasted[0].kind === 'text' && first.pasted[0].content).toContain('items[1]');
    expect(first.pasted[0].condition).toContain('items[1]');

    const second = pasteElements(first.doc, first.pasted, 'p1', 'next');
    expect(second.pasted[0]).toMatchObject({ yMm: 32 });
    expect(second.pasted[0].kind === 'text' && second.pasted[0].content).toContain('items[2]');
  });

  it('continues a table from the next unwritten item', () => {
    const table = { ...createElement({ kind: 'table', groupId: 'members' }, 'p1', { xMm: 0, yMm: 0 }), id: 't' };
    const base: VenueFormDocument = { pages: [{ ...createBlankPage(), id: 'p1' }], elements: [table] };
    const { pasted } = pasteElements(base, copyElements(base, new Set(['t'])), 'p1', 'next');
    expect(pasted[0].kind === 'table' && pasted[0].startIndex).toBe(6);
  });
});
