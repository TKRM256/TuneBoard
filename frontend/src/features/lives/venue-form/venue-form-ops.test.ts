import { describe, expect, it } from 'vitest';

import { createBlankPage, createElement, createPageFromAsset } from './venue-element-factory';
import {
  duplicateElements,
  layerElements,
  moveElements,
  removePage,
  updateElement,
} from './venue-form-ops';
import type { VenueFormDocument } from './venue-form-schema';

function docWithTwoTexts(): VenueFormDocument {
  const page = { ...createBlankPage(), id: 'p1' };
  const a = { ...createElement({ kind: 'text' }, 'p1', { xMm: 10, yMm: 10 }), id: 'a' };
  const b = { ...createElement({ kind: 'text' }, 'p1', { xMm: 100, yMm: 50 }), id: 'b' };
  return { pages: [page], elements: [a, b] };
}

describe('venue form ops', () => {
  it('keeps the element kind when patching', () => {
    const doc = updateElement(docWithTwoTexts(), 'a', { kind: 'shape', xMm: 30 } as never);
    expect(doc.elements[0]).toMatchObject({ kind: 'text', xMm: 30 });
  });

  it('stops elements at the page edge when moving them together', () => {
    const doc = moveElements(docWithTwoTexts(), new Set(['a', 'b']), -50, 0);
    expect(doc.elements.map((element) => element.xMm)).toEqual([0, 90]);
  });

  it('duplicates with new ids and fresh column ids for tables', () => {
    const base = docWithTwoTexts();
    const table = { ...createElement({ kind: 'table', groupId: 'g' }, 'p1', { xMm: 0, yMm: 0 }), id: 't' };
    const { doc, newIds } = duplicateElements({ ...base, elements: [table] }, new Set(['t']));
    const copy = doc.elements.find((element) => newIds.has(element.id));
    expect(copy?.kind).toBe('table');
    if (copy?.kind === 'table' && table.kind === 'table') {
      expect(copy.columns[0].id).not.toBe(table.columns[0].id);
    }
  });

  it('brings selected elements to the front by moving them to the end', () => {
    const doc = layerElements(docWithTwoTexts(), new Set(['a']), 'front');
    expect(doc.elements.map((element) => element.id)).toEqual(['b', 'a']);
  });

  it('removes the elements of a removed page', () => {
    const doc = removePage(docWithTwoTexts(), 'p1');
    expect(doc).toEqual({ pages: [], elements: [] });
  });

  it('sizes pages from the background file', () => {
    const pdfPage = createPageFromAsset({
      id: 'asset', fileName: 'a.pdf', contentType: 'application/pdf', sizeBytes: 1,
      pages: [{ widthMm: 257, heightMm: 364, widthPx: null, heightPx: null }],
    }, 0);
    expect(pdfPage).toMatchObject({ widthMm: 257, heightMm: 364, background: { assetId: 'asset', pageIndex: 0 } });

    const landscapeImage = createPageFromAsset({
      id: 'img', fileName: 'a.png', contentType: 'image/png', sizeBytes: 1,
      pages: [{ widthMm: null, heightMm: null, widthPx: 1200, heightPx: 800 }],
    }, 0);
    expect(landscapeImage).toMatchObject({ widthMm: 297, heightMm: 210 });
  });
});
