/** PDF 書式のエディタ。PC は左にページと要素、中央に書式、右に設定を並べ、スマホはタブで切り替える。 */
import { useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { UnsavedChangesDialog } from '@/components/original/UnsavedChangesDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { ApiClientError } from '@/lib/api/type';

import { AlignmentToolbar } from '../canvas-shared/AlignmentToolbar';
import { ExpressionPreviewProvider } from '../canvas-shared/expression/ExpressionPreviewContext';
import { buildFieldCatalog } from '../canvas-shared/field-catalog';
import { downloadBlob } from './blob-download';
import { LayoutEditorMobile } from './LayoutEditorMobile';
import { useGridHeightFit } from './useGridHeightFit';
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
import { fetchLayoutPdf, fetchLayoutZip, saveLayout } from './venue-form-api';
import { emptyVenueForm, type VenueAsset } from './venue-form-schema';
import { ZoomFitButtons } from './ZoomFitButtons';

export const VenueFormEditorPage = () => {
  const { tenantId, liveId, layoutId } = useParams<{ tenantId: string; liveId: string; layoutId: string }>();
  const [searchParams] = useSearchParams();
  const downloadIds = useMemo(() => (searchParams.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean), [searchParams]);
  const isMobile = useIsMobile();
  const editor = useVenueFormEditor();
  const [savedJson, setSavedJson] = useState(JSON.stringify(emptyVenueForm()));
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const save = useSingleFlight();
  const download = useSingleFlight();

  const { data, setData, isLoading } = useVenueFormPageData(tenantId, liveId, layoutId, (loaded) => {
    editor.load(loaded.document);
    setSavedJson(JSON.stringify(loaded.document));
    setName(loaded.name);
    setSavedName(loaded.name);
    setPreviewId(downloadIds[0] ?? loaded.submissions[0]?.id ?? null);
  });
  const { scrollerRef, canvasRef, ...viewport } = useCanvasViewport(editor.currentPage ?? null);
  const isDirty = JSON.stringify(editor.doc) !== savedJson || name !== savedName;
  const leaveGuard = useUnsavedChangesWarning(isDirty);
  const catalog = useMemo(() => buildFieldCatalog(data?.config), [data?.config]);
  const blocksById = useMemo(() => indexBlocks(data?.config.blocks ?? []), [data?.config]);
  const assist = useVenueAssist(editor, { liveId: liveId ?? '', assets: data?.assets ?? NO_ASSETS, catalog, blocksById });
  useVenueKeyboardShortcuts(editor, assist.lines);
  const gridFit = useGridHeightFit({ liveId: liveId ?? '', submissionId: previewId, doc: editor.doc, onUpdateElement: editor.updateElement });

  if (!tenantId || !liveId || !layoutId) return <Navigate to="/tenants" replace />;
  const backTo = `/tenants/${tenantId}/lives/${liveId}/${downloadIds.length > 0 ? 'submissions' : 'pdf-layouts'}`;
  if (isLoading) return <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!data) return <Navigate to={`/tenants/${tenantId}/lives/${liveId}/pdf-layouts`} replace />;

  const handleSave = () => void save.run(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('書式の名前を入れてください', { position: 'top-center' });
      return;
    }
    try {
      const response = await saveLayout(liveId, layoutId, trimmed, editor.doc);
      setSavedJson(JSON.stringify(editor.doc));
      setName(trimmed);
      setSavedName(trimmed);
      setData({ ...data, assets: response.assets });
      toast.success('書式を保存しました', { position: 'top-center' });
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : '保存に失敗しました', { position: 'top-center' });
    }
  });

  const handleDownload = () => void download.run(async () => {
    try {
      const result = downloadIds.length === 1
        ? await fetchLayoutPdf(liveId, downloadIds[0], { document: editor.doc })
        : await fetchLayoutZip(liveId, downloadIds, { document: editor.doc });
      downloadBlob(result.blob, result.filename);
    } catch (error) {
      toast.error(error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : 'ダウンロードに失敗しました', { position: 'top-center' });
    }
  });

  const previewLabel = data.submissions.find((submission) => submission.id === previewId)?.recordLabel ?? '';
  const header = {
    backTo,
    liveName: data.live.name,
    name,
    onNameChange: setName,
    submissions: data.submissions,
    previewSubmissionId: previewId,
    onChangePreviewSubmission: setPreviewId,
    canEdit: data.isAdmin,
    isDirty,
    isSaving: save.isRunning,
    onSave: handleSave,
    onOpenPreview: () => setIsPreviewOpen(true),
    downloadCount: downloadIds.length,
    isDownloading: download.isRunning,
    onDownload: handleDownload,
  };
  const preview = (
    <VenuePreviewDialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} liveId={liveId} submissionId={previewId} submissionLabel={previewLabel} document={editor.doc} />
  );

  if (isMobile) {
    return (
      <ExpressionPreviewProvider liveId={liveId} submissionId={previewId ?? undefined} submissionLabel={previewLabel}>
        <LayoutEditorMobile
          header={header}
          liveId={liveId}
          editor={editor}
          catalog={catalog}
          blocksById={blocksById}
          assets={data.assets}
          onAssetUploaded={(asset) => setData({ ...data, assets: [...data.assets, asset] })}
          gridFit={gridFit}
        />
        {preview}
        <UnsavedChangesDialog guard={leaveGuard} />
      </ExpressionPreviewProvider>
    );
  }

  return (
    <ExpressionPreviewProvider liveId={liveId} submissionId={previewId ?? undefined} submissionLabel={previewLabel}>
      <div className="flex h-full w-full flex-col">
        <VenueEditorHeader {...header} />
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
                      backgroundIsPdf={isPdfBackground(data.assets, editor.currentPage.background?.assetId)}
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
                  <p className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    左の「書式取込み」か「白紙を追加」から始めます
                  </p>
                )}
              </div>
            </div>
          </main>
          <aside className="w-80 shrink-0 border-l" data-tour="venue-properties">
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
        </div>
      </div>
      {preview}
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
