/** Smartphone-friendly PDF designer page. Uses tab-based navigation
 *  (キャンバス / 部品 / プロパティ / プレビュー) instead of the multi-pane PC
 *  layout. Reuses the same useCanvasEditor / pdf-api / canvas-storage so the
 *  generated PDF and persisted state are identical to the desktop page. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Copy,
  Download,
  Loader2,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  Redo2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiClientError } from '@/lib/api/type';
import { apiClient } from '@/lib/api/client';
import {
  type LiveResponse,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import { buildDefaultCanvas } from './default-canvas';
import { buildFieldCatalog } from './field-catalog';
import { downloadBlob, fetchSubmissionPdf, fetchSubmissionsZip } from './pdf-api';
import { persistCanvas } from './canvas-storage';
import { useLiveCanvasSync } from './useLiveCanvasSync';
import { CanvasFrame } from './canvas/CanvasFrame';
import { ElementPalette } from './canvas/ElementPalette';
import { PropertyPanel } from './canvas/PropertyPanel';
import { ExpressionPreviewProvider } from './canvas/ExpressionPreviewContext';
import { PageSettings } from './canvas/PageSettings';
import { PreviewPane } from './canvas/PreviewPane';
import { useCanvasEditor } from './canvas/useCanvasEditor';

type MobileTab = 'canvas' | 'palette' | 'properties' | 'preview';

/** Smaller default zoom on mobile so a full A4 page fits within the viewport. */
const MOBILE_PX_PER_MM = 1.4;

