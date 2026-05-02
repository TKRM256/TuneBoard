/** Full-page PDF preview with sidebar controls and live iframe preview. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  type LiveResponse,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import { downloadBlob, fetchSubmissionPdf, fetchSubmissionsZip } from './pdf-api';
import { PdfControlPanel } from './PdfControlPanel';
import { DEFAULT_PDF_OPTIONS, type PdfLayoutOptions } from './pdf-options';

const DEBOUNCE_MS = 600;
const STORAGE_KEY = 'tuneboard:pdf-options';

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
  const [options, setOptions] = useState<PdfLayoutOptions>(() => loadStoredOptions());
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewUrlRef = useRef<string>('');

  // Persist options across navigations.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      // ignore quota / privacy errors
    }
  }, [options]);

  // Initial load: live + config + (first submission for preview header validation)
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
  }, [liveId]);

  // Optional: preload first submission to confirm it exists (also serves as preview source).
  const previewSubmissionId = submissionIds[0];

  // Debounced preview fetch
  useEffect(() => {
    if (!liveId || !previewSubmissionId) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsPreviewing(true);
      try {
        const { blob } = await fetchSubmissionPdf(liveId, previewSubmissionId, options, {
          signal: controller.signal,
        });
        const url = URL.createObjectURL(blob);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('preview fetch failed', error);
      } finally {
        setIsPreviewing(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [liveId, previewSubmissionId, options]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!liveId || submissionIds.length === 0) return;
    setIsDownloading(true);
    const toastId = toast.loading('PDFを生成中...', { position: 'top-center' });
    try {
      if (submissionIds.length === 1) {
        const { blob, filename } = await fetchSubmissionPdf(liveId, submissionIds[0], options);
        downloadBlob(blob, filename);
      } else {
        const { blob, filename } = await fetchSubmissionsZip(liveId, submissionIds, options);
        downloadBlob(blob, filename);
      }
      toast.success('ダウンロードしました', { id: toastId, position: 'top-center' });
    } catch (error) {
      console.error('download failed', error);
      toast.error('ダウンロードに失敗しました', { id: toastId, position: 'top-center' });
    } finally {
      setIsDownloading(false);
    }
  }, [liveId, submissionIds, options]);

  const handleReset = useCallback(() => {
    setOptions(structuredClone(DEFAULT_PDF_OPTIONS));
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
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/tenants/${tenantId}/lives/${liveId}/submissions`}>
              <ChevronLeft className="size-4" />
              戻る
            </Link>
          </Button>
          <div>
            <h1 className="text-base font-semibold sm:text-lg">PDFプレビュー</h1>
            <p className="text-xs text-muted-foreground">{live.name} / {headerSubtitle}</p>
          </div>
        </div>
        <Button onClick={handleDownload} disabled={isDownloading}>
          {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {isBulk ? `${submissionIds.length}件をZipでダウンロード` : 'PDFをダウンロード'}
        </Button>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
        <PdfControlPanel
          config={config}
          options={options}
          onChange={setOptions}
          onReset={handleReset}
        />
        <PreviewFrame previewUrl={previewUrl} isPreviewing={isPreviewing} hasSource={Boolean(previewSubmissionId)} />
      </div>
    </div>
  );
};

interface PreviewFrameProps {
  previewUrl: string;
  isPreviewing: boolean;
  hasSource: boolean;
}

function PreviewFrame({ previewUrl, isPreviewing, hasSource }: PreviewFrameProps) {
  return (
    <div className="relative flex h-full flex-col bg-muted/30">
      <div className="flex items-center justify-between border-b bg-background/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur">
        <span>プレビュー</span>
        {isPreviewing ? (
          <span className="flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />
            更新中...
          </span>
        ) : null}
      </div>
      <div className="relative flex-1 overflow-hidden">
        {!hasSource ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            対象の提出が選択されていません。
          </div>
        ) : !previewUrl ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            プレビューを生成しています...
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

type StoredOptions = {
  [K in keyof PdfLayoutOptions]?: K extends 'header'
    ? Partial<PdfLayoutOptions['header']>
    : PdfLayoutOptions[K];
};

function loadStoredOptions(): PdfLayoutOptions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_PDF_OPTIONS);
    const parsed = JSON.parse(raw) as StoredOptions;
    return {
      ...DEFAULT_PDF_OPTIONS,
      ...parsed,
      header: { ...DEFAULT_PDF_OPTIONS.header, ...(parsed.header ?? {}) },
      hiddenBlockIds: Array.isArray(parsed.hiddenBlockIds) ? parsed.hiddenBlockIds : [],
      blockLabelOverrides: parsed.blockLabelOverrides ?? {},
    };
  } catch {
    return structuredClone(DEFAULT_PDF_OPTIONS);
  }
}
