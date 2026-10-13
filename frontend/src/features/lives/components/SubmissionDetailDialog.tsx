/** 提出確認の一覧の上に、1 件の提出内容を開く。絞り込んだ一覧の並びどおりに前後の提出へ送れる。 */
import { ChevronLeft, ChevronRight, Copy, FileDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import type { PublicSettingSheetSubmissionDetailResponse } from '../types/live-types';
import { formatSubmittedAt } from '../helpers/submission-detail-helpers';
import { SubmissionDetailView } from './SubmissionDetailView';

type ViewProps = Omit<Parameters<typeof SubmissionDetailView>[0], 'detail'>;

interface Props extends ViewProps {
  detail: PublicSettingSheetSubmissionDetailResponse | null;
  /** 絞り込んだ一覧の中で何件目か（0 始まり）と、その件数 */
  index: number;
  total: number;
  onMove: (offset: number) => void;
  onClose: () => void;
  onCopyEditLink: (submissionId: string) => void;
  onExport: (submissionId: string) => void;
}

export function SubmissionDetailDialog({ detail, index, total, onMove, onClose, onCopyEditLink, onExport, ...view }: Props) {
  return (
    <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      {/* DialogContent の既定に sm:max-w-lg があるため、sm: 付きでも打ち消さないと広がらない */}
      <DialogContent className="flex max-h-[92dvh] w-[96vw] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        {detail ? (
          <>
            <DialogHeader className="flex-row flex-wrap items-center gap-x-4 gap-y-2 space-y-0 border-b py-3 pr-14 pl-4 text-left sm:pl-6">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-lg">{detail.recordLabel}</DialogTitle>
                <DialogDescription className="text-xs">{formatSubmittedAt(detail.submittedAt)} 提出</DialogDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="size-8" onClick={() => onMove(-1)} disabled={index <= 0} aria-label="前の提出">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-14 text-center text-sm tabular-nums text-muted-foreground">{index + 1} / {total}</span>
                <Button variant="outline" size="icon" className="size-8" onClick={() => onMove(1)} disabled={index >= total - 1} aria-label="次の提出">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6">
              <SubmissionDetailView detail={detail} {...view} />
            </div>
            <DialogFooter className="flex-row flex-wrap justify-between gap-2 border-t px-4 py-3 sm:justify-between sm:px-6">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => onCopyEditLink(detail.id)}>
                  <Copy className="size-4" />編集リンクをコピー
                </Button>
                <Button variant="outline" size="sm" onClick={() => onExport(detail.id)}>
                  <FileDown className="size-4" />PDF出力
                </Button>
              </div>
              {/* スマホは右上の × で閉じ、下の帯を 1 行に収める */}
              <Button variant="outline" size="sm" onClick={onClose} className="hidden sm:inline-flex">閉じる</Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
