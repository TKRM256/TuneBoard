/** 会場書式エディタのあてふり補助（罫線の表示・枠いっぱい・範囲から表・選択肢の印）の状態と操作。 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { FieldCatalog } from '../../canvas-shared/field-catalog';
import type { SettingSheetBlock } from '../../types/live-types';
import type { VenueFormEditor } from '../useVenueFormEditor';
import type { VenueAsset } from '../venue-form-schema';
import { fitToCell } from './cell-fit';
import { markerTargets, type MarkerConfig } from './choice-markers';
import { buildCellTexts, detectGrid, type Region, type TableGrid, type TableOptions } from './table-grid';
import { useChoiceMarkers } from './useChoiceMarkers';
import { usePageLines } from './usePageLines';

/** table: 書式の表を囲んで、マスごとに項目を並べる / marker: 選択肢の印を順に置く */
export type AssistTool = 'none' | 'table' | 'marker';

interface Options {
  liveId: string;
  assets: VenueAsset[];
  catalog: FieldCatalog;
  blocksById: Map<string, SettingSheetBlock>;
}

export function useVenueAssist(editor: VenueFormEditor, { liveId, assets, catalog, blocksById }: Options) {
  const lines = usePageLines(liveId, editor.currentPage ?? null, assets);
  const [showLines, setShowLines] = useState(false);
  const [tool, setToolState] = useState<AssistTool>('none');
  const [pendingGrid, setPendingGrid] = useState<TableGrid | null>(null);
  const [markerSetupOpen, setMarkerSetupOpen] = useState(false);
  const markers = useChoiceMarkers(editor, () => setToolState('none'));
  const targets = useMemo(() => markerTargets(catalog, blocksById), [catalog, blocksById]);

  const setTool = (next: AssistTool) => {
    if (markers.session && next !== 'marker') markers.finish();
    if (next === 'marker') {
      // 印は置き始める前に項目と印の種類を選ぶ
      setMarkerSetupOpen(true);
      return;
    }
    setToolState(next);
  };

  // Esc で道具をやめる
  useEffect(() => {
    if (tool === 'none') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (markers.session) markers.finish();
      else setToolState('none');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tool, markers]);

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
    setToolState('none');
    setPendingGrid(grid);
  };

  const createTable = (options: TableOptions) => {
    const page = editor.currentPage;
    if (!pendingGrid || !page) return;
    editor.addElements(buildCellTexts(pendingGrid, options, page.id));
    setPendingGrid(null);
  };

  const startMarkers = (config: MarkerConfig) => {
    setMarkerSetupOpen(false);
    setToolState('marker');
    markers.start(config);
  };

  return {
    lines,
    showLines,
    setShowLines,
    tool,
    setTool,
    fitElementToCell,
    selectTableRegion,
    pendingGrid,
    createTable,
    closeTableDialog: () => setPendingGrid(null),
    markerTargets: targets,
    markerSetupOpen,
    closeMarkerSetup: () => setMarkerSetupOpen(false),
    startMarkers,
    markers,
  };
}
