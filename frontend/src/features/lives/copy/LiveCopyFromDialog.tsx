/** 他のライブを選んで、その設定を丸ごと取り込むダイアログ（会場書式・ステージ設定）。
 *  取り込みはサーバー側で行うので、ここでは取り込み元を選んで確定するだけ。 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSingleFlight } from '@/hooks/use-single-flight';

import type { LiveCopySourceResponse } from '../types/live-types';
import { CopySourcePicker } from './CopySourcePicker';
import { useCopySources } from './useCopySources';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLiveId: string;
  title: string;
  description: string;
  isAvailable: (source: LiveCopySourceResponse) => boolean;
  unavailableLabel: string;
  /** 成功したら true を返す（ダイアログを閉じる） */
  onConfirm: (sourceLiveId: string) => Promise<boolean>;
}

export function LiveCopyFromDialog({
  open,
  onOpenChange,
  currentLiveId,
  title,
  description,
  isAvailable,
  unavailableLabel,
  onConfirm,
}: Props) {
  const { sources, isLoading } = useCopySources(open, currentLiveId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { run, isRunning } = useSingleFlight();

  const handleOpenChange = (next: boolean) => {
    if (!next) setSelectedId(null);
    onOpenChange(next);
  };

  const handleConfirm = () => {
    if (!selectedId) return;
    void run(async () => {
      if (await onConfirm(selectedId)) handleOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-lg overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55dvh] px-4 sm:px-6">
          <CopySourcePicker
            sources={sources}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={(source) => setSelectedId(source.id)}
            isAvailable={isAvailable}
            unavailableLabel={unavailableLabel}
          />
        </ScrollArea>
        <DialogFooter className="border-t px-4 py-3 sm:px-6">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleConfirm} disabled={!selectedId || isRunning} className="gap-1">
            {isRunning ? <Loader2 className="size-4 animate-spin" /> : null}
            取り込む
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
