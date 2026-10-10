import { describe, expect, it } from 'vitest';

import { compareCellValues } from './submission-search-helpers';
import { EMPTY_CELL_VALUE } from './submission-table-helpers';

const sortValues = (values: string[], direction: 'asc' | 'desc') =>
  [...values].sort((a, b) => compareCellValues(a, b, direction));

describe('compareCellValues', () => {
  it('sorts ascending and descending', () => {
    expect(sortValues(['さくら', 'あお', 'なつ'], 'asc')).toEqual(['あお', 'さくら', 'なつ']);
    expect(sortValues(['さくら', 'あお', 'なつ'], 'desc')).toEqual(['なつ', 'さくら', 'あお']);
  });

  it('keeps empty cells at the bottom in both directions', () => {
    expect(sortValues(['ばんど', EMPTY_CELL_VALUE, 'あんぷ'], 'asc'))
      .toEqual(['あんぷ', 'ばんど', EMPTY_CELL_VALUE]);
    expect(sortValues(['ばんど', EMPTY_CELL_VALUE, 'あんぷ'], 'desc'))
      .toEqual(['ばんど', 'あんぷ', EMPTY_CELL_VALUE]);
  });

  it('orders embedded numbers naturally', () => {
    expect(sortValues(['10件', '2件', '1件'], 'asc')).toEqual(['1件', '2件', '10件']);
  });

  it('treats identical values as equal', () => {
    expect(compareCellValues('あ', 'あ', 'asc')).toBe(0);
    expect(compareCellValues(EMPTY_CELL_VALUE, EMPTY_CELL_VALUE, 'desc')).toBe(0);
  });
});
