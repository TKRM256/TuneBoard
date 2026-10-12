/** 他のライブの書式を選んで、このライブの新しい書式として取り込む。背景のファイルごと複製する。 */
import { useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import { CopySourcePicker } from '../copy/CopySourcePicker';
import { useCopySources } from '../copy/useCopySources';
import type { LiveCopySourceResponse } from '../types/live-types';
import { copyLayoutFrom, fetchLayouts, type LayoutResponse, type LayoutSummary } from './venue-form-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLiveId: string;
  onCopied: (layout: LayoutResponse) => void;
}

export function LayoutCopyDialog({ open, onOpenChange, currentLiveId, onCopied }: Props) {
  const { sources, isLoading } = useCopySources(open, currentLiveId);
  const [source, setSource] = useState<LiveCopySourceResponse | null>(null);
  const [layouts, setLayouts] = useState<LayoutSummary[] | null>(null);
  const [layoutId, setLayoutId] = useState('');
  const { run, isRunning } = useSingleFlight();

  const reset = () => {
    setSource(null);
    setLayouts(null);
    setLayoutId('');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSelectSource = (next: LiveCopySourceResponse) => {
    setSource(next);
    setLayouts(null);
    fetchLayouts(next.id)
      .then((loaded) => {
        setLayouts(loaded);
        setLayoutId(loaded[0]?.id ?? '');
      })
      .catch(() => {
        toast.error('書式の一覧を読み込めませんでした', { position: 'top-center' });
        reset();
      });
  };

  const handleConfirm = () => void run(async () => {
    if (!source || !layoutId) return;
    try {
      const copied = await copyLayoutFrom(currentLiveId, source.id, layoutId);
      toast.success('書式を取り込みました', { position: 'top-center' });
      handleOpenChange(false);
      onCopied(copied);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? '取り込みに失敗しました', { position: 'top-center' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-lg overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>他のライブから書式を取り込む</DialogTitle>
          <DialogDescription>{source ? `${source.name} の書式から選びます。` : '書式のあるライブを選びます。'}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55dvh] px-4 sm:px-6">
          {source ? (
            layouts === null ? (
              <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <RadioGroup value={layoutId} onValueChange={setLayoutId} className="gap-2 pb-2">
                {layouts.map((layout) => (
                  <label key={layout.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                    <RadioGroupItem value={layout.id} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{layout.name}</span>
                      <span className="block text-xs text-muted-foreground">{layout.pageCount}ページ</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )
          ) : (
            <CopySourcePicker
              sources={sources}
              isLoading={isLoading}
              selectedId={null}
              onSelect={handleSelectSource}
              isAvailable={(candidate) => candidate.pdfLayoutCount > 0}
              unavailableLabel="書式なし"
            />
          )}
        </ScrollArea>
        <DialogFooter className="gap-2 border-t px-4 py-3 sm:justify-between sm:px-6">
          {source ? (
            <Button variant="ghost" onClick={reset} className="gap-1"><ChevronLeft className="size-4" />ライブを選び直す</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>キャンセル</Button>
            <Button onClick={handleConfirm} disabled={!layoutId || isRunning} className="gap-1">
              {isRunning ? <Loader2 className="size-4 animate-spin" /> : null}
              取り込む
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
