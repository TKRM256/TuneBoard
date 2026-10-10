/** Keyword highlighting and cell value comparison for the submissions table. */
import type { ReactNode } from 'react';

import { EMPTY_CELL_VALUE } from './submission-table-helpers';

export type SortDirection = 'asc' | 'desc';

/** セル内のキーワード一致部分を <mark> で囲んで返す。一致が無ければ元の文字列をそのまま返す。 */
export function highlightKeyword(text: string, keyword: string): ReactNode {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return text;
  }

  const haystack = text.toLowerCase();
  const needle = trimmed.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (let found = haystack.indexOf(needle); found >= 0; found = haystack.indexOf(needle, cursor)) {
    if (found > cursor) {
      parts.push(text.slice(cursor, found));
    }
    parts.push(
      <mark key={found} className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40">
        {text.slice(found, found + needle.length)}
      </mark>,
    );
    cursor = found + needle.length;
  }

  if (parts.length === 0) {
    return text;
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return parts;
}

/** 未入力を常に末尾に寄せつつ、数字混じりの文字列も自然な順序で比較する。 */
export function compareCellValues(a: string, b: string, direction: SortDirection): number {
  if (a === b) {
    return 0;
  }
  if (a === EMPTY_CELL_VALUE) {
    return 1;
  }
  if (b === EMPTY_CELL_VALUE) {
    return -1;
  }
  const result = a.localeCompare(b, 'ja', { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
}
