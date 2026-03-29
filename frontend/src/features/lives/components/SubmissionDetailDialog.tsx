/** Submission detail dialog for the live submissions page. */
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Copy } from 'lucide-react';
import {
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import { formatSubmittedAt, renderSubmissionBlocks } from '../helpers/submission-detail-helpers';

function SummaryItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

interface SubmissionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: PublicSettingSheetSubmissionDetailResponse | null;
  config: SettingSheetConfigResponse | null;
  recordLabel: string;
  onCopyEditLink: (submissionId: string) => void;
}

export function SubmissionDetailDialog({
  open,
  onOpenChange,
  detail,
  config,
  recordLabel,
  onCopyEditLink,
}: SubmissionDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-3xl overflow-hidden p-0 sm:w-full">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>提出詳細</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70dvh] px-4 sm:px-6">
          {!detail ? (
            <p className="py-4 text-sm text-muted-foreground">提出を選択してください。</p>
          ) : (
            <div className="space-y-4 pb-4">
              <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-3 sm:p-4">
                <SummaryItem label={recordLabel} value={detail.recordLabel} />
                <SummaryItem label="状態" value={<Badge variant="secondary">{detail.submissionStatus}</Badge>} />
                <SummaryItem label="提出日時" value={formatSubmittedAt(detail.submittedAt)} />
              </div>
              <Separator />
              <div className="space-y-3">
                {config ? renderSubmissionBlocks(config.blocks, detail.answers, detail.id) : null}
              </div>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="flex-row justify-between gap-2 border-t px-4 py-3 sm:justify-between sm:px-6">
          {detail ? (
            <Button variant="outline" size="sm" onClick={() => onCopyEditLink(detail.id)}>
              <Copy className="size-4" />
              編集リンクをコピー
            </Button>
          ) : <span />}
          <Button variant="outline" onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
