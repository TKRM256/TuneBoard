/** 会場書式エディタ（PC 用）。左にページと要素、中央に書式、右に設定を並べる。 */
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { UnsavedChangesDialog } from '@/components/original/UnsavedChangesDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { ApiClientError } from '@/lib/api/type';

import { AlignmentToolbar } from '../canvas-shared/AlignmentToolbar';
import { ExpressionPreviewProvider } from '../canvas-shared/expression/ExpressionPreviewContext';
import { buildFieldCatalog } from '../canvas-shared/field-catalog';
import { LiveCopyFromDialog } from '../copy/LiveCopyFromDialog';
import { downloadBlob } from '../pdf/pdf-api';
import type { SettingSheetBlock } from '../types/live-types';
import { AssistCanvasLayer, AssistDialogs, AssistGuide } from './assist/AssistParts';
import { AssistToggles } from './assist/AssistToggles';
import { useVenueAssist } from './assist/useVenueAssist';
import { useCanvasViewport } from './useCanvasViewport';
import { useVenueFormEditor } from './useVenueFormEditor';
import { useVenueFormPageData } from './useVenueFormPageData';
import { useVenueKeyboardShortcuts } from './useVenueKeyboardShortcuts';
import { VenueCanvas } from './VenueCanvas';
import { VenueEditorHeader } from './VenueEditorHeader';
import { VenuePagesPanel } from './VenuePagesPanel';
import { VenuePalette } from './VenuePalette';
import { VenuePreviewDialog } from './VenuePreviewDialog';
import { VenuePropertyPanel } from './VenuePropertyPanel';
import { copyVenueFormFrom, fetchVenueFormPdf, fetchVenueFormZip, saveVenueForm } from './venue-form-api';
import { emptyVenueForm, type VenueAsset } from './venue-form-schema';
import { ZoomFitButtons } from './ZoomFitButtons';

