/** 提出を PDF にする。どの書式で出すかを選び、そのまま保存するか、PC なら書式を開いて確かめてから保存する。 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Loader2, PencilRuler } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import { downloadBlob } from './blob-download';
import { fetchLayoutPdf, fetchLayoutZip, fetchLayouts, type LayoutSummary } from './venue-form-api';

/** 書式を作っていなくても出せる、フォームの項目を並べただけの書式。 */
const FROM_FORM = '__form__';

interface Props {
  tenantId: string;
  liveId: string;
  /** 出力する提出。null なら閉じている */
  submissionIds: string[] | null;
  onClose: () => void;
}

export function PdfExportDialog({ tenantId, liveId, submissionIds, onClose }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [layouts, setLayouts] = useState<LayoutSummary[] | null>(null);
  const [choice, setChoice] = useState(FROM_FORM);
  const download = useSingleFlight();
  const open = submissionIds !== null;
  const count = submissionIds?.length ?? 0;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchLayouts(liveId)
      .then((loaded) => {
        if (cancelled) return;
        setLayouts(loaded);
        setChoice((current) => (loaded.some((layout) => layout.id === current) ? current : loaded[0]?.id ?? FROM_FORM));
      })
      .catch(() => {
        if (!cancelled) setLayouts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, liveId]);

  const layoutId = choice === FROM_FORM ? null : choice;

  const handleDownload = () => void download.run(async () => {
    if (!submissionIds || submissionIds.length === 0) return;
    const toastId = toast.loading('PDFを作っています...', { position: 'top-center' });
    try {
      const result = submissionIds.length === 1
        ? await fetchLayoutPdf(liveId, submissionIds[0], { layoutId })
        : await fetchLayoutZip(liveId, submissionIds, { layoutId });
      downloadBlob(result.blob, result.filename);
      toast.success('ダウンロードしました', { id: toastId, position: 'top-center' });
      onClose();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? 'ダウンロードに失敗しました', { id: toastId, position: 'top-center' });
    }
  });

  const handleOpenEditor = () => {
    if (!layoutId || !submissionIds) return;
    navigate(`/tenants/${tenantId}/lives/${liveId}/pdf-layouts/${layoutId}?ids=${submissionIds.join(',')}`);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-md overflow-y-auto sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>PDF出力</DialogTitle>
        </DialogHeader>
        <p className="text-sm font-medium">使う書式</p>
        {layouts === null ? (
          <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <RadioGroup value={choice} onValueChange={setChoice} className="gap-2">
            {layouts.map((layout) => (
              <ChoiceRow key={layout.id} value={layout.id} title={layout.name} detail={`${layout.pageCount}ページ`} />
            ))}
            <ChoiceRow value={FROM_FORM} title="テンプレート" />
          </RadioGroup>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          {!isMobile && layoutId ? (
            <Button variant="outline" onClick={handleOpenEditor} className="gap-1">
              <PencilRuler className="size-4" />書式を開いて確かめる
            </Button>
          ) : <span />}
          <Button onClick={handleDownload} disabled={download.isRunning || layouts === null || count === 0} className="gap-1">
            {download.isRunning ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {count > 1 ? `${count}件をZipで保存` : 'PDFを保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChoiceRow({ value, title, detail }: { value: string; title: string; detail?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <RadioGroupItem value={value} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        {detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}
      </span>
    </label>
  );
}
