/** Submission detail dialog for the live submissions page. */
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Copy, FileDown, Music } from 'lucide-react';
import {
  type ItunesLinkSelection,
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
  onOpenPdfPreview?: (submissionId: string) => void;
}

export function SubmissionDetailDialog({
  open,
  onOpenChange,
  detail,
  config,
  recordLabel,
  onCopyEditLink,
  onOpenPdfPreview,
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
              {detail.itunesLinks.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">曲情報</p>
                    {detail.itunesLinks.map((link) => (
                      <ItunesLinkCard key={`${link.songTitle}-${link.songArtist}`} link={link} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="flex-row justify-between gap-2 border-t px-4 py-3 sm:justify-between sm:px-6">
          {detail ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onCopyEditLink(detail.id)}>
                <Copy className="size-4" />
                編集リンクをコピー
              </Button>
              {onOpenPdfPreview ? (
                <Button variant="outline" size="sm" onClick={() => onOpenPdfPreview(detail.id)}>
                  <FileDown className="size-4" />
                  PDF出力
                </Button>
              ) : null}
            </div>
          ) : <span />}
          <Button variant="outline" onClick={() => onOpenChange(false)}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItunesLinkCard({ link }: { link: ItunesLinkSelection }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      {link.itunesAlbumArtUrl ? (
        <img src={link.itunesAlbumArtUrl} alt="" className="size-12 shrink-0 rounded" />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
          <Music className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{link.songTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{link.songArtist}</p>
        {link.itunesTitle && link.itunesTitle !== link.songTitle && (
          <p className="truncate text-xs text-muted-foreground">iTunes: {link.itunesTitle} — {link.itunesArtist}</p>
        )}
      </div>
    </div>
  );
}
