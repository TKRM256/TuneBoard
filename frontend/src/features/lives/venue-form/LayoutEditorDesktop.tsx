/** PC の書式エディタ。左にページと要素、中央に書式、右に設定を並べる。左右の欄は境目をドラッグして広げられ、幅は次に開いたときも残る。 */
import type { LayoutStorage } from 'react-resizable-panels';
import { useDefaultLayout } from 'react-resizable-panels';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

import { AlignmentToolbar } from '../canvas-shared/AlignmentToolbar';
import type { FieldCatalog } from '../canvas-shared/field-catalog';
import type { SettingSheetBlock } from '../types/live-types';
import { AssistCanvasLayer, AssistDialogs, AssistGuide } from './assist/AssistParts';
import { AssistToggles } from './assist/AssistToggles';
import { useVenueAssist } from './assist/useVenueAssist';
import type { GridFitProps } from './GridProperties';
import { useCanvasViewport } from './useCanvasViewport';
import type { VenueFormEditor } from './useVenueFormEditor';
import { useVenueKeyboardShortcuts } from './useVenueKeyboardShortcuts';
import { VenueCanvas } from './VenueCanvas';
import { VenueEditorHeader, type EditorHeaderProps } from './VenueEditorHeader';
import { VenuePagesPanel } from './VenuePagesPanel';
import { VenuePalette } from './VenuePalette';
import { VenuePropertyPanel } from './VenuePropertyPanel';
import type { VenueAsset } from './venue-form-schema';
import { ZoomFitButtons } from './ZoomFitButtons';

interface Props {
  header: EditorHeaderProps;
  liveId: string;
  editor: VenueFormEditor;
  catalog: FieldCatalog;
  blocksById: Map<string, SettingSheetBlock>;
  assets: VenueAsset[];
  onAssetUploaded: (asset: VenueAsset) => void;
  gridFit: GridFitProps;
}

/** ブラウザの保存領域が使えないときは、幅を覚えずに毎回の既定の幅で開く。 */
const panelStorage: LayoutStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // 覚えられなくても編集はできる
    }
  },
};

export function LayoutEditorDesktop({ header, liveId, editor, catalog, blocksById, assets, onAssetUploaded, gridFit }: Props) {
  const { scrollerRef, canvasRef, ...viewport } = useCanvasViewport(editor.currentPage ?? null);
  const assist = useVenueAssist(editor, { liveId, assets, catalog, blocksById });
  useVenueKeyboardShortcuts(editor, assist.lines);
  const panelLayout = useDefaultLayout({ id: 'pdf-layout-editor', storage: panelStorage });

  return (
    <div className="flex h-full w-full flex-col">
      <VenueEditorHeader {...header} />
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1" defaultLayout={panelLayout.defaultLayout} onLayoutChanged={panelLayout.onLayoutChanged}>
        <ResizablePanel id="parts" defaultSize="16rem" minSize="13rem" maxSize="32rem" groupResizeBehavior="preserve-pixel-size">
          <aside className="h-full space-y-6 overflow-y-auto p-3">
            <VenuePagesPanel liveId={liveId} editor={editor} assets={assets} onAssetUploaded={onAssetUploaded} />
            <VenuePalette catalog={catalog} disabled={!editor.currentPage} onInsert={editor.insert} />
          </aside>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="canvas" minSize="24rem">
          <main className="flex h-full min-w-0 flex-col">
            <AlignmentToolbar
              selectionCount={editor.selectedIds.size}
              pxPerMm={viewport.pxPerMm}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              onUndo={editor.undo}
              onRedo={editor.redo}
              onZoomIn={viewport.zoomIn}
              onZoomOut={viewport.zoomOut}
              zoomExtras={(
                <>
                  <ZoomFitButtons onFitPage={viewport.fitPage} onFitWidth={viewport.fitWidth} onReset={viewport.resetZoom} />
                  <AssistToggles
                    lineCount={assist.lines.length}
                    showLines={assist.showLines}
                    onShowLinesChange={assist.setShowLines}
                    tool={assist.tool}
                    onToolChange={assist.setTool}
                  />
                </>
              )}
              onAlign={editor.align}
              onDistribute={editor.distribute}
              onLayer={editor.layer}
              onDuplicate={editor.duplicateSelected}
              onDelete={editor.removeSelected}
            />
            <div className="relative min-h-0 flex-1">
              <AssistGuide assist={assist} />
              {editor.selectedIds.size > 0 ? (
                // 道具の帯に置くと帯が 2 行に割れるので、書式の左下に重ねて出す
                <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full border bg-background/90 px-2 py-0.5 text-xs text-muted-foreground shadow-sm">
                  {editor.selectedIds.size}件選択中
                </span>
              ) : null}
              <div ref={scrollerRef} data-tour="venue-canvas" className="h-full overflow-auto bg-muted/20 p-6 [scrollbar-gutter:stable]" {...viewport.scrollerProps}>
                {editor.currentPage ? (
                  <div className="flex w-max min-w-full justify-center">
                    <VenueCanvas
                      canvasRef={canvasRef}
                      backgroundIsPdf={isPdfBackground(assets, editor.currentPage.background?.assetId)}
                      ruledLines={assist.lines}
                      showRuledLines={assist.showLines || assist.tool !== 'none'}
                      snapLines={assist.lines}
                      onElementDoubleClick={assist.fitElementToCell}
                      overlay={<AssistCanvasLayer assist={assist} pxPerMm={viewport.pxPerMm} />}
                      liveId={liveId}
                      page={editor.currentPage}
                      elements={editor.pageElements}
                      catalog={catalog}
                      pxPerMm={viewport.pxPerMm}
                      selectedIds={editor.selectedIds}
                      onSelect={editor.select}
                      onSelectMany={editor.selectMany}
                      onUpdate={editor.updateElement}
                      onMoveSelection={editor.moveSelected}
                    />
                  </div>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted-foreground">ページがありません</p>
                )}
              </div>
            </div>
          </main>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel id="settings" defaultSize="20rem" minSize="16rem" maxSize="36rem" groupResizeBehavior="preserve-pixel-size">
          <aside className="h-full" data-tour="venue-properties">
            <VenuePropertyPanel
              key={[...editor.selectedIds].join(',') || 'none'}
              element={editor.selectedElement}
              selectedElements={editor.selectedElements}
              catalog={catalog}
              blocksById={blocksById}
              onUpdate={editor.updateElement}
              onUpdateSelected={editor.updateSelected}
              onChangeColumns={editor.changeColumns}
              {...gridFit}
            />
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>
      <AssistDialogs assist={assist} catalog={catalog} />
    </div>
  );
}

function isPdfBackground(assets: VenueAsset[], assetId: string | undefined) {
  return Boolean(assetId && assets.find((asset) => asset.id === assetId)?.contentType === 'application/pdf');
}
