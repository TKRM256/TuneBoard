/** 会場書式エディタのコピー・貼り付け（純粋関数）。
 *  「次の件として貼り付け」は、メンバー表のように 1 件ずつ置いていく作業を楽にするためのもの。
 *  式の中の items[N] を items[N+1] に進め、元の要素のすぐ下に置く。 */
import { newId } from './venue-element-factory';
import type { VenueElement, VenueFormDocument } from './venue-form-schema';

export type PasteMode = 'same' | 'next';

const PASTE_OFFSET_MM = 3;
const ITEM_INDEX = /items\[(\d+)\]/g;

export function copyElements(doc: VenueFormDocument, ids: Set<string>): VenueElement[] {
  return doc.elements.filter((element) => ids.has(element.id)).map((element) => structuredClone(element));
}

/** 式の中の items[N] を items[N+1] にする。 */
export function advanceItemIndexes(text: string | undefined): string | undefined {
  if (!text) return text;
  return text.replace(ITEM_INDEX, (_, index: string) => `items[${Number(index) + 1}]`);
}

/**
 * 表示中のページに貼り付ける。
 * - same: 同じページなら少しずらし、別のページなら同じ位置に置く
 * - next: 元の要素のすぐ下に置き、items[N] を 1 つ進める
 * @returns 貼り付けた書式と、貼り付けた要素（続けて貼るときの元にする）
 */
export function pasteElements(
  doc: VenueFormDocument,
  clipboard: VenueElement[],
  pageId: string,
  mode: PasteMode,
): { doc: VenueFormDocument; pasted: VenueElement[] } {
  if (clipboard.length === 0) return { doc, pasted: [] };
  const top = Math.min(...clipboard.map((element) => element.yMm));
  const bottom = Math.max(...clipboard.map((element) => element.yMm + element.hMm));
  const samePage = clipboard.every((element) => element.pageId === pageId);
  const pasted = clipboard.map((element) => {
    const copy = { ...structuredClone(element), id: newId(), pageId } as VenueElement;
    if (copy.kind === 'table') copy.columns = copy.columns.map((column) => ({ ...column, id: newId() }));
    if (mode === 'same') {
      if (samePage) {
        copy.xMm += PASTE_OFFSET_MM;
        copy.yMm += PASTE_OFFSET_MM;
      }
      return copy;
    }
    copy.yMm += bottom - top;
    return advance(copy);
  });
  return { doc: { ...doc, elements: [...doc.elements, ...pasted] }, pasted };
}

function advance(element: VenueElement): VenueElement {
  const next = { ...element, condition: advanceItemIndexes(element.condition) } as VenueElement;
  switch (next.kind) {
    case 'text':
      return { ...next, content: advanceItemIndexes(next.content) ?? '' };
    case 'table':
      return {
        ...next,
        startIndex: next.startIndex + next.maxRows,
        columns: next.columns.map((column) => ({ ...column, format: advanceItemIndexes(column.format) })),
      };
    case 'stagePlot':
      return next.groupId ? { ...next, itemIndex: (next.itemIndex ?? 1) + 1 } : next;
    default:
      return next;
  }
}
