/** 会場書式の書き換え（純粋関数）。エディタの undo / redo はこの結果を履歴に積む。 */
import type { TableColumn } from '../pdf/canvas-schema';
import {
  clampMove,
  computeAlignment,
  computeDistribution,
  round1,
  type AlignMode,
  type BoxPatch,
} from '../canvas-shared/geometry';
import { defaultColumn, newId } from './venue-element-factory';
import type { VenueElement, VenueFormDocument, VenuePage } from './venue-form-schema';

export function updateElement(doc: VenueFormDocument, id: string, patch: Partial<VenueElement>): VenueFormDocument {
  return {
    ...doc,
    elements: doc.elements.map((element) => (element.id === id ? mergeElement(element, patch) : element)),
  };
}

/** 選んだ要素に同じ変更をまとめて当てる（複数選択での一括変更）。 */
export function updateElements(doc: VenueFormDocument, ids: Set<string>, patch: Partial<VenueElement>): VenueFormDocument {
  return {
    ...doc,
    elements: doc.elements.map((element) => (ids.has(element.id) ? mergeElement(element, patch) : element)),
  };
}

export function removeElements(doc: VenueFormDocument, ids: Set<string>): VenueFormDocument {
  return { ...doc, elements: doc.elements.filter((element) => !ids.has(element.id)) };
}

export function duplicateElements(doc: VenueFormDocument, ids: Set<string>): { doc: VenueFormDocument; newIds: Set<string> } {
  const newIds = new Set<string>();
  const copies: VenueElement[] = [];
  for (const element of doc.elements) {
    if (!ids.has(element.id)) continue;
    const copy = { ...element, id: newId(), xMm: element.xMm + 3, yMm: element.yMm + 3 } as VenueElement;
    if (copy.kind === 'table') copy.columns = copy.columns.map((column) => ({ ...column, id: newId() }));
    copies.push(copy);
    newIds.add(copy.id);
  }
  return { doc: { ...doc, elements: [...doc.elements, ...copies] }, newIds };
}

/** 選んだ要素をまとめて動かす。ページからはみ出さないように動かす量を抑える。 */
export function moveElements(doc: VenueFormDocument, ids: Set<string>, dxMm: number, dyMm: number): VenueFormDocument {
  const selected = doc.elements.filter((element) => ids.has(element.id));
  if (selected.length === 0) return doc;
  const page = doc.pages.find((p) => p.id === selected[0].pageId);
  const { dx, dy } = page ? clampMove(selected, dxMm, dyMm, page.widthMm, page.heightMm) : { dx: dxMm, dy: dyMm };
  return {
    ...doc,
    elements: doc.elements.map((element) => (ids.has(element.id)
      ? { ...element, xMm: round1(element.xMm + dx), yMm: round1(element.yMm + dy) }
      : element)),
  };
}

export function alignElements(doc: VenueFormDocument, ids: Set<string>, mode: AlignMode): VenueFormDocument {
  return applyBoxPatches(doc, computeAlignment(doc.elements.filter((e) => ids.has(e.id)), mode));
}

export function distributeElements(doc: VenueFormDocument, ids: Set<string>, axis: 'horizontal' | 'vertical'): VenueFormDocument {
  return applyBoxPatches(doc, computeDistribution(doc.elements.filter((e) => ids.has(e.id)), axis));
}

/** 重なり順。後ろに並ぶ要素ほど上に描かれる。 */
export function layerElements(doc: VenueFormDocument, ids: Set<string>, mode: 'front' | 'back'): VenueFormDocument {
  const selected = doc.elements.filter((element) => ids.has(element.id));
  const others = doc.elements.filter((element) => !ids.has(element.id));
  return { ...doc, elements: mode === 'front' ? [...others, ...selected] : [...selected, ...others] };
}

export function addPage(doc: VenueFormDocument, page: VenuePage): VenueFormDocument {
  return { ...doc, pages: [...doc.pages, page] };
}

export function updatePage(doc: VenueFormDocument, id: string, patch: Partial<VenuePage>): VenueFormDocument {
  return { ...doc, pages: doc.pages.map((page) => (page.id === id ? { ...page, ...patch } : page)) };
}

/** ページを消すと、そのページの要素も消える。 */
export function removePage(doc: VenueFormDocument, id: string): VenueFormDocument {
  return { pages: doc.pages.filter((page) => page.id !== id), elements: doc.elements.filter((element) => element.pageId !== id) };
}

export function movePage(doc: VenueFormDocument, id: string, direction: -1 | 1): VenueFormDocument {
  const from = doc.pages.findIndex((page) => page.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= doc.pages.length) return doc;
  const pages = [...doc.pages];
  [pages[from], pages[to]] = [pages[to], pages[from]];
  return { ...doc, pages };
}

export function updateColumns(
  doc: VenueFormDocument,
  elementId: string,
  change: (columns: TableColumn[]) => TableColumn[],
): VenueFormDocument {
  return {
    ...doc,
    elements: doc.elements.map((element) => (element.id === elementId && element.kind === 'table'
      ? { ...element, columns: change(element.columns) }
      : element)),
  };
}

export const columnOps = {
  add: (columns: TableColumn[]) => [...columns, defaultColumn('', 0.3, 'left')],
  update: (columnId: string, patch: Partial<TableColumn>) => (columns: TableColumn[]) =>
    columns.map((column) => (column.id === columnId ? { ...column, ...patch } : column)),
  remove: (columnId: string) => (columns: TableColumn[]) => columns.filter((column) => column.id !== columnId),
  move: (columnId: string, direction: -1 | 1) => (columns: TableColumn[]) => {
    const from = columns.findIndex((column) => column.id === columnId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= columns.length) return columns;
    const next = [...columns];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  },
};

function applyBoxPatches(doc: VenueFormDocument, patches: Map<string, BoxPatch>): VenueFormDocument {
  if (patches.size === 0) return doc;
  return {
    ...doc,
    elements: doc.elements.map((element) => {
      const patch = patches.get(element.id);
      return patch ? { ...element, ...patch } : element;
    }),
  };
}

/** 種類（kind）は変えずに属性だけ上書きする。 */
function mergeElement(element: VenueElement, patch: Partial<VenueElement>): VenueElement {
  const rest = { ...(patch as Record<string, unknown>) };
  delete rest.kind;
  delete rest.id;
  return { ...element, ...rest } as VenueElement;
}
