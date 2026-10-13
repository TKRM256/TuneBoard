/** エディタで編集中の書式のまま、提出を PDF に出す。すべての提出・提出確認で選んだ提出・見本の提出から選ぶ。 */
import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import type { SettingSheetSubmissionResponse } from '../types/live-types';
import { downloadBlob } from './blob-download';
import { fetchLayoutPdf, fetchLayoutZip } from './venue-form-api';
import type { VenueFormDocument } from './venue-form-schema';

type Target = 'all' | 'picked' | 'sample';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
  document: VenueFormDocument;
  submissions: SettingSheetSubmissionResponse[];
  /** 提出確認で選んでから来たときの提出 */
  pickedIds: string[];
  sampleId: string | null;
}

export function EditorExportDialog({ open, onOpenChange, liveId, document, submissions, pickedIds, sampleId }: Props) {
  const [target, setTarget] = useState<Target>(pickedIds.length > 0 ? 'picked' : 'all');
  const download = useSingleFlight();
  const sample = submissions.find((submission) => submission.id === sampleId);
  const idsOf: Record<Target, string[]> = {
    all: submissions.map((submission) => submission.id),
    picked: pickedIds,
    sample: sample ? [sample.id] : [],
  };
  const ids = idsOf[target];

  const handleDownload = () => void download.run(async () => {
    if (ids.length === 0) return;
    const toastId = toast.loading('PDFを作っています...', { position: 'top-center' });
    try {
      const result = ids.length === 1
        ? await fetchLayoutPdf(liveId, ids[0], { document })
        : await fetchLayoutZip(liveId, ids, { document });
      downloadBlob(result.blob, result.filename);
      toast.success('ダウンロードしました', { id: toastId, position: 'top-center' });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? 'ダウンロードに失敗しました', { id: toastId, position: 'top-center' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>PDF出力</DialogTitle>
        </DialogHeader>
        <RadioGroup value={target} onValueChange={(value) => setTarget(value as Target)} className="gap-2" aria-label="出力する提出">
          <TargetRow value="all" title="すべての提出" detail={`${submissions.length}件`} />
          {pickedIds.length > 0 ? <TargetRow value="picked" title="提出確認で選んだ提出" detail={`${pickedIds.length}件`} /> : null}
          {sample ? <TargetRow value="sample" title="見本の提出" detail={sample.recordLabel} /> : null}
        </RadioGroup>
        <DialogFooter>
          <Button onClick={handleDownload} disabled={download.isRunning || ids.length === 0} className="gap-1">
            {download.isRunning ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {ids.length > 1 ? `${ids.length}件をZipで保存` : 'PDFを保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TargetRow({ value, title, detail }: { value: Target; title: string; detail: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <RadioGroupItem value={value} />
      <span className="min-w-0 flex-1 text-sm font-medium">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{detail}</span>
    </label>
  );
}
