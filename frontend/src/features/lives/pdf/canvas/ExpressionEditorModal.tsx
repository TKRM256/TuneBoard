/** Full-screen modal for editing expressions.
 *  左に変数・ヘルパーの一覧、中央にエディタ、右に実データでの評価結果を並べる。
 *  一覧はポップオーバーではなく直接埋め込む（Dialog のスクロールロックに
 *  阻まれてポータル先がスクロールできないため）。 */
import { useState } from 'react';
import { Maximize2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { FieldCatalog } from '../field-catalog';
import { ExpressionEditor } from './ExpressionEditor';
import type { ExpressionRowScope } from './ExpressionPreviewContext';
import { ExpressionResultPane } from './ExpressionResultPane';
import { ExpressionSnippetList } from './ExpressionSnippetList';

interface Props {
  catalog: FieldCatalog;
  value: string;
  onChange: (next: string) => void;
  title?: string;
  scope?: ExpressionRowScope;
}

export function ExpressionEditorModal({ catalog, value, onChange, title, scope }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value); // sync draft on open (event handler, not effect)
    setOpen(next);
  };

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6 shrink-0" title="拡大編集">
          <Maximize2 className="size-3.5" />
        </Button>
      </DialogTrigger>
      {/* DialogContent の既定に sm:max-w-lg があるため、sm: 付きでも打ち消さないと広がらない */}
      <DialogContent className="flex h-[94dvh] w-[98vw] max-w-none flex-col gap-0 p-0 sm:w-[98vw] sm:max-w-none">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm">{title ?? '式を編集'}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Snippet pane */}
          <div className="flex min-h-0 shrink-0 flex-col border-b lg:h-auto lg:w-80 lg:border-b-0 lg:border-r">
            <div className="px-3 pt-3 text-xs font-medium text-muted-foreground">式を挿入</div>
            <ExpressionSnippetList
              catalog={catalog}
              onInsert={(snippet) => setDraft((v) => v + snippet)}
              className="h-56 lg:h-auto lg:flex-1"
            />
          </div>

          {/* Editor pane */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
            <div className="text-xs font-medium text-muted-foreground">式テンプレート</div>
            <ExpressionEditor
              catalog={catalog}
              value={draft}
              onChange={setDraft}
              multiline
              fillHeight
              className="min-h-0 flex-1 overflow-hidden rounded-md border bg-background"
            />
          </div>

          {/* Preview pane */}
          <div className="flex min-h-64 flex-col gap-2 border-t bg-muted/20 p-4 lg:w-[34rem] lg:min-h-0 lg:border-l lg:border-t-0">
            <ExpressionResultPane draft={draft} scope={scope} />
          </div>
        </div>

        <DialogFooter className="border-t px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>キャンセル</Button>
          <Button size="sm" onClick={handleApply}>適用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
