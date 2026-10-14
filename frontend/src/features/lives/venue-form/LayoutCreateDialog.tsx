/** 書式を新しく作る。テンプレート（フォームの項目を並べたもの）・会場の用紙・白紙から選ぶ。 */
import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import { createPageFromAsset } from './venue-element-factory';
import { createLayout, saveLayout, uploadVenueAsset, type LayoutResponse } from './venue-form-api';

type Start = 'FORM' | 'VENUE' | 'BLANK';

const STARTS: Array<{ value: Start; title: string }> = [
  { value: 'FORM', title: 'テンプレートから作成する' },
  { value: 'VENUE', title: '会場の用紙から作成する' },
  { value: 'BLANK', title: '白紙から作成する' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
  defaultName: string;
  onCreated: (layout: LayoutResponse) => void;
}

export function LayoutCreateDialog({ open, onOpenChange, liveId, defaultName, onCreated }: Props) {
  // 開くたびに作り直されるので（呼び出し側で key を変える）、初めの値は props から取る
  const [name, setName] = useState(defaultName);
  const [start, setStart] = useState<Start>('FORM');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { run, isRunning } = useSingleFlight();
  const needsFile = start === 'VENUE' && !file;

  const handleCreate = () => void run(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('書式の名前を入れてください', { position: 'top-center' });
      return;
    }
    try {
      onCreated(await create(liveId, trimmed, start, file));
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? '書式を作れませんでした', { position: 'top-center' });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>書式を作る</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="layout-name">名前</Label>
            <Input id="layout-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
          </div>
          <RadioGroup value={start} onValueChange={(value) => setStart(value as Start)} className="gap-2" aria-label="作り方">
            {STARTS.map((option) => (
              <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm font-medium has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value={option.value} />
                {option.title}
              </label>
            ))}
          </RadioGroup>
          {start === 'VENUE' ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="hidden"
                aria-label="会場の用紙"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => fileRef.current?.click()}>
                <FileUp className="size-4 shrink-0" />
                <span className="truncate">{file ? file.name : 'PDF・画像を選ぶ'}</span>
              </Button>
            </>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleCreate} disabled={isRunning || needsFile} className="gap-1">
            {isRunning ? <Loader2 className="size-4 animate-spin" /> : null}
            作る
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 会場の用紙は先に取り込み、そのページを並べた書式にする。取り込みに失敗したら書式は作らない。 */
async function create(liveId: string, name: string, start: Start, file: File | null): Promise<LayoutResponse> {
  if (start !== 'VENUE') return createLayout(liveId, name, start);
  if (!file) throw new Error('file is required');
  const asset = await uploadVenueAsset(liveId, file);
  const created = await createLayout(liveId, name, 'BLANK');
  const pages = asset.pages.map((_, index) => createPageFromAsset(asset, index));
  return saveLayout(liveId, created.id, name, { pages, elements: [] }, created.revision);
}
