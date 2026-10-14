/** 選んだ提出で書式を描いて確かめる。前後の提出へ送って、すべての提出を順に確かめられる。
 *  表のあふれや条件式の誤りは警告として並べる。 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiClientError } from '@/lib/api/type';

import { downloadBlob } from './blob-download';
import type { SettingSheetSubmissionResponse } from '../types/live-types';
import { checkLayout, fetchLayoutPdf } from './venue-form-api';
import type { VenueFormDocument } from './venue-form-schema';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
  submissions: SettingSheetSubmissionResponse[];
  submissionId: string | null;
  onChangeSubmission: (id: string) => void;
  document: VenueFormDocument;
}

export function VenuePreviewDialog({ open, onOpenChange, liveId, submissions, submissionId, onChangeSubmission, document }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !submissionId) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [pdf, found] = await Promise.all([
          fetchLayoutPdf(liveId, submissionId, { document }),
          checkLayout(liveId, submissionId, { document }),
        ]);
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = URL.createObjectURL(pdf.blob);
        setUrl(urlRef.current);
        setBlob(pdf);
        setWarnings(found);
      } catch (caught) {
        if (cancelled) return;
        setError(caught instanceof ApiClientError && caught.apiError?.message ? caught.apiError.message : 'プレビューを作れませんでした');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, liveId, submissionId, document]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const handleDownload = () => {
    if (!blob) return;
    downloadBlob(blob.blob, blob.filename);
    toast.success('ダウンロードしました', { position: 'top-center' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94dvh] w-[96vw] max-w-none flex-col gap-3 sm:w-[96vw] sm:max-w-none" aria-describedby={undefined}>
        <DialogHeader className="flex-row flex-wrap items-center gap-2 space-y-0 pr-8">
          <DialogTitle className="mr-2 text-base">プレビュー</DialogTitle>
          <SubmissionStepper submissions={submissions} submissionId={submissionId} onChange={onChangeSubmission} />
          <Button size="sm" variant="outline" className="ml-auto gap-1" onClick={handleDownload} disabled={!blob || isLoading}>
            <Download className="size-4" />このPDFを保存
          </Button>
        </DialogHeader>
        {warnings.length > 0 ? (
          <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            {warnings.map((warning) => (
              <p key={warning} className="flex gap-1"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{warning}</p>
            ))}
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1 rounded-md border bg-muted/30">
          {!submissionId ? (
            <p className="p-6 text-center text-sm text-muted-foreground">提出がありません</p>
          ) : error ? (
            <p className="p-6 text-center text-sm text-destructive">{error}</p>
          ) : url ? (
            <iframe title="書式のプレビュー" src={url} className="size-full rounded-md" />
          ) : null}
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 提出を選ぶ欄と、前後の提出へ送るボタン。 */
function SubmissionStepper({ submissions, submissionId, onChange }: { submissions: SettingSheetSubmissionResponse[]; submissionId: string | null; onChange: (id: string) => void }) {
  const index = submissions.findIndex((submission) => submission.id === submissionId);
  const go = (offset: number) => {
    const next = submissions[index + offset];
    if (next) onChange(next.id);
  };
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="size-8" onClick={() => go(-1)} disabled={index <= 0} aria-label="前の提出">
        <ChevronLeft className="size-4" />
      </Button>
      <Select value={submissionId ?? ''} onValueChange={onChange} disabled={submissions.length === 0}>
        <SelectTrigger className="h-8 w-48 text-xs" aria-label="プレビューする提出">
          <SelectValue placeholder="提出がありません" />
        </SelectTrigger>
        <SelectContent>
          {submissions.map((submission) => <SelectItem key={submission.id} value={submission.id}>{submission.recordLabel}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" size="icon" className="size-8" onClick={() => go(1)} disabled={index < 0 || index >= submissions.length - 1} aria-label="次の提出">
        <ChevronRight className="size-4" />
      </Button>
      <span className="w-14 text-xs tabular-nums text-muted-foreground">{index >= 0 ? `${index + 1} / ${submissions.length}` : ''}</span>
    </div>
  );
}
