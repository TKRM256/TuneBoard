/** PDF designer page. Canvas area in the center with palette/properties as
 *  non-modal slide-in drawers (overlaying the canvas), and preview pinned to
 *  the right as the only resizable panel. Compile regenerates PDF on demand. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Download, Loader2, RefreshCw, RotateCcw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { ApiClientError } from '@/lib/api/type';
import { apiClient } from '@/lib/api/client';
import {
  type LiveResponse,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import { buildDefaultCanvas } from './default-canvas';
import { buildFieldCatalog } from './field-catalog';
import { downloadBlob, fetchSubmissionPdf, fetchSubmissionsZip } from './pdf-api';
import {
  loadPanelVisibility,
  loadStoredCanvas,
  persistCanvas,
  persistPanelVisibility,
} from './canvas-storage';
import { CanvasFrame } from './canvas/CanvasFrame';
import { ElementPalette } from './canvas/ElementPalette';
import { PropertyPanel } from './canvas/PropertyPanel';
import { AlignmentToolbar } from './canvas/AlignmentToolbar';
import { ExpressionPreviewProvider } from './canvas/ExpressionPreviewContext';
import { PageSettings } from './canvas/PageSettings';
import { PreviewPane } from './canvas/PreviewPane';
import { PanelVisibilityToggles, type PanelKey } from './canvas/PanelVisibilityToggles';
import { useCanvasEditor } from './canvas/useCanvasEditor';
import { useCanvasKeyboardShortcuts } from './canvas/useCanvasKeyboardShortcuts';

const ZOOM_LEVELS = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0];

const PREVIEW_DEFAULT_SIZE = 320;

export const PdfPreviewPage = () => {
  const { tenantId, liveId, submissionId } = useParams<{ tenantId: string; liveId: string; submissionId?: string }>();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids');
  const navigate = useNavigate();

  const submissionIds = useMemo(() => {
    if (submissionId) return [submissionId];
    return (idsParam ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }, [submissionId, idsParam]);

  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pxPerMm, setPxPerMm] = useState(2.5);
  const [hasCompiledOnce, setHasCompiledOnce] = useState(false);
  const [panelVisible, setPanelVisible] = useState<Record<PanelKey, boolean>>(() => loadPanelVisibility());
  const previewUrlsRef = useRef<string[]>([]);

  const editor = useCanvasEditor(loadStoredCanvas() ?? buildDefaultCanvas(null));
  const catalog = useMemo(() => buildFieldCatalog(config), [config]);
  useCanvasKeyboardShortcuts(editor);

  useEffect(() => {
    if (!liveId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [liveRes, configRes] = await Promise.all([
          apiClient.get<LiveResponse>(`/lives/${liveId}`),
          apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`),
        ]);
        if (cancelled) return;
        if (!liveRes || !configRes) throw new Error('missing');
        setLive(liveRes);
        setConfig(configRes);
        if (!loadStoredCanvas()) {
          editor.setDoc(buildDefaultCanvas(configRes));
        }
      } catch {
        if (!cancelled) toast.error('情報の取得に失敗しました', { position: 'top-center' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // editor is stable; load only depends on liveId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  useEffect(() => persistCanvas(editor.doc), [editor.doc]);
  useEffect(() => persistPanelVisibility(panelVisible), [panelVisible]);

  useEffect(() => () => {
    for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
  }, []);

  const previewUrl = previewUrls[previewIndex] ?? '';

  const compile = useCallback(async () => {
    if (!liveId || submissionIds.length === 0) return;
    setIsCompiling(true);
    try {
      // Compile all submissions sequentially to avoid overwhelming the server.
      const results: Awaited<ReturnType<typeof fetchSubmissionPdf>>[] = [];
      for (const id of submissionIds) {
        results.push(await fetchSubmissionPdf(liveId, id, editor.doc));
      }
      const newUrls = results.map((r) => URL.createObjectURL(r.blob));
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
      previewUrlsRef.current = newUrls;
      setPreviewUrls(newUrls);
      setPreviewIndex(0);
      setHasCompiledOnce(true);
      setPanelVisible((prev) => (prev.preview ? prev : { ...prev, preview: true }));
    } catch (error) {
      if (error instanceof ApiClientError && error.apiError) {
        toast.error(`コンパイルに失敗しました: ${error.apiError.message}`, { position: 'top-center' });
      } else {
        console.error('compile failed', error);
        toast.error('コンパイルに失敗しました', { position: 'top-center' });
      }
    } finally {
      setIsCompiling(false);
    }
  }, [liveId, submissionIds, editor.doc]);

  const handleDownload = useCallback(async () => {
    if (!liveId || submissionIds.length === 0) return;
    setIsDownloading(true);
    const toastId = toast.loading('PDFを生成中...', { position: 'top-center' });
    try {
      if (submissionIds.length === 1) {
        const { blob, filename } = await fetchSubmissionPdf(liveId, submissionIds[0], editor.doc);
        downloadBlob(blob, filename);
      } else {
        const { blob, filename } = await fetchSubmissionsZip(liveId, submissionIds, editor.doc);
        downloadBlob(blob, filename);
      }
      toast.success('ダウンロードしました', { id: toastId, position: 'top-center' });
    } catch (error) {
      console.error('download failed', error);
      toast.error('ダウンロードに失敗しました', { id: toastId, position: 'top-center' });
    } finally {
      setIsDownloading(false);
    }
  }, [liveId, submissionIds, editor.doc]);

  const handleResetLayout = useCallback(() => {
    if (!confirm('現在のレイアウトを破棄して、初期レイアウトを再生成しますか？')) return;
    editor.setDoc(buildDefaultCanvas(config));
    toast.success('レイアウトを初期化しました', { position: 'top-center' });
  }, [editor, config]);

  const handleZoomIn = useCallback(() => {
    setPxPerMm((prev) => ZOOM_LEVELS.find((z) => z > prev) ?? prev);
  }, []);
  const handleZoomOut = useCallback(() => {
    setPxPerMm((prev) => [...ZOOM_LEVELS].reverse().find((z) => z < prev) ?? prev);
  }, []);

  const togglePanel = useCallback((key: PanelKey) => {
    setPanelVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSwitchToMobile = useCallback(() => {
    if (!tenantId || !liveId) return;
    if (submissionIds.length === 1) {
      navigate(`/tenants/${tenantId}/lives/${liveId}/submissions/${submissionIds[0]}/pdf-preview-mobile`);
    } else {
      navigate(`/tenants/${tenantId}/lives/${liveId}/submissions/pdf-preview-mobile?ids=${submissionIds.join(',')}`);
    }
  }, [tenantId, liveId, submissionIds, navigate]);

  if (!tenantId || !liveId || submissionIds.length === 0) {
    return <Navigate to="/tenants" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    );
  }

  if (!live || !config) {
    return <Navigate to={`/tenants/${tenantId}/lives/${liveId}/submissions`} replace />;
  }

  const isBulk = submissionIds.length > 1;
  const headerSubtitle = isBulk
    ? `${submissionIds.length}件をZipダウンロード`
    : '1件をPDFダウンロード';

  return (
    <div className="flex w-full h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/tenants/${tenantId}/lives/${liveId}/submissions`}>
              <ChevronLeft className="size-4" />
              戻る
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold sm:text-lg">PDFデザイン</h1>
            <p className="text-xs text-muted-foreground">{live.name} / {headerSubtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PanelVisibilityToggles visible={panelVisible} onToggle={togglePanel} />
          <PageSettings
            size={editor.doc.page.size}
            orientation={editor.doc.page.orientation}
            onChange={(patch) => editor.setPage(patch)}
          />
          <Button variant="ghost" size="sm" onClick={handleResetLayout} className="gap-1">
            <RotateCcw className="size-4" />
            初期化
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwitchToMobile}
            className="gap-1"
            title="スマホ版を開く"
          >
            <Smartphone className="size-4" />
            スマホ版
          </Button>
          <Button variant="default" size="sm" onClick={compile} disabled={isCompiling} className="gap-1">
            {isCompiling ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            コンパイル
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading} size="sm" className="gap-1">
            {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {isBulk ? `${submissionIds.length}件をZipで保存` : 'PDFを保存'}
          </Button>
        </div>
      </header>

      <ExpressionPreviewProvider
        liveId={liveId}
        submissionId={submissionIds[previewIndex] ?? submissionIds[0]}
        submissionLabel={isBulk ? `${previewIndex + 1}件目の提出` : 'この提出'}
      >
      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel>
          <div className="flex h-full min-h-0 flex-col">
            <AlignmentToolbar
              selectionCount={editor.selectedIds.size}
              pxPerMm={pxPerMm}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              onUndo={editor.undo}
              onRedo={editor.redo}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onAlign={(mode) => editor.align(mode)}
              onDistribute={(axis) => editor.distribute(axis)}
              onLayer={(mode) => editor.layer(mode)}
              onDuplicate={() => editor.duplicate()}
              onDelete={() => editor.remove()}
            />
            <div className="relative flex-1 overflow-hidden">
              <div className="h-full overflow-auto bg-muted/20 p-6">
                <div className="flex justify-center">
                  <CanvasFrame
                    doc={editor.doc}
                    catalog={catalog}
                    pxPerMm={pxPerMm}
                    selectedIds={editor.selectedIds}
                    onSelect={editor.select}
                    onUpdate={editor.updateElement}
                    onMoveSelection={editor.moveSelection}
                    snapMm={1}
                  />
                </div>
              </div>
              <SideDrawer side="left" open={panelVisible.palette}>
                <ElementPalette catalog={catalog} onInsert={(ins) => editor.insert(ins)} />
              </SideDrawer>
              <SideDrawer side="right" open={panelVisible.properties}>
                <PropertyPanel
                  element={editor.selectedElement}
                  catalog={catalog}
                  onUpdate={(patch) => editor.selectedElement && editor.updateElement(editor.selectedElement.id, patch)}
                  onUpdateColumn={(columnId, patch) => editor.selectedElement && editor.updateColumn(editor.selectedElement.id, columnId, patch)}
                  onAddColumn={() => editor.selectedElement && editor.addColumn(editor.selectedElement.id)}
                  onRemoveColumn={(columnId) => editor.selectedElement && editor.removeColumn(editor.selectedElement.id, columnId)}
                  onMoveColumn={(columnId, direction) => editor.selectedElement && editor.moveColumn(editor.selectedElement.id, columnId, direction)}
                />
              </SideDrawer>
            </div>
          </div>
        </ResizablePanel>
        {panelVisible.preview && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={PREVIEW_DEFAULT_SIZE}>
              <PreviewPane
                previewUrl={previewUrl}
                isCompiling={isCompiling}
                hasCompiledOnce={hasCompiledOnce}
                totalCount={previewUrls.length}
                currentIndex={previewIndex}
                onChangeIndex={setPreviewIndex}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      </ExpressionPreviewProvider>
    </div>
  );
};

/** Non-modal slide-in drawer that overlays the canvas. Lets the user keep
 *  editing on the canvas behind it (unlike shadcn Sheet which is modal). */
function SideDrawer({
  side,
  open,
  children,
}: {
  side: 'left' | 'right';
  open: boolean;
  children: React.ReactNode;
}) {
  const widthClass = side === 'left' ? 'w-72' : 'w-80';
  const borderClass = side === 'left' ? 'border-r left-0' : 'border-l right-0';
  const hiddenTransform = side === 'left' ? '-translate-x-full' : 'translate-x-full';
  return (
    <aside
      aria-hidden={!open}
      className={cn(
        'absolute inset-y-0 z-20 flex flex-col bg-background shadow-xl transition-transform duration-200 ease-out',
        widthClass,
        borderClass,
        open ? 'translate-x-0' : hiddenTransform,
        !open && 'pointer-events-none',
      )}
    >
      {children}
    </aside>
  );
}
