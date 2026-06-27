/** Full-screen modal for editing expressions with a real-time preview pane.
 *  Opens from an expand button on ExpressionTextarea. */
import {  useState } from 'react';
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
import { ExpressionSnippetPicker } from './ExpressionSnippetPicker';

interface Props {
  catalog: FieldCatalog;
  value: string;
  onChange: (next: string) => void;
  title?: string;
}

export function ExpressionEditorModal({ catalog, value, onChange, title }: Props) {
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
      <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="text-sm">{title ?? '式を編集'}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Editor pane */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
            <div className="text-xs font-medium text-muted-foreground">式テンプレート</div>
            <ExpressionEditor
              catalog={catalog}
              value={draft}
              onChange={setDraft}
              multiline
              rows={10}
              className="flex-1 rounded-md border bg-background"
            />
            <div className="flex justify-end">
              <ExpressionSnippetPicker catalog={catalog} onInsert={(s) => setDraft((v) => v + s)} />
            </div>
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