export const PdfPreviewPageMobile = () => {
  const { tenantId, liveId, submissionId } = useParams<{
    tenantId: string;
    liveId: string;
    submissionId?: string;
  }>();
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
  const [hasCompiledOnce, setHasCompiledOnce] = useState(false);
  const [tab, setTab] = useState<MobileTab>('canvas');
  const previewUrlsRef = useRef<string[]>([]);

  const editor = useCanvasEditor(buildDefaultCanvas(null));
  const catalog = useMemo(() => buildFieldCatalog(config), [config]);
  const canvasSync = useLiveCanvasSync(liveId);

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
        const initialCanvas = await canvasSync.resolveInitialCanvas(configRes);
        if (cancelled) return;
        editor.setDoc(initialCanvas);
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

  useEffect(() => persistCanvas(liveId, editor.doc), [liveId, editor.doc]);

  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const previewUrl = previewUrls[previewIndex] ?? '';

  const compile = useCallback(async () => {
    if (!liveId || submissionIds.length === 0) return;
    setIsCompiling(true);
    try {
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
      setTab('preview');
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

  const handleSwitchToDesktop = useCallback(() => {
    if (!tenantId || !liveId) return;
    if (submissionIds.length === 1) {
      navigate(`/tenants/${tenantId}/lives/${liveId}/submissions/${submissionIds[0]}/pdf-preview`);
    } else {
      navigate(`/tenants/${tenantId}/lives/${liveId}/submissions/pdf-preview?ids=${submissionIds.join(',')}`);
    }
  }, [tenantId, liveId, submissionIds, navigate]);

  /** Switch to the properties tab when an element is tapped in the canvas. */
  const handleSelect = useCallback(
    (id: string | null, additive: boolean) => {
      editor.select(id, additive);
      if (id !== null) setTab('properties');
    },
    [editor],
  );

  /** Insert from palette and immediately jump back to canvas to position. */
  const handleInsert = useCallback<Parameters<typeof ElementPalette>[0]['onInsert']>(
    (ins) => {
      editor.insert(ins);
      setTab('canvas');
    },
    [editor],
  );

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
    <ExpressionPreviewProvider
      liveId={liveId}
      submissionId={submissionIds[previewIndex] ?? submissionIds[0]}
      submissionLabel={isBulk ? `${previewIndex + 1}件目の提出` : 'この提出'}
    >
      <div className="flex h-full w-full flex-col">
        {/* Compact header */}
        <header className="flex items-center justify-between gap-2 border-b bg-background px-2 py-1.5">
          <Button asChild variant="ghost" size="sm" className="px-2">
            <Link to={`/tenants/${tenantId}/lives/${liveId}/submissions`} aria-label="戻る">
              <ChevronLeft className="size-4" />
              戻る
            </Link>
          </Button>
          <div className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground">
            {live.name} / {headerSubtitle}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwitchToDesktop}
            className="px-2"
            title="PC版を開く"
          >
            <Monitor className="size-4" />
          </Button>
        </header>

        {/* Action bar (compile + download + reset + paper) */}
        <div className="flex flex-wrap items-center gap-1 border-b bg-background/95 px-2 py-1.5">
          <PageSettings
            size={editor.doc.page.size}
            orientation={editor.doc.page.orientation}
            onChange={(patch) => editor.setPage(patch)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetLayout}
            className="gap-1 px-2"
            title="初期化"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            variant={canvasSync.isDirty(editor.doc) ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => void canvasSync.save(editor.doc)}
            disabled={canvasSync.isSaving}
            className="gap-1 px-2"
            title="レイアウトを保存"
          >
            {canvasSync.isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="default"
              size="sm"
              onClick={compile}
              disabled={isCompiling}
              className="gap-1"
            >
              {isCompiling ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              ｺﾝﾊﾟｲﾙ
            </Button>
            <Button onClick={handleDownload} disabled={isDownloading} size="sm" className="gap-1">
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              保存
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as MobileTab)}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <TabsList className="h-9 w-full justify-stretch rounded-none border-b">
            <TabsTrigger value="canvas" className="text-xs">
              キャンバス
            </TabsTrigger>
            <TabsTrigger value="palette" className="text-xs">
              部品
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-xs">
              プロパティ
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              プレビュー
            </TabsTrigger>
          </TabsList>

          <TabsContent value="canvas" className="m-0 flex min-h-0 flex-1 flex-col">
            <CanvasMiniToolbar editor={editor} />
            <div className="flex-1 overflow-auto bg-muted/20 p-2">
              <div className="flex justify-center">
                <CanvasFrame
                  doc={editor.doc}
                  catalog={catalog}
                  pxPerMm={MOBILE_PX_PER_MM}
                  selectedIds={editor.selectedIds}
                  onSelect={handleSelect}
                  onUpdate={editor.updateElement}
                  onMoveSelection={editor.moveSelection}
                  snapMm={1}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="palette" className="m-0 min-h-0 flex-1 overflow-hidden">
            <ElementPalette catalog={catalog} onInsert={handleInsert} />
          </TabsContent>

          <TabsContent value="properties" className="m-0 min-h-0 flex-1 overflow-hidden">
            <PropertyPanel
              element={editor.selectedElement}
              catalog={catalog}
              onUpdate={(patch) =>
                editor.selectedElement && editor.updateElement(editor.selectedElement.id, patch)
              }
              onUpdateColumn={(columnId, patch) =>
                editor.selectedElement &&
                editor.updateColumn(editor.selectedElement.id, columnId, patch)
              }
              onAddColumn={() =>
                editor.selectedElement && editor.addColumn(editor.selectedElement.id)
              }
              onRemoveColumn={(columnId) =>
                editor.selectedElement && editor.removeColumn(editor.selectedElement.id, columnId)
              }
              onMoveColumn={(columnId, direction) =>
                editor.selectedElement && editor.moveColumn(editor.selectedElement.id, columnId, direction)
              }
            />
          </TabsContent>

          <TabsContent value="preview" className="m-0 min-h-0 flex-1 overflow-hidden">
            <PreviewPane
              previewUrl={previewUrl}
              isCompiling={isCompiling}
              hasCompiledOnce={hasCompiledOnce}
              totalCount={previewUrls.length}
              currentIndex={previewIndex}
              onChangeIndex={setPreviewIndex}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ExpressionPreviewProvider>
  );
};

/** Compact selection-action bar shown above the canvas on mobile.
 *  Provides undo/redo, duplicate, and delete for the current selection. */
function CanvasMiniToolbar({ editor }: { editor: ReturnType<typeof useCanvasEditor> }) {
  const hasSelection = editor.selectedIds.size > 0;
  return (
    <div className="flex items-center gap-1 border-b bg-background/95 px-2 py-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={!editor.canUndo}
        onClick={editor.undo}
        title="元に戻す"
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={!editor.canRedo}
        onClick={editor.redo}
        title="やり直し"
      >
        <Redo2 className="size-4" />
      </Button>
      <div className="mx-1 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={!hasSelection}
        onClick={() => editor.duplicate()}
        title="複製"
      >
        <Copy className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        disabled={!hasSelection}
        onClick={() => editor.remove()}
        title="削除"
      >
        <Trash2 className="size-4" />
      </Button>
      <span className="ml-auto text-[10px] text-muted-foreground">
        {hasSelection ? `${editor.selectedIds.size}件選択中` : '選択なし'}
      </span>
    </div>
  );
}