export const VenueFormEditorPage = () => {
  const { tenantId, liveId } = useParams<{ tenantId: string; liveId: string }>();
  const [searchParams] = useSearchParams();
  const downloadIds = useMemo(() => (searchParams.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean), [searchParams]);
  const isMobile = useIsMobile();
  const editor = useVenueFormEditor();
  const [savedJson, setSavedJson] = useState(JSON.stringify(emptyVenueForm()));
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isCopyOpen, setIsCopyOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const save = useSingleFlight();
  const download = useSingleFlight();

  const { data, setData, isLoading } = useVenueFormPageData(tenantId, liveId, (loaded) => {
    const document = loaded.document ?? emptyVenueForm();
    editor.load(document);
    setSavedJson(JSON.stringify(document));
    setPreviewId(downloadIds[0] ?? loaded.submissions[0]?.id ?? null);
  });
  useVenueKeyboardShortcuts(editor);
  const { scrollerRef, canvasRef, ...viewport } = useCanvasViewport(editor.currentPage ?? null);
  const isDirty = JSON.stringify(editor.doc) !== savedJson;
  const leaveGuard = useUnsavedChangesWarning(isDirty);
  const catalog = useMemo(() => buildFieldCatalog(data?.config), [data?.config]);
  const blocksById = useMemo(() => indexBlocks(data?.config.blocks ?? []), [data?.config]);
  const assist = useVenueAssist(editor, { liveId: liveId ?? '', assets: data?.assets ?? NO_ASSETS, catalog, blocksById });

  if (!tenantId || !liveId) return <Navigate to="/tenants" replace />;
  const backTo = `/tenants/${tenantId}/lives/${liveId}${downloadIds.length > 0 ? '/submissions' : ''}`;
  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!data) return <Navigate to={`/tenants/${tenantId}/lives/${liveId}`} replace />;

  const handleSave = () => void save.run(async () => {
    try {
      const response = await saveVenueForm(liveId, editor.doc);
      setSavedJson(JSON.stringify(editor.doc));
      setData({ ...data, assets: response.assets });
      toast.success('会場書式を保存しました', { position: 'top-center' });
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : '保存に失敗しました', { position: 'top-center' });
    }
  });

  const handleCopy = async (sourceLiveId: string) => {
    try {
      const response = await copyVenueFormFrom(liveId, sourceLiveId);
      const document = response.document ?? emptyVenueForm();
      editor.load(document);
      setSavedJson(JSON.stringify(document));
      setData({ ...data, assets: response.assets, document });
      toast.success('会場書式を取り込みました', { position: 'top-center' });
      return true;
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : '取り込みに失敗しました', { position: 'top-center' });
      return false;
    }
  };

  const handleDownload = () => void download.run(async () => {
    try {
      const result = downloadIds.length === 1
        ? await fetchVenueFormPdf(liveId, downloadIds[0], editor.doc)
        : await fetchVenueFormZip(liveId, downloadIds, editor.doc);
      downloadBlob(result.blob, result.filename);
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : 'ダウンロードに失敗しました', { position: 'top-center' });
    }
  });

  if (isMobile) {
    return (
      <div className="space-y-3 p-6 text-sm">
        <p>PCで開いてください</p>
        <Button asChild variant="outline" size="sm"><Link to={backTo}>戻る</Link></Button>
      </div>
    );
  }

  const previewLabel = data.submissions.find((submission) => submission.id === previewId)?.recordLabel ?? '';

  return (
    <ExpressionPreviewProvider liveId={liveId} submissionId={previewId ?? undefined} submissionLabel={previewLabel}>
      <div className="flex h-full w-full flex-col">
        <VenueEditorHeader
          backTo={backTo}
          liveName={data.live.name}
          submissions={data.submissions}
          previewSubmissionId={previewId}
          onChangePreviewSubmission={setPreviewId}
          canEdit={data.isAdmin}
          isDirty={isDirty}
          isSaving={save.isRunning}
          onSave={handleSave}
          onOpenCopy={() => setIsCopyOpen(true)}
          onOpenPreview={() => setIsPreviewOpen(true)}
          downloadCount={downloadIds.length}
          isDownloading={download.isRunning}
          onDownload={handleDownload}
        />
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 space-y-6 overflow-y-auto border-r p-3">
            <VenuePagesPanel liveId={liveId} editor={editor} assets={data.assets} onAssetUploaded={(asset) => setData({ ...data, assets: [...data.assets, asset] })} />
            <VenuePalette catalog={catalog} disabled={!editor.currentPage} onInsert={editor.insert} />
          </aside>
          <main className="flex min-w-0 flex-1 flex-col">
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
                    snap={assist.snap}
                    onSnapChange={assist.setSnap}
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
              <div ref={scrollerRef} className="h-full overflow-auto bg-muted/20 p-6" {...viewport.scrollerProps}>
                {editor.currentPage ? (
                  <div className="flex w-max min-w-full justify-center">
                    <VenueCanvas
                      canvasRef={canvasRef}
                      backgroundIsPdf={isPdfBackground(data.assets, editor.currentPage.background?.assetId)}
                      ruledLines={assist.lines}
                      showRuledLines={assist.showLines || assist.tool !== 'none'}
                      snapLines={assist.snapLines}
                      onElementDoubleClick={assist.fitElementToCell}
                      overlay={<AssistCanvasLayer assist={assist} pxPerMm={viewport.pxPerMm} />}
                      liveId={liveId}
                      page={editor.currentPage}
                      elements={editor.pageElements}
                      catalog={catalog}
                      pxPerMm={viewport.pxPerMm}
                      selectedIds={editor.selectedIds}
                      onSelect={editor.select}
                      onUpdate={editor.updateElement}
                      onMoveSelection={editor.moveSelected}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </main>
          <aside className="w-80 shrink-0 border-l">
            <VenuePropertyPanel
              key={editor.selectedElement?.id ?? 'none'}
              element={editor.selectedElement}
              selectionCount={editor.selectedIds.size}
              catalog={catalog}
              blocksById={blocksById}
              onUpdate={editor.updateElement}
              onChangeColumns={editor.changeColumns}
            />
          </aside>
        </div>
      </div>
      <VenuePreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} liveId={liveId} submissionId={previewId} submissionLabel={previewLabel} document={editor.doc} />
      <LiveCopyFromDialog
        open={isCopyOpen}
        onOpenChange={setIsCopyOpen}
        currentLiveId={liveId}
        title="他のライブの会場書式を取り込む"
        description="背景の書式ごと複製して、今の会場書式を置き換えます。"
        isAvailable={(source) => source.hasVenueForm}
        unavailableLabel="会場書式なし"
        onConfirm={handleCopy}
      />
      <AssistDialogs assist={assist} catalog={catalog} />
      <UnsavedChangesDialog guard={leaveGuard} />
    </ExpressionPreviewProvider>
  );
};

const NO_ASSETS: VenueAsset[] = [];

function isPdfBackground(assets: VenueAsset[], assetId: string | undefined) {
  return Boolean(assetId && assets.find((asset) => asset.id === assetId)?.contentType === 'application/pdf');
}

function indexBlocks(blocks: SettingSheetBlock[], out = new Map<string, SettingSheetBlock>()) {
  for (const block of blocks) {
    out.set(block.id, block);
    indexBlocks(block.fields, out);
    for (const variant of block.variants ?? []) indexBlocks(variant.fields, out);
  }
  return out;
}
