/** State + actions for the PDF canvas editor. Keeps a single CanvasDocument
 *  and exposes mutations for selection, drag/drop, alignment, undo/redo, etc. */
import { useCallback, useMemo, useRef, useState } from 'react';

import type {
  CanvasDocument,
  CanvasElement,
  TableColumn,
  TableElement,
  Orientation,
  PaperSize,
} from '../canvas-schema';
import { getPaperDimensions } from '../canvas-schema';
import { newId } from '../default-canvas';
import type { PaletteInsert } from './ElementPalette';
import type { AlignMode } from './AlignmentToolbar';

const HISTORY_LIMIT = 100;

export interface CanvasEditor {
  doc: CanvasDocument;
  selectedIds: Set<string>;
  selectedElement: CanvasElement | null;
  /** Replace the entire doc (for resets/init). Clears undo history. */
  setDoc: (doc: CanvasDocument) => void;
  setPage: (patch: { size?: PaperSize; orientation?: Orientation; marginMm?: number; baseFontSizePt?: number }) => void;
  select: (id: string | null, additive: boolean) => void;
  selectAll: () => void;
  insert: (insert: PaletteInsert, dropMm?: { xMm: number; yMm: number }) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  updateColumn: (elementId: string, columnId: string, patch: Partial<TableColumn>) => void;
  addColumn: (elementId: string) => void;
  removeColumn: (elementId: string, columnId: string) => void;
  remove: (ids?: string[]) => void;
  duplicate: () => void;
  align: (mode: AlignMode) => void;
  distribute: (axis: 'horizontal' | 'vertical') => void;
  layer: (mode: 'front' | 'back') => void;
  nudge: (dx: number, dy: number) => void;
  /** Move all selected elements by the given mm delta (used for multi-drag). */
  moveSelection: (dxMm: number, dyMm: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Clear undo/redo stacks without changing the document. */
  resetHistory: () => void;
}

export function useCanvasEditor(initial: CanvasDocument): CanvasEditor {
  const [docState, setDocState] = useState(initial);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [past, setPast] = useState<CanvasDocument[]>([]);
  const [future, setFuture] = useState<CanvasDocument[]>([]);

  // Always-current doc reference — avoids stale closures in callbacks.
  const docRef = useRef(initial);
  // Debounce timer for nudge coalescing.
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- history helpers -----

  /** Apply a new document and push the previous state onto the undo stack. */
  const commit = useCallback((next: CanvasDocument) => {
    const snapshot = docRef.current;
    docRef.current = next;
    setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), snapshot]);
    setFuture([]);
    setDocState(next);
  }, []);

  // ----- public API -----

  /** Replace doc without recording history (resets, canvas init). */
  const setDoc = useCallback((newDoc: CanvasDocument) => {
    docRef.current = newDoc;
    setPast([]);
    setFuture([]);
    setDocState(newDoc);
  }, []);

  const resetHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const current = docRef.current;
    docRef.current = prev;
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [...f, current]);
    setDocState(prev);
  }, [past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[future.length - 1];
    const current = docRef.current;
    docRef.current = next;
    setFuture((f) => f.slice(0, -1));
    setPast((p) => [...p, current]);
    setDocState(next);
  }, [future]);

  // ----- derived -----

  const selectedElement = useMemo(() => {
    if (selectedIds.size !== 1) return null;
    const id = Array.from(selectedIds)[0];
    return docState.elements.find((e) => e.id === id) ?? null;
  }, [docState, selectedIds]);

  // ----- mutations -----

  const setPage = useCallback((patch: Parameters<CanvasEditor['setPage']>[0]) => {
    const shouldScale = patch.size !== undefined || patch.orientation !== undefined;
    let elements = docRef.current.elements;

    if (shouldScale) {
      const oldDims = getPaperDimensions(docRef.current.page.size, docRef.current.page.orientation);
      const newPage = { ...docRef.current.page, ...patch };
      const newDims = getPaperDimensions(newPage.size, newPage.orientation);

      const scaleX = newDims.widthMm / oldDims.widthMm;
      const scaleY = newDims.heightMm / oldDims.heightMm;

      elements = elements.map((el) => ({
        ...el,
        xMm: el.xMm * scaleX,
        yMm: el.yMm * scaleY,
        wMm: el.wMm * scaleX,
        hMm: el.hMm * scaleY,
      }));
    }

    commit({ ...docRef.current, page: { ...docRef.current.page, ...patch }, elements });
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

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(docState.elements.map((e) => e.id)));
  }, [docState.elements]);

  const insert = useCallback((ins: PaletteInsert, dropMm?: { xMm: number; yMm: number }) => {
    const baseX = dropMm?.xMm ?? 12;
    const baseY = dropMm?.yMm ?? 12;
    let element: CanvasElement;
    switch (ins.kind) {
      case 'text': {
        element = {
          id: newId(),
          kind: 'text',
          xMm: baseX,
          yMm: baseY,
          wMm: 80,
          hMm: 10,
          content: ins.content,
          fontSizePt: ins.title === '見出し' ? 18 : 10,
          bold: ins.title === '見出し',
          align: 'left',
          verticalAlign: 'middle',
          color: '#111827',
        };
        break;
      }
      case 'field': {
        element = {
          id: newId(),
          kind: 'field',
          xMm: baseX,
          yMm: baseY,
          wMm: 80,
          hMm: 8,
          fieldId: ins.fieldId,
          fallbackLabel: ins.fallbackLabel,
          showLabel: true,
          fontSizePt: 10,
          align: 'left',
          verticalAlign: 'middle',
          color: '#111827',
        };
        break;
      }
      case 'divider':
        element = {
          id: newId(),
          kind: 'divider',
          xMm: baseX,
          yMm: baseY,
          wMm: 100,
          hMm: 1,
          color: '#d1d5db',
          thicknessPt: 0.6,
        };
        break;
      case 'spacer':
        element = {
          id: newId(),
          kind: 'spacer',
          xMm: baseX,
          yMm: baseY,
          wMm: 50,
          hMm: 20,
        };
        break;
      case 'table-empty': {
        element = {
          id: newId(),
          kind: 'table',
          xMm: baseX,
          yMm: baseY,
          wMm: 120,
          hMm: 40,
          source: { kind: 'fields', fields: [] },
          columns: [
            { id: newId(), header: '項目', fieldId: '__label__', widthRatio: 0.4, align: 'left' },
            { id: newId(), header: '内容', fieldId: '', widthRatio: 0.6, align: 'left' },
          ],
          showHeader: true,
          fontSizePt: 9,
          headerFill: '#e5edf6',
          borderColor: '#d1d5db',
        };
        break;
      }
      case 'table-group': {
        element = {
          id: newId(),
          kind: 'table',
          xMm: baseX,
          yMm: baseY,
          wMm: 160,
          hMm: 60,
          source: { kind: 'group', groupId: ins.groupId, fallbackLabel: ins.fallbackLabel },
          columns: [
            { id: newId(), header: 'No', fieldId: '__index__', widthRatio: 0.1, align: 'center' },
            { id: newId(), header: '値', fieldId: '', widthRatio: 0.9, align: 'left' },
          ],
          showHeader: true,
          fontSizePt: 9,
          headerFill: '#e5edf6',
          borderColor: '#d1d5db',
        };
        break;
      }
    }
    const next = { ...docRef.current, elements: [...docRef.current.elements, element] };
    commit(next);
    setSelectedIds(new Set([element.id]));
  }, [commit]);

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    commit({
      ...docRef.current,
      elements: docRef.current.elements.map((e) => (e.id === id ? mergeElement(e, patch) : e)),
    });
  }, [commit]);

  const updateColumn = useCallback((elementId: string, columnId: string, patch: Partial<TableColumn>) => {
    commit({
      ...docRef.current,
      elements: docRef.current.elements.map((e) => {
        if (e.id !== elementId || e.kind !== 'table') return e;
        return { ...e, columns: e.columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c)) };
      }),
    });
  }, [commit]);

  const addColumn = useCallback((elementId: string) => {
    commit({
      ...docRef.current,
      elements: docRef.current.elements.map((e) => {
        if (e.id !== elementId || e.kind !== 'table') return e;
        const next: TableColumn = { id: newId(), header: '新しい列', fieldId: '', widthRatio: 0.2, align: 'left' };
        return { ...e, columns: [...e.columns, next] };
      }),
    });
  }, [commit]);

  const removeColumn = useCallback((elementId: string, columnId: string) => {
    commit({
      ...docRef.current,
      elements: docRef.current.elements.map((e) => {
        if (e.id !== elementId || e.kind !== 'table') return e;
        return { ...e, columns: e.columns.filter((c) => c.id !== columnId) };
      }),
    });
  }, [commit]);

  const remove = useCallback((ids?: string[]) => {
    const removeSet = new Set(ids ?? Array.from(selectedIds));
    if (removeSet.size === 0) return;
    commit({ ...docRef.current, elements: docRef.current.elements.filter((e) => !removeSet.has(e.id)) });
    setSelectedIds(new Set());
  }, [selectedIds, commit]);

  const duplicate = useCallback(() => {
    if (selectedIds.size === 0) return;
    const newSelected = new Set<string>();
    const additions: CanvasElement[] = [];
    for (const e of docRef.current.elements) {
      if (selectedIds.has(e.id)) {
        const clone = { ...e, id: newId(), xMm: e.xMm + 4, yMm: e.yMm + 4 } as CanvasElement;
        if (clone.kind === 'table') {
          (clone as TableElement).columns = (clone as TableElement).columns.map((c) => ({ ...c, id: newId() }));
        }
        additions.push(clone);
        newSelected.add(clone.id);
      }
    }
    commit({ ...docRef.current, elements: [...docRef.current.elements, ...additions] });
    setSelectedIds(newSelected);
  }, [selectedIds, commit]);

  const align = useCallback((mode: AlignMode) => {
    if (selectedIds.size < 2) return;
    const sel = docRef.current.elements.filter((e) => selectedIds.has(e.id));
    const updates = computeAlignment(sel, mode);
    commit({
      ...docRef.current,
      elements: docRef.current.elements.map((e) =>
        updates.get(e.id) ? { ...e, ...updates.get(e.id)! } as CanvasElement : e
      ),
    });
  }, [selectedIds, commit]);

  const distribute = useCallback((axis: 'horizontal' | 'vertical') => {
    if (selectedIds.size < 3) return;
    const sel = docRef.current.elements.filter((e) => selectedIds.has(e.id));
    const updates = computeDistribution(sel, axis);
    commit({
      ...docRef.current,
      elements: docRef.current.elements.map((e) =>
        updates.get(e.id) ? { ...e, ...updates.get(e.id)! } as CanvasElement : e
      ),
    });
  }, [selectedIds, commit]);

  const layer = useCallback((mode: 'front' | 'back') => {
    if (selectedIds.size === 0) return;
    const selected = docRef.current.elements.filter((e) => selectedIds.has(e.id));
    const others = docRef.current.elements.filter((e) => !selectedIds.has(e.id));
    commit({
      ...docRef.current,
      elements: mode === 'front' ? [...others, ...selected] : [...selected, ...others],
    });
  }, [selectedIds, commit]);

  const nudge = useCallback((dx: number, dy: number) => {
    if (selectedIds.size === 0) return;

    // Coalesce rapid nudges: only push a new history snapshot when the
    // debounce window has expired (i.e. first key-press in a sequence).
    if (!nudgeTimerRef.current) {
      setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), docRef.current]);
      setFuture([]);
    }
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => { nudgeTimerRef.current = null; }, 500);

    const next: CanvasDocument = {
      ...docRef.current,
      elements: docRef.current.elements.map((e) =>
        selectedIds.has(e.id)
          ? { ...e, xMm: round1(e.xMm + dx), yMm: round1(e.yMm + dy) } as CanvasElement
          : e
      ),
    };
    docRef.current = next;
    setDocState(next);
  }, [selectedIds]);

  const moveSelection = useCallback((dxMm: number, dyMm: number) => {
    if (selectedIds.size === 0) return;
    const { widthMm, heightMm } = getPaperDimensions(
      docRef.current.page.size,
      docRef.current.page.orientation,
    );

    // Clamp delta so no selected element leaves the canvas.
    let cdx = dxMm;
    let cdy = dyMm;
    for (const e of docRef.current.elements) {
      if (!selectedIds.has(e.id)) continue;
      if (e.xMm + cdx < 0) cdx = -e.xMm;
      if (e.yMm + cdy < 0) cdy = -e.yMm;
      if (e.xMm + e.wMm + cdx > widthMm) cdx = widthMm - e.xMm - e.wMm;
      if (e.yMm + e.hMm + cdy > heightMm) cdy = heightMm - e.yMm - e.hMm;
    }

    commit({
      ...docRef.current,
      elements: docRef.current.elements.map((e) =>
        selectedIds.has(e.id)
          ? { ...e, xMm: round1(e.xMm + cdx), yMm: round1(e.yMm + cdy) } as CanvasElement
          : e
      ),
    });
  }, [selectedIds, commit]);

  return {
    doc: docState,
    selectedIds,
    selectedElement,
    setDoc,
    setPage,
    select,
    selectAll,
    insert,
    updateElement,
    updateColumn,
    addColumn,
    removeColumn,
    remove,
    duplicate,
    align,
    distribute,
    layer,
    nudge,
    moveSelection,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    resetHistory,
  };
}

