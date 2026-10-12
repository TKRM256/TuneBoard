/** 書式を新しく作る。フォームの項目を並べたところから始めるか、白紙から始めるかを選ぶ。 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import { createLayout, type LayoutResponse, type LayoutSource } from './venue-form-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
  defaultName: string;
  onCreated: (layout: LayoutResponse) => void;
}

const SOURCES: Array<{ value: LayoutSource; title: string; detail: string }> = [
  { value: 'FORM', title: 'フォームの項目を並べる', detail: '項目と表を並べた白紙のページから始めます' },
  { value: 'BLANK', title: '何もないところから', detail: '会場の書式を取り込んで書き込むときはこちら' },
];

export function LayoutCreateDialog({ open, onOpenChange, liveId, defaultName, onCreated }: Props) {
  // 開くたびに作り直されるので（呼び出し側で key を変える）、初めの値は props から取る
  const [name, setName] = useState(defaultName);
  const [source, setSource] = useState<LayoutSource>('FORM');
  const { run, isRunning } = useSingleFlight();

  const handleCreate = () => void run(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('書式の名前を入れてください', { position: 'top-center' });
      return;
    }
    try {
      const created = await createLayout(liveId, trimmed, source);
      onOpenChange(false);
      onCreated(created);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? '書式を作れませんでした', { position: 'top-center' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>書式を作る</DialogTitle>
          <DialogDescription>作ったあとは、エディタで項目の位置や大きさを変えられます。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="layout-name">名前</Label>
            <Input id="layout-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
          </div>
          <RadioGroup value={source} onValueChange={(value) => setSource(value as LayoutSource)} className="gap-2">
            {SOURCES.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value={option.value} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.title}</span>
                  <span className="block text-xs text-muted-foreground">{option.detail}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleCreate} disabled={isRunning} className="gap-1">
            {isRunning ? <Loader2 className="size-4 animate-spin" /> : null}
            作る
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
