/** 他の人の編集と競合したときに、何を取り込むかを選ぶダイアログ */
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';

import { pruneToDiffs, type MergeNode } from '../merge-tree';
import { countUnresolved, type MergeChoice, type MergeRow, type MergeSelections } from '../merge-types';
import { MergeOutline } from './MergeOutline';

interface MergeConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: MergeNode[];
  rows: MergeRow[];
  selections: MergeSelections;
  onSelect: (key: string, choice: MergeChoice) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function MergeConflictDialog({
  open,
  onOpenChange,
  nodes,
  rows,
  selections,
  onSelect,
  onConfirm,
  isSubmitting,
}: MergeConflictDialogProps) {
  const [diffOnly, setDiffOnly] = useState(true);

  const visibleNodes = useMemo(() => (diffOnly ? pruneToDiffs(nodes) : nodes), [diffOnly, nodes]);
  const unresolved = countUnresolved(rows, selections);
  const theirChanges = rows.filter((row) => row.changedBy === 'theirs').length;
  const myChanges = rows.filter((row) => row.changedBy === 'mine').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[95vw] max-w-5xl overflow-hidden p-0 sm:w-full">
        <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            他の人がこのシートを更新しました
          </DialogTitle>
          <DialogDescription>
            自動では統合しません。フォームの並びのまま自分と相手の内容を並べています。
            食い違っている項目だけ、どちらを残すか選んでください。
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant={unresolved > 0 ? 'destructive' : 'secondary'}>要選択 {unresolved}件</Badge>
            <Badge variant="outline">相手の変更 {theirChanges}件</Badge>
            <Badge variant="outline">自分の変更 {myChanges}件</Badge>
            <div className="ml-auto flex items-center gap-2">
              <Switch id="merge-diff-only" checked={diffOnly} onCheckedChange={setDiffOnly} />
              <Label htmlFor="merge-diff-only" className="text-xs font-normal text-muted-foreground">
                差分のある項目だけ表示
              </Label>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60dvh] px-4 sm:px-6">
          <div className="pb-4">
            {rows.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                内容の差分はありませんでした。そのまま保存できます。
              </p>
            ) : (
              <MergeOutline nodes={visibleNodes} selections={selections} onSelect={onSelect} />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 border-t px-4 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            やめる
          </Button>
          <Button type="button" onClick={onConfirm} disabled={unresolved > 0 || isSubmitting}>
            {isSubmitting ? '保存中...' : 'この内容で保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
