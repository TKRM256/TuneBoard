/** Top-level page that hosts the PowerPoint-style canvas editor and a
 *  compile-on-demand PDF preview. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Download, Loader2, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ApiClientError } from '@/lib/api/type';
import { apiClient } from '@/lib/api/client';
import {
  type LiveResponse,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import {
  ORIENTATION_OPTIONS,
  PAPER_SIZE_OPTIONS,
  type CanvasDocument,
  type Orientation,
  type PaperSize,
} from './canvas-schema';
import { buildDefaultCanvas } from './default-canvas';
import { buildFieldCatalog } from './field-catalog';
import { downloadBlob, fetchSubmissionPdf, fetchSubmissionsZip } from './pdf-api';
import { CanvasFrame } from './canvas/CanvasFrame';
import { ElementPalette } from './canvas/ElementPalette';
import { PropertyPanel } from './canvas/PropertyPanel';
import { AlignmentToolbar } from './canvas/AlignmentToolbar';
import { useCanvasEditor } from './canvas/useCanvasEditor';

const STORAGE_KEY = 'tuneboard:pdf-canvas-v2';
const ZOOM_LEVELS = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0];

export const PdfPreviewPage = () => {
  const { tenantId, liveId, submissionId } = useParams<{ tenantId: string; liveId: string; submissionId?: string }>();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get('ids');

  const submissionIds = useMemo(() => {
    if (submissionId) return [submissionId];
    return (idsParam ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  }, [submissionId, idsParam]);

  const [live, setLive] = useState<LiveResponse | null>(null);
  const [config, setConfig] = useState<SettingSheetConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pxPerMm, setPxPerMm] = useState(2.5);
  const [hasCompiledOnce, setHasCompiledOnce] = useState(false);
  const previewUrlRef = useRef<string>('');

  const editor = useCanvasEditor(loadStoredCanvas() ?? buildDefaultCanvas(null));
  const catalog = useMemo(() => buildFieldCatalog(config), [config]);

  // Initial load
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
    // editor is stable enough; we only want to load once per liveId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  // Persist canvas
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(editor.doc));
    } catch {
      // ignore quota / privacy errors
    }
  }, [editor.doc]);

  // Cleanup blob URL
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (editor.selectedIds.size > 0) {
          e.preventDefault();
          editor.remove();
        }
      } else if (e.key === 'Escape') {
        editor.select(null, false);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        editor.duplicate();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        editor.selectAll();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        editor.nudge(0, e.shiftKey ? -5 : -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        editor.nudge(0, e.shiftKey ? 5 : 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        editor.nudge(e.shiftKey ? -5 : -1, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        editor.nudge(e.shiftKey ? 5 : 1, 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor]);

  const previewSubmissionId = submissionIds[0];

  const compile = useCallback(async () => {
    if (!liveId || !previewSubmissionId) return;
    setIsCompiling(true);
    try {
      const { blob } = await fetchSubmissionPdf(liveId, previewSubmissionId, editor.doc);
      const url = URL.createObjectURL(blob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setHasCompiledOnce(true);
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
  }, [liveId, previewSubmissionId, editor.doc]);

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
    setPxPerMm((prev) => {
      const next = ZOOM_LEVELS.find((z) => z > prev);
      return next ?? prev;
    });
  }, []);
  const handleZoomOut = useCallback(() => {
    setPxPerMm((prev) => {
      const reversed = [...ZOOM_LEVELS].reverse();
      const next = reversed.find((z) => z < prev);
      return next ?? prev;
    });
  }, []);

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
    ? `${submissionIds.length}件をまとめてZipダウンロード（プレビューは1件目）`
    : '1件をPDFダウンロード';

  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100dvh-64px)] flex-col sm:-mx-6">
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
          <PageSettings
            size={editor.doc.page.size}
            orientation={editor.doc.page.orientation}
            onChange={(patch) => editor.setPage(patch)}
          />
          <Button variant="ghost" size="sm" onClick={handleResetLayout} className="gap-1">
            <RotateCcw className="size-4" />
            初期化
          </Button>
          <Button variant="default" size="sm" onClick={compile} disabled={isCompiling} className="gap-1">
            {isCompiling ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            コンパイル & プレビュー
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading} size="sm" className="gap-1">
            {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {isBulk ? `${submissionIds.length}件をZipで保存` : 'PDFを保存'}
          </Button>
        </div>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={62} minSize={35}>
          <div className="flex h-full min-h-0 flex-col">
            <AlignmentToolbar
              selectionCount={editor.selectedIds.size}
              pxPerMm={pxPerMm}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onAlign={(mode) => editor.align(mode)}
              onDistribute={(axis) => editor.distribute(axis)}
              onLayer={(mode) => editor.layer(mode)}
              onDuplicate={() => editor.duplicate()}
              onDelete={() => editor.remove()}
            />
            <div className="flex flex-1 overflow-hidden">
              <div className="w-[220px] shrink-0">
                <ElementPalette catalog={catalog} onInsert={(ins) => editor.insert(ins)} />
              </div>
              <div className="flex-1 overflow-auto bg-muted/20 p-6">
                <div className="flex justify-center">
                  <CanvasFrame
                    doc={editor.doc}
                    catalog={catalog}
                    pxPerMm={pxPerMm}
                    selectedIds={editor.selectedIds}
                    onSelect={editor.select}
                    onUpdate={editor.updateElement}
                    snapMm={1}
                  />
                </div>
              </div>
              <div className="w-[280px] shrink-0">
                <PropertyPanel
                  element={editor.selectedElement}
                  catalog={catalog}
                  onUpdate={(patch) => editor.selectedElement && editor.updateElement(editor.selectedElement.id, patch)}
                  onUpdateColumn={(columnId, patch) => editor.selectedElement && editor.updateColumn(editor.selectedElement.id, columnId, patch)}
                  onAddColumn={() => editor.selectedElement && editor.addColumn(editor.selectedElement.id)}
                  onRemoveColumn={(columnId) => editor.selectedElement && editor.removeColumn(editor.selectedElement.id, columnId)}
                />
              </div>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={38} minSize={25}>
          <PreviewPane
            previewUrl={previewUrl}
            isCompiling={isCompiling}
            hasCompiledOnce={hasCompiledOnce}
            onCompile={compile}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

interface PreviewPaneProps {
  previewUrl: string;
  isCompiling: boolean;
  hasCompiledOnce: boolean;
  onCompile: () => void;
}

function PreviewPane({ previewUrl, isCompiling, hasCompiledOnce, onCompile }: PreviewPaneProps) {
  return (
    <div className="flex h-full flex-col bg-muted/30">
      <div className="flex items-center justify-between border-b bg-background/60 px-3 py-2 text-xs">
        <span className="font-medium">プレビュー</span>
        <Button variant="ghost" size="sm" onClick={onCompile} disabled={isCompiling} className="gap-1 text-xs">
          {isCompiling ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          再コンパイル
        </Button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {!hasCompiledOnce && !isCompiling ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground">
            <p>「コンパイル & プレビュー」ボタンを押すと PDF が生成されます。</p>
            <Button onClick={onCompile} size="sm" className="gap-1">
              <RefreshCw className="size-4" />
              いますぐコンパイル
            </Button>
          </div>
        ) : !previewUrl ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="PDFプレビュー"
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

function PageSettings({ size, orientation, onChange }: { size: PaperSize; orientation: Orientation; onChange: (patch: { size?: PaperSize; orientation?: Orientation }) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs text-muted-foreground">用紙</Label>
      <Select value={size} onValueChange={(v) => onChange({ size: v as PaperSize })}>
        <SelectTrigger className="h-8 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAPER_SIZE_OPTIONS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        value={orientation}
        onValueChange={(v) => v && onChange({ orientation: v as Orientation })}
      >
        {ORIENTATION_OPTIONS.map((o) => (
          <ToggleGroupItem key={o.value} value={o.value} className="text-xs">
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function loadStoredCanvas(): CanvasDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CanvasDocument;
    if (!parsed.page || !Array.isArray(parsed.elements)) return null;
    return parsed;
  } catch {
    return null;
  }
}
