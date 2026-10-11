/** 会場書式エディタのあてふり補助（罫線の表示・吸着・枠いっぱい・範囲から表）の状態と操作。 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { VenueFormEditor } from '../useVenueFormEditor';
import type { VenueAsset } from '../venue-form-schema';
import { fitToCell } from './cell-fit';
import { buildTableElement, detectGrid, type Region, type TableGrid, type TableOptions } from './table-grid';
import { usePageLines } from './usePageLines';

export type AssistTool = 'none' | 'table';

export function useVenueAssist(editor: VenueFormEditor, liveId: string, assets: VenueAsset[]) {
  const lines = usePageLines(liveId, editor.currentPage ?? null, assets);
  const [showLines, setShowLines] = useState(false);
  const [snap, setSnap] = useState(true);
  const [tool, setTool] = useState<AssistTool>('none');
  const [pendingGrid, setPendingGrid] = useState<TableGrid | null>(null);

  // Esc で道具をやめる
  useEffect(() => {
    if (tool === 'none') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTool('none');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tool]);

  /** ダブルクリックした要素を、罫線の枠いっぱいに広げる（枠が無ければ何もしない） */
  const fitElementToCell = (id: string) => {
    const element = editor.pageElements.find((candidate) => candidate.id === id);
    const patch = element ? fitToCell(element, lines) : null;
    if (patch) editor.updateElement(id, patch);
  };

  const selectTableRegion = (region: Region) => {
    const grid = detectGrid(region, lines);
    if (!grid) {
      toast.error('範囲の中に表の罫線が見つかりません');
      return;
    }
    setTool('none');
    setPendingGrid(grid);
  };

  const createTable = (options: TableOptions) => {
    const page = editor.currentPage;
    if (!pendingGrid || !page) return;
    editor.addElements([buildTableElement(pendingGrid, options, page.id)]);
    setPendingGrid(null);
  };

  return {
    lines,
    showLines,
    setShowLines,
    snap,
    setSnap,
    snapLines: snap ? lines : undefined,
    tool,
    setTool,
    fitElementToCell,
    selectTableRegion,
    pendingGrid,
    createTable,
    closeTableDialog: () => setPendingGrid(null),
  };
}
