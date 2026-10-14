/** 会場書式のページから、ステージ図の範囲をドラッグで囲んで下絵にする。 */
import { useRef, useState, type PointerEvent } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthedObjectUrl } from '@/hooks/use-authed-object-url';
import type { VenueAsset } from '@/features/lives/venue-form/venue-form-schema';
import { venuePagePreviewPath } from '@/features/lives/venue-form/venue-form-api';

import { clamp01 } from './stage-plot-types';
import type { StageBaseCrop } from './stage-plot-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
  assets: VenueAsset[];
  isSaving: boolean;
  onConfirm: (crop: StageBaseCrop) => void;
}

interface Rect { x: number; y: number; width: number; height: number }

export function VenueCropDialog({ open, onOpenChange, liveId, assets, isSaving, onConfirm }: Props) {
  const pages = assets.flatMap((asset) => asset.pages.map((_, pageIndex) => ({ key: `${asset.id}:${pageIndex}`, asset, pageIndex })));
  const [pageKey, setPageKey] = useState('');
  const selected = pages.find((page) => page.key === pageKey) ?? pages[0];
  const { url } = useAuthedObjectUrl(open && selected ? venuePagePreviewPath(liveId, selected.asset.id, selected.pageIndex) : null);
  const [rect, setRect] = useState<Rect | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const point = (event: PointerEvent) => {
    const bounds = boxRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return { x: clamp01((event.clientX - bounds.left) / bounds.width), y: clamp01((event.clientY - bounds.top) / bounds.height) };
  };

  const handleDown = (event: PointerEvent<HTMLDivElement>) => {
    const p = point(event);
    if (!p) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = p;
    setRect({ x: p.x, y: p.y, width: 0, height: 0 });
  };

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = startRef.current;
    const p = point(event);
    if (!start || !p) return;
    setRect({ x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.abs(p.x - start.x), height: Math.abs(p.y - start.y) });
  };

  const valid = rect !== null && rect.width > 0.02 && rect.height > 0.02;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] w-[95vw] max-w-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>会場の用紙から下絵を切り出す</DialogTitle>
          <DialogDescription className="sr-only">ステージ図の範囲を囲む</DialogDescription>
        </DialogHeader>
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">PDF書式に取り込んだ用紙がありません</p>
        ) : (
          <>
            <Select value={selected?.key ?? ''} onValueChange={(next) => { setPageKey(next); setRect(null); }}>
              <SelectTrigger className="h-8 w-64 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pages.map((page) => (
                  <SelectItem key={page.key} value={page.key}>{page.asset.fileName} — {page.pageIndex + 1}ページ目</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="max-h-[60dvh] overflow-auto rounded border bg-muted/30">
              {url ? (
                <div
                  ref={boxRef}
                  className="relative w-full cursor-crosshair touch-none select-none"
                  onPointerDown={handleDown}
                  onPointerMove={handleMove}
                  onPointerUp={() => { startRef.current = null; }}
                >
                  <img src={url} alt="会場の用紙のページ" className="pointer-events-none block w-full" draggable={false} />
                  {rect ? (
                    <div
                      className="pointer-events-none absolute border-2 border-primary bg-primary/10"
                      style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">読み込み中...</p>
              )}
            </div>
          </>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button
            disabled={!valid || !selected || isSaving}
            className="gap-1"
            onClick={() => rect && selected && onConfirm({ assetId: selected.asset.id, pageIndex: selected.pageIndex, ...rect })}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            この範囲を下絵にする
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
