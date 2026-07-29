/** 下書きを破棄して最新の内容に戻す前に、上書きされる項目を確認させるダイアログ。 */
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { formatValues } from '../merge/merge-format';
import type { MergeRow } from '../merge/merge-types';

interface DraftResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: MergeRow[];
  onConfirm: () => void;
}

export const DraftResetDialog = ({ open, onOpenChange, rows, onConfirm }: DraftResetDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>最新の内容に戻す</DialogTitle>
        <DialogDescription>
          {rows.length > 0
            ? 'このブラウザに残っている下書きを破棄し、送信済みの最新の内容を読み直します。次の項目が上書きされます。'
            : 'このブラウザに残っている下書きを破棄し、送信済みの最新の内容を読み直します。'}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            下書きと最新の内容に違いはありません。
          </p>
        ) : (
          <div className="rounded-md border">
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.key} className="space-y-1 p-3">
                  <p className="text-sm font-medium wrap-break-word">{row.label}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground line-clamp-2 wrap-break-word">{formatValues(row.mine)}</span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                    <span className="font-medium line-clamp-2 wrap-break-word">{formatValues(row.theirs)}</span>
                  </p>
                  {row.kind !== 'value' ? (
                    <p className="text-xs text-muted-foreground">{describeItemChange(row)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          キャンセル
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>
          下書きを破棄して戻す
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

function describeItemChange(row: MergeRow) {
  if (row.kind === 'item-added') {
    return row.mine ? 'この項目は下書きだけにあります。戻すと無くなります。' : 'この項目が最新の内容から追加されます。';
  }
  return row.mine ? 'この項目が最新の内容に合わせて戻ります。' : 'この項目は下書きで削除されています。戻すと復活します。';
}
