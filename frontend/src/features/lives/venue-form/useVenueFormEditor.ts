/** 書式エディタの状態（書式・選択中の要素・表示中のページ）と操作。 */
import { useCallback, useMemo, useState } from 'react';

import type { TableColumn } from './table-schema';
import type { AlignMode } from '../canvas-shared/geometry';
import type { SnapBox } from '../canvas-shared/snapping';
import { useUndoableState } from '../canvas-shared/useUndoableState';
import { copyElements, pasteElements, type PasteMode } from './venue-clipboard';
import { createElement, type ElementInsert } from './venue-element-factory';
import * as ops from './venue-form-ops';
import { resizePage } from './page-resize';
import { emptyVenueForm, type VenueElement, type VenueFormDocument, type VenuePage } from './venue-form-schema';

/**
 * コピーした要素。画面を移っても残し、別の書式（ほかのライブの書式も）に貼れるようにする。
 * 背景のファイルはページ側が持つので、要素だけなら書式をまたいでもそのまま使える。
 */
const clipboard = { current: [] as VenueElement[] };

export function useVenueFormEditor() {
  const history = useUndoableState<VenueFormDocument>(emptyVenueForm());
  const [rawSelectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageId, setPageId] = useState<string | null>(null);
  const { commit, current, replace } = history;
  const doc = history.value;

  // 元に戻すなどで消えた要素は、選択からも外して扱う
  const selectedIds = useMemo(() => {
    const existing = rawSelectedIds.size === 0 ? [] : doc.elements.filter((element) => rawSelectedIds.has(element.id));
    return existing.length === rawSelectedIds.size ? rawSelectedIds : new Set(existing.map((element) => element.id));
  }, [doc.elements, rawSelectedIds]);

  const currentPage = doc.pages.find((page) => page.id === pageId) ?? doc.pages[0] ?? null;
  const pageElements = useMemo(
    () => (currentPage ? doc.elements.filter((element) => element.pageId === currentPage.id) : []),
    [doc.elements, currentPage],
  );
  const selectedElements = useMemo(
    () => doc.elements.filter((element) => selectedIds.has(element.id)),
    [doc.elements, selectedIds],
  );
  const selectedElement = selectedIds.size === 1
    ? doc.elements.find((element) => selectedIds.has(element.id)) ?? null
    : null;

  const load = useCallback((next: VenueFormDocument) => {
    replace(next);
    setSelectedIds(new Set());
    setPageId(next.pages[0]?.id ?? null);
  }, [replace]);

  /** 書式をまるごと差し替える。load と違い、元に戻せる */
  const replaceAll = useCallback((next: VenueFormDocument) => {
    commit(next);
    setSelectedIds(new Set());
    setPageId(next.pages[0]?.id ?? null);
  }, [commit]);

  const select = useCallback((id: string | null, additive: boolean) => {
    setSelectedIds((prev) => {
      if (id === null) return new Set();
      if (!additive) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 四角で囲んだ要素を選ぶ。additive なら今の選択に足す */
  const selectMany = useCallback((ids: string[], additive: boolean) => {
    setSelectedIds((prev) => new Set(additive ? [...prev, ...ids] : ids));
  }, []);

  const showPage = useCallback((id: string) => {
    setPageId(id);
    setSelectedIds(new Set());
  }, []);

  const insert = useCallback((insertion: ElementInsert) => {
    if (!currentPage) return;
    const element = createElement(insertion, currentPage.id, { xMm: 15, yMm: 15 });
    commit({ ...current(), elements: [...current().elements, element] });
    setSelectedIds(new Set([element.id]));
  }, [commit, current, currentPage]);

  /** 作り終えた要素をそのまま足して選ぶ（あてふり補助で作った表・印など）。 */
  const addElements = useCallback((elements: VenueElement[]) => {
    if (elements.length === 0) return;
    commit({ ...current(), elements: [...current().elements, ...elements] });
    setSelectedIds(new Set(elements.map((element) => element.id)));
  }, [commit, current]);

  const addPage = useCallback((page: VenuePage) => {
    commit(ops.addPage(current(), page));
    showPage(page.id);
  }, [commit, current, showPage]);

  /** 選んだ要素を覚える。貼るたびに貼った要素を覚え直すので、続けて貼ると少しずつずれていく */
  const copySelected = useCallback(() => {
    clipboard.current = copyElements(current(), selectedIds);
    return clipboard.current.length;
  }, [current, selectedIds]);

  /** same: そのまま複製 / next: すぐ下（nextBox が返す置き場所）に置き items[N] を 1 つ進める */
  const paste = useCallback((mode: PasteMode, nextBox?: (box: SnapBox) => SnapBox | null) => {
    if (!currentPage || clipboard.current.length === 0) return;
    const result = pasteElements(current(), clipboard.current, currentPage.id, mode, nextBox);
    commit(result.doc);
    clipboard.current = result.pasted;
    setSelectedIds(new Set(result.pasted.map((element) => element.id)));
  }, [commit, current, currentPage]);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds(new Set(pageElements.map((element) => element.id)));
  }, [pageElements]);

  return {
    doc,
    copySelected,
    paste,
    selectAllOnPage,
    load,
    replaceAll,
    currentPage,
    pageElements,
    selectedIds,
    selectedElement,
    selectedElements,
    select,
    selectMany,
    showPage,
    insert,
    addElements,
    addPage,
    updatePage: (id: string, patch: Partial<VenuePage>) => commit(ops.updatePage(current(), id, patch)),
    /** 用紙の大きさを替え、そのページの要素も合わせて縮める */
    resizePage: (id: string, size: { widthMm: number; heightMm: number }) => commit(resizePage(current(), id, size)),
    removePage: (id: string) => {
      commit(ops.removePage(current(), id));
      setPageId(null);
      setSelectedIds(new Set());
    },
    movePage: (id: string, direction: -1 | 1) => commit(ops.movePage(current(), id, direction)),
    updateElement: (id: string, patch: Partial<VenueElement>) => commit(ops.updateElement(current(), id, patch)),
    updateSelected: (patch: Partial<VenueElement>) => commit(ops.updateElements(current(), selectedIds, patch)),
    /** 指定した要素を消す（あてふり補助で置いた印を取り消すときなど） */
    removeElements: (ids: string[]) => {
      if (ids.length === 0) return;
      commit(ops.removeElements(current(), new Set(ids)));
      setSelectedIds(new Set());
    },
    removeSelected: () => {
      commit(ops.removeElements(current(), selectedIds));
      setSelectedIds(new Set());
    },
    duplicateSelected: () => {
      const result = ops.duplicateElements(current(), selectedIds);
      commit(result.doc);
      setSelectedIds(result.newIds);
    },
    moveSelected: (dxMm: number, dyMm: number) => commit(ops.moveElements(current(), selectedIds, dxMm, dyMm)),
    align: (mode: AlignMode) => commit(ops.alignElements(current(), selectedIds, mode)),
    distribute: (axis: 'horizontal' | 'vertical') => commit(ops.distributeElements(current(), selectedIds, axis)),
    layer: (mode: 'front' | 'back') => commit(ops.layerElements(current(), selectedIds, mode)),
    changeColumns: (elementId: string, change: (columns: TableColumn[]) => TableColumn[]) =>
      commit(ops.updateColumns(current(), elementId, change)),
    undo: history.undo,
    redo: history.redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}

export type VenueFormEditor = ReturnType<typeof useVenueFormEditor>;
