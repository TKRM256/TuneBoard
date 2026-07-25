/** Hook-level tests for the canvas editor: insert, select, align, distribute,
 *  duplicate, delete, layer ordering. */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CanvasDocument, CanvasElement, TableElement, TextElement } from '../canvas-schema';
import { useCanvasEditor } from './useCanvasEditor';

function makeDoc(elements: CanvasElement[] = []): CanvasDocument {
  return {
    page: { size: 'A4', orientation: 'LANDSCAPE', marginMm: 8, baseFontSizePt: 9 },
    elements,
  };
}

function makeText(id: string, x: number, y: number, w = 40, h = 10): TextElement {
  return {
    id,
    kind: 'text',
    xMm: x,
    yMm: y,
    wMm: w,
    hMm: h,
    content: id,
    fontSizePt: 10,
  };
}

describe('useCanvasEditor', () => {
  describe('selection', () => {
    it('select replaces selection by default', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc([makeText('a', 0, 0), makeText('b', 0, 0)])));
      act(() => result.current.select('a', false));
      expect(Array.from(result.current.selectedIds)).toEqual(['a']);
      act(() => result.current.select('b', false));
      expect(Array.from(result.current.selectedIds)).toEqual(['b']);
    });

    it('select toggles when additive=true', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc([makeText('a', 0, 0), makeText('b', 0, 0)])));
      act(() => result.current.select('a', false));
      act(() => result.current.select('b', true));
      expect(result.current.selectedIds.size).toBe(2);
      act(() => result.current.select('a', true));
      expect(Array.from(result.current.selectedIds)).toEqual(['b']);
    });

    it('select(null) clears selection', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc([makeText('a', 0, 0)])));
      act(() => result.current.select('a', false));
      act(() => result.current.select(null, false));
      expect(result.current.selectedIds.size).toBe(0);
    });
  });

  describe('insert', () => {
    it('appends a text element from a palette text insert', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc()));
      act(() => result.current.insert({ kind: 'text', content: '${live.name}', title: 'タイトル' }, { xMm: 5, yMm: 5 }));
      expect(result.current.doc.elements).toHaveLength(1);
      const el = result.current.doc.elements[0];
      expect(el.kind).toBe('text');
      if (el.kind === 'text') {
        expect(el.content).toBe('${live.name}');
        expect(el.xMm).toBe(5);
        expect(el.yMm).toBe(5);
      }
      expect(Array.from(result.current.selectedIds)).toEqual([el.id]);
    });

    it('inserts a group-bound table from a palette group insert', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc()));
      act(() =>
        result.current.insert({ kind: 'table-group', groupId: 'members', fallbackLabel: '出演者' }, { xMm: 0, yMm: 0 }),
      );
      const table = result.current.doc.elements[0] as TableElement;
      expect(table.kind).toBe('table');
      expect(table.source).toEqual({ kind: 'group', groupId: 'members', fallbackLabel: '出演者' });
      expect(table.columns.some((c) => c.fieldId === '__index__')).toBe(true);
    });
  });

  describe('columns', () => {
    function tableDoc() {
      const table: TableElement = {
        id: 't', kind: 'table', xMm: 0, yMm: 0, wMm: 100, hMm: 40, fontSizePt: 9,
        source: { kind: 'group', groupId: 'members' },
        columns: [
          { id: 'c1', header: '氏名', fieldId: 'f1', widthRatio: 0.3 },
          { id: 'c2', header: 'パート', fieldId: 'f2', widthRatio: 0.3 },
          { id: 'c3', header: '備考', fieldId: 'f3', widthRatio: 0.4 },
        ],
      };
      return makeDoc([table]);
    }

    const headers = (doc: CanvasDocument) => (doc.elements[0] as TableElement).columns.map((c) => c.header);

    it('列を左へ移動できる', () => {
      const { result } = renderHook(() => useCanvasEditor(tableDoc()));
      act(() => result.current.moveColumn('t', 'c2', -1));
      expect(headers(result.current.doc)).toEqual(['パート', '氏名', '備考']);
    });

    it('列を右へ移動できる', () => {
      const { result } = renderHook(() => useCanvasEditor(tableDoc()));
      act(() => result.current.moveColumn('t', 'c1', 1));
      expect(headers(result.current.doc)).toEqual(['パート', '氏名', '備考']);
    });

    it('端を越える移動は並びを変えない', () => {
      const { result } = renderHook(() => useCanvasEditor(tableDoc()));
      act(() => result.current.moveColumn('t', 'c1', -1));
      act(() => result.current.moveColumn('t', 'c3', 1));
      expect(headers(result.current.doc)).toEqual(['氏名', 'パート', '備考']);
    });

    it('列の移動は undo できる', () => {
      const { result } = renderHook(() => useCanvasEditor(tableDoc()));
      act(() => result.current.moveColumn('t', 'c1', 1));
      act(() => result.current.undo());
      expect(headers(result.current.doc)).toEqual(['氏名', 'パート', '備考']);
    });
  });

  describe('updateElement', () => {
    it('merges patch onto an existing element without losing the kind discriminant', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc([makeText('a', 0, 0)])));
      act(() => result.current.updateElement('a', { xMm: 50, yMm: 80 }));
      const el = result.current.doc.elements[0];
      expect(el.kind).toBe('text');
      expect(el.xMm).toBe(50);
      expect(el.yMm).toBe(80);
    });
  });

  describe('alignment', () => {
    it('left aligns multi-selected elements to the leftmost x', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 10, 0), makeText('b', 30, 0)])),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.select('b', true));
      act(() => result.current.align('left'));
      const xs = result.current.doc.elements.map((e) => e.xMm);
      expect(xs).toEqual([10, 10]);
    });

    it('right aligns to the rightmost edge', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 10, 0, 40), makeText('b', 30, 0, 60)])),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.select('b', true));
      act(() => result.current.align('right'));
      const a = result.current.doc.elements.find((e) => e.id === 'a')!;
      const b = result.current.doc.elements.find((e) => e.id === 'b')!;
      expect(a.xMm + a.wMm).toBeCloseTo(b.xMm + b.wMm);
    });

    it('center-h centers elements on the bounding center', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 0, 0, 20), makeText('b', 100, 0, 20)])),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.select('b', true));
      act(() => result.current.align('center-h'));
      const a = result.current.doc.elements.find((e) => e.id === 'a')!;
      const b = result.current.doc.elements.find((e) => e.id === 'b')!;
      expect(a.xMm + a.wMm / 2).toBeCloseTo(b.xMm + b.wMm / 2);
    });

    it('top aligns to the topmost y', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 0, 5), makeText('b', 0, 30)])),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.select('b', true));
      act(() => result.current.align('top'));
      const ys = result.current.doc.elements.map((e) => e.yMm);
      expect(ys).toEqual([5, 5]);
    });

    it('does nothing when fewer than 2 elements are selected', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 10, 0), makeText('b', 30, 0)])),
      );
      act(() => result.current.select('a', false));
      const before = result.current.doc.elements.map((e) => e.xMm);
      act(() => result.current.align('left'));
      const after = result.current.doc.elements.map((e) => e.xMm);
      expect(after).toEqual(before);
    });
  });

  describe('distribute', () => {
    it('evenly distributes 3+ elements horizontally', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(
          makeDoc([
            makeText('a', 0, 0, 10),
            makeText('b', 12, 0, 10),
            makeText('c', 100, 0, 10),
          ]),
        ),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.select('b', true));
      act(() => result.current.select('c', true));
      act(() => result.current.distribute('horizontal'));
      const els = result.current.doc.elements;
      // Outer two anchors should remain; middle gap should be balanced.
      const a = els.find((e) => e.id === 'a')!;
      const b = els.find((e) => e.id === 'b')!;
      const c = els.find((e) => e.id === 'c')!;
      expect(b.xMm - (a.xMm + a.wMm)).toBeCloseTo(c.xMm - (b.xMm + b.wMm));
    });
  });

  describe('duplicate / delete / layer', () => {
    it('duplicate clones selected elements with new ids and offset', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc([makeText('a', 10, 10)])));
      act(() => result.current.select('a', false));
      act(() => result.current.duplicate());
      expect(result.current.doc.elements).toHaveLength(2);
      const original = result.current.doc.elements[0];
      const clone = result.current.doc.elements[1];
      expect(clone.id).not.toBe(original.id);
      expect(clone.xMm).toBe(14);
      expect(clone.yMm).toBe(14);
      expect(Array.from(result.current.selectedIds)).toEqual([clone.id]);
    });

    it('remove deletes selected elements and clears selection', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 0, 0), makeText('b', 0, 0)])),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.remove());
      expect(result.current.doc.elements.map((e) => e.id)).toEqual(['b']);
      expect(result.current.selectedIds.size).toBe(0);
    });

    it('layer front moves selection to end of array, back moves to start', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 0, 0), makeText('b', 0, 0), makeText('c', 0, 0)])),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.layer('front'));
      expect(result.current.doc.elements.map((e) => e.id)).toEqual(['b', 'c', 'a']);
      act(() => result.current.layer('back'));
      expect(result.current.doc.elements.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('nudge', () => {
    it('moves only selected elements by the requested delta', () => {
      const { result } = renderHook(() =>
        useCanvasEditor(makeDoc([makeText('a', 10, 10), makeText('b', 50, 50)])),
      );
      act(() => result.current.select('a', false));
      act(() => result.current.nudge(5, -2));
      const a = result.current.doc.elements.find((e) => e.id === 'a')!;
      const b = result.current.doc.elements.find((e) => e.id === 'b')!;
      expect(a.xMm).toBe(15);
      expect(a.yMm).toBe(8);
      expect(b.xMm).toBe(50);
      expect(b.yMm).toBe(50);
    });
  });

  describe('setPage', () => {
    it('patches page properties without dropping the rest', () => {
      const { result } = renderHook(() => useCanvasEditor(makeDoc()));
      act(() => result.current.setPage({ size: 'B5', orientation: 'PORTRAIT' }));
      expect(result.current.doc.page.size).toBe('B5');
      expect(result.current.doc.page.orientation).toBe('PORTRAIT');
      expect(result.current.doc.page.marginMm).toBe(8);
    });
  });
});