function mergeElement(element: CanvasElement, patch: Partial<CanvasElement>): CanvasElement {
  const rest = { ...(patch as unknown as Record<string, unknown>) };
  delete rest.kind;
  const merged: Record<string, unknown> = { ...(element as unknown as Record<string, unknown>), ...rest };
  return merged as unknown as CanvasElement;
}

function computeAlignment(sel: CanvasElement[], mode: AlignMode): Map<string, Partial<CanvasElement>> {
  const out = new Map<string, Partial<CanvasElement>>();
  if (sel.length === 0) return out;
  const minX = Math.min(...sel.map((e) => e.xMm));
  const minY = Math.min(...sel.map((e) => e.yMm));
  const maxRight = Math.max(...sel.map((e) => e.xMm + e.wMm));
  const maxBottom = Math.max(...sel.map((e) => e.yMm + e.hMm));
  const centerX = (minX + maxRight) / 2;
  const centerY = (minY + maxBottom) / 2;
  for (const e of sel) {
    switch (mode) {
      case 'left': out.set(e.id, { xMm: minX }); break;
      case 'right': out.set(e.id, { xMm: maxRight - e.wMm }); break;
      case 'center-h': out.set(e.id, { xMm: centerX - e.wMm / 2 }); break;
      case 'top': out.set(e.id, { yMm: minY }); break;
      case 'bottom': out.set(e.id, { yMm: maxBottom - e.hMm }); break;
      case 'center-v': out.set(e.id, { yMm: centerY - e.hMm / 2 }); break;
    }
  }
  return out;
}

function computeDistribution(sel: CanvasElement[], axis: 'horizontal' | 'vertical'): Map<string, Partial<CanvasElement>> {
  const out = new Map<string, Partial<CanvasElement>>();
  if (sel.length < 3) return out;
  const sorted = [...sel].sort((a, b) => axis === 'horizontal' ? a.xMm - b.xMm : a.yMm - b.yMm);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (axis === 'horizontal') {
    const span = (last.xMm + last.wMm) - first.xMm;
    const totalWidths = sorted.reduce((s, e) => s + e.wMm, 0);
    const gap = (span - totalWidths) / (sorted.length - 1);
    let cursor = first.xMm;
    for (const e of sorted) {
      out.set(e.id, { xMm: round1(cursor) });
      cursor += e.wMm + gap;
    }
  } else {
    const span = (last.yMm + last.hMm) - first.yMm;
    const totalHeights = sorted.reduce((s, e) => s + e.hMm, 0);
    const gap = (span - totalHeights) / (sorted.length - 1);
    let cursor = first.yMm;
    for (const e of sorted) {
      out.set(e.id, { yMm: round1(cursor) });
      cursor += e.hMm + gap;
    }
  }
  return out;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
