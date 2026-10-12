/** ページの一覧と、背景（会場の書式）の取り込み。PDF は全ページ、画像は 1 枚 1 ページとして追加する。 */
import { useRef } from 'react';
import { ArrowDown, ArrowUp, FilePlus2, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';
import { cn } from '@/lib/utils';

import { getPaperDimensions, ORIENTATION_OPTIONS, PAPER_SIZE_OPTIONS, type Orientation, type PaperSize } from './paper';
import { createBlankPage, createPageFromAsset } from './venue-element-factory';
import { uploadVenueAsset } from './venue-form-api';
import type { VenueAsset, VenuePage } from './venue-form-schema';
import type { VenueFormEditor } from './useVenueFormEditor';

interface Props {
  liveId: string;
  editor: VenueFormEditor;
  assets: VenueAsset[];
  onAssetUploaded: (asset: VenueAsset) => void;
}

export function VenuePagesPanel({ liveId, editor, assets, onAssetUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { run, isRunning } = useSingleFlight();
  const page = editor.currentPage;
  const pageAsset = page?.background ? assets.find((asset) => asset.id === page.background?.assetId) : undefined;
  const isPdfBackground = pageAsset?.contentType === 'application/pdf';

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    void run(async () => {
      try {
        const asset = await uploadVenueAsset(liveId, file);
        onAssetUploaded(asset);
        asset.pages.forEach((_, index) => editor.addPage(createPageFromAsset(asset, index)));
        toast.success(`${asset.pages.length}ページを追加しました`, { position: 'top-center' });
      } catch (error) {
        const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
        toast.error(message ?? 'アップロードに失敗しました', { position: 'top-center' });
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ページ</h2>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="outline" className="gap-1" onClick={() => fileRef.current?.click()} disabled={isRunning} data-tour="venue-import">
          {isRunning ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          書式取込み
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => editor.addPage(createBlankPage())}>
          <FilePlus2 className="size-4" />
          白紙を追加
        </Button>
      </div>
      <ol className="space-y-1">
        {editor.doc.pages.map((p, index) => (
          <li key={p.id}>
            <div className={cn('flex items-center gap-1 rounded-md border px-2 py-1 text-xs', p.id === page?.id && 'border-primary bg-primary/5')}>
              <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => editor.showPage(p.id)}>
                {index + 1}ページ目{p.background ? '' : '（白紙）'}
              </button>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => editor.movePage(p.id, -1)} disabled={index === 0} aria-label="上へ">
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => editor.movePage(p.id, 1)} disabled={index === editor.doc.pages.length - 1} aria-label="下へ">
                <ArrowDown className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-6" onClick={() => editor.removePage(p.id)} aria-label="ページを消す">
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {page && !isPdfBackground ? <PaperSizeSelect page={page} onChange={(size) => editor.updatePage(page.id, size)} /> : null}
    </section>
  );
}

function PaperSizeSelect({ page, onChange }: { page: VenuePage; onChange: (size: { widthMm: number; heightMm: number }) => void }) {
  const orientation: Orientation = page.widthMm > page.heightMm ? 'LANDSCAPE' : 'PORTRAIT';
  const size = PAPER_SIZE_OPTIONS.find((option) => {
    const dims = getPaperDimensions(option.value, orientation);
    return Math.abs(dims.widthMm - page.widthMm) < 1 && Math.abs(dims.heightMm - page.heightMm) < 1;
  })?.value;
  const apply = (nextSize: PaperSize, nextOrientation: Orientation) => onChange(getPaperDimensions(nextSize, nextOrientation));

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select value={size ?? ''} onValueChange={(value) => apply(value as PaperSize, orientation)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="用紙" /></SelectTrigger>
        <SelectContent>
          {PAPER_SIZE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={orientation} onValueChange={(value) => apply(size ?? 'A4', value as Orientation)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ORIENTATION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
