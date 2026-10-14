/** スマホの書式エディタ。PC と同じ書式・部品を使い、書式・要素・設定をタブで切り替える。
 *  罫線への吸い付けなどの細かい補助は PC だけにする。 */
import { useState } from 'react';
import { Copy, Minus, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';

import { BackButton } from '@/components/original/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { FieldCatalog } from '../canvas-shared/field-catalog';
import type { SettingSheetBlock } from '../types/live-types';
import type { GridFitProps } from './GridProperties';
import { useCanvasViewport } from './useCanvasViewport';
import type { VenueFormEditor } from './useVenueFormEditor';
import { VenueCanvas } from './VenueCanvas';
import { ExportButton, LayoutNameInput, PreviewButton, SampleSelect, SaveButton, type EditorHeaderProps } from './VenueEditorHeader';
import { VenuePagesPanel } from './VenuePagesPanel';
import { FormTemplateFill } from './FormTemplateFill';
import { VenuePalette } from './VenuePalette';
import { VenuePropertyPanel } from './VenuePropertyPanel';
import type { ElementInsert } from './venue-element-factory';
import type { VenueAsset } from './venue-form-schema';

type Tab = 'canvas' | 'parts' | 'properties';

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

export function LayoutEditorMobile({ header, liveId, editor, catalog, blocksById, assets, onAssetUploaded, gridFit }: Props) {
  const [tab, setTab] = useState<Tab>('canvas');
  const { scrollerRef, canvasRef, ...viewport } = useCanvasViewport(editor.currentPage ?? null);
  const hasSelection = editor.selectedIds.size > 0;

  const handleSelect = (id: string | null, additive: boolean) => {
    editor.select(id, additive);
    if (id !== null) setTab('properties');
  };
  const handleInsert = (insert: ElementInsert) => {
    editor.insert(insert);
    setTab('canvas');
  };

  return (
    <div className="flex h-full w-full flex-col">
      <header className="shrink-0 space-y-2 border-b bg-background px-2 py-2">
        <div className="flex items-center gap-1">
          <BackButton to={header.backTo} />
          <div className="min-w-0 flex-1">
            <LayoutNameInput {...header} />
          </div>
          {header.canEdit ? <SaveButton {...header} /> : null}
        </div>
        <div className="flex items-center gap-2">
          <SampleSelect {...header} className="min-w-0 flex-1" />
          <PreviewButton {...header} />
          <ExportButton {...header} />
        </div>
      </header>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList className="h-9 w-full shrink-0 rounded-none border-b">
          <TabsTrigger value="canvas" className="text-xs">書式</TabsTrigger>
          <TabsTrigger value="parts" className="text-xs">ページと要素</TabsTrigger>
          <TabsTrigger value="properties" className="text-xs">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="canvas" className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-1 border-b bg-background/95 px-2 py-1">
            <IconButton label="元に戻す" disabled={!editor.canUndo} onClick={editor.undo}><Undo2 className="size-4" /></IconButton>
            <IconButton label="やり直す" disabled={!editor.canRedo} onClick={editor.redo}><Redo2 className="size-4" /></IconButton>
            <div className="mx-1 h-5 w-px bg-border" />
            <IconButton label="複製" disabled={!hasSelection} onClick={editor.duplicateSelected}><Copy className="size-4" /></IconButton>
            <IconButton label="削除" disabled={!hasSelection} onClick={editor.removeSelected}><Trash2 className="size-4" /></IconButton>
            <div className="mx-1 h-5 w-px bg-border" />
            <IconButton label="縮小" onClick={viewport.zoomOut}><Minus className="size-4" /></IconButton>
            <IconButton label="拡大" onClick={viewport.zoomIn}><Plus className="size-4" /></IconButton>
            {hasSelection ? <span className="ml-auto text-[11px] text-muted-foreground">{editor.selectedIds.size}件選択中</span> : null}
          </div>
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto bg-muted/20 p-6" {...viewport.scrollerProps}>
            {editor.currentPage ? (
              <div className="flex w-max min-w-full justify-center">
                <VenueCanvas
                  canvasRef={canvasRef}
                  liveId={liveId}
                  page={editor.currentPage}
                  elements={editor.pageElements}
                  catalog={catalog}
                  pxPerMm={viewport.pxPerMm}
                  selectedIds={editor.selectedIds}
                  onSelect={handleSelect}
                  onSelectMany={editor.selectMany}
                  onUpdate={editor.updateElement}
                  onMoveSelection={editor.moveSelected}
                />
              </div>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">ページがありません</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="parts" className="m-0 min-h-0 flex-1 space-y-6 overflow-y-auto p-3 pb-16">
          <VenuePagesPanel liveId={liveId} editor={editor} assets={assets} onAssetUploaded={onAssetUploaded} />
          {header.canEdit ? <FormTemplateFill liveId={liveId} editor={editor} onFilled={() => setTab('canvas')} /> : null}
          <VenuePalette catalog={catalog} disabled={!editor.currentPage} onInsert={handleInsert} />
        </TabsContent>

        <TabsContent value="properties" className="m-0 min-h-0 flex-1 overflow-hidden">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon" className="size-8" disabled={disabled} onClick={onClick} aria-label={label} title={label}>
      {children}
    </Button>
  );
}
