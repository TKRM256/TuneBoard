/** 会場書式エディタの状態（書式・選択中の要素・表示中のページ）と操作。 */
import { useCallback, useMemo, useRef, useState } from 'react';

import type { TableColumn } from '../pdf/canvas-schema';
import type { AlignMode } from '../canvas-shared/geometry';
import { useUndoableState } from '../canvas-shared/useUndoableState';
import { copyElements, pasteElements, type PasteMode } from './venue-clipboard';
import { createElement, type ElementInsert } from './venue-element-factory';
import * as ops from './venue-form-ops';
import { emptyVenueForm, type VenueElement, type VenueFormDocument, type VenuePage } from './venue-form-schema';

export function useVenueFormEditor() {
  const history = useUndoableState<VenueFormDocument>(emptyVenueForm());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageId, setPageId] = useState<string | null>(null);
  const clipboardRef = useRef<VenueElement[]>([]);
  const { commit, current, replace } = history;
  const doc = history.value;

  const currentPage = doc.pages.find((page) => page.id === pageId) ?? doc.pages[0] ?? null;
  const pageElements = useMemo(
    () => (currentPage ? doc.elements.filter((element) => element.pageId === currentPage.id) : []),
    [doc.elements, currentPage],
  );
  const selectedElement = selectedIds.size === 1
    ? doc.elements.find((element) => selectedIds.has(element.id)) ?? null
    : null;

  const load = useCallback((next: VenueFormDocument) => {
    replace(next);
    setSelectedIds(new Set());
    setPageId(next.pages[0]?.id ?? null);
  }, [replace]);

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

  const addPage = useCallback((page: VenuePage) => {
    commit(ops.addPage(current(), page));
    showPage(page.id);
  }, [commit, current, showPage]);

  /** 選んだ要素を覚える。貼るたびに貼った要素を覚え直すので、続けて貼ると少しずつずれていく */
  const copySelected = useCallback(() => {
    clipboardRef.current = copyElements(current(), selectedIds);
    return clipboardRef.current.length;
  }, [current, selectedIds]);

  /** same: そのまま複製 / next: すぐ下に置き items[N] を 1 つ進める */
  const paste = useCallback((mode: PasteMode) => {
    if (!currentPage || clipboardRef.current.length === 0) return;
    const result = pasteElements(current(), clipboardRef.current, currentPage.id, mode);
    commit(result.doc);
    clipboardRef.current = result.pasted;
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
    currentPage,
    pageElements,
    selectedIds,
    selectedElement,
    select,
    showPage,
    insert,
    addPage,
    updatePage: (id: string, patch: Partial<VenuePage>) => commit(ops.updatePage(current(), id, patch)),
    removePage: (id: string) => {
      commit(ops.removePage(current(), id));
      setPageId(null);
      setSelectedIds(new Set());
    },
    movePage: (id: string, direction: -1 | 1) => commit(ops.movePage(current(), id, direction)),
    updateElement: (id: string, patch: Partial<VenueElement>) => commit(ops.updateElement(current(), id, patch)),
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
