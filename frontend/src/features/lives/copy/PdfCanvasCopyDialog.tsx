/** 他ライブの PDF レイアウトを確認しながら取り込むダイアログ。 */
import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import type { CanvasDocument } from '../pdf/canvas-schema';
import { buildFieldCatalog, type FieldCatalog } from '../pdf/field-catalog';

import type { LiveCopySourceResponse } from '../types/live-types';
import { CopyChecklist, type CopyChecklistItem } from './CopyChecklist';
import { CopySourcePicker } from './CopySourcePicker';
import { fetchLivePdfCanvas } from '../pdf/pdf-api';
import { fetchLiveSettingSheetConfig } from './copy-api';
import {
  applyPdfCanvasCopy,
  buildPdfCanvasCopyPlan,
  type PdfCanvasCopyMode,
  type PdfCanvasCopyPlan,
} from './pdf-canvas-copy';
import { useCopySources } from './useCopySources';

interface PdfCanvasCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLiveId: string;
  currentCanvas: CanvasDocument;
  currentCatalog: FieldCatalog;
  onApply: (canvas: CanvasDocument) => void;
}

export const PdfCanvasCopyDialog = ({
  open,
  onOpenChange,
  currentLiveId,
  currentCanvas,
  currentCatalog,
  onApply,
}: PdfCanvasCopyDialogProps) => {
  const { sources, isLoading } = useCopySources(open, currentLiveId);
  const [source, setSource] = useState<LiveCopySourceResponse | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<CanvasDocument | null>(null);
  const [plan, setPlan] = useState<PdfCanvasCopyPlan | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<PdfCanvasCopyMode>('replace');
  const [includePage, setIncludePage] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const reset = () => {
    setSource(null);
    setSourceCanvas(null);
    setPlan(null);
    setSelectedIds(new Set());
    setMode('replace');
    setIncludePage(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const handleSelectSource = (next: LiveCopySourceResponse) => {
    setIsFetching(true);
    Promise.all([fetchLivePdfCanvas(next.id), fetchLiveSettingSheetConfig(next.id)])
      .then(([canvas, config]) => {
        if (!canvas) {
          toast.error('このライブにはPDFレイアウトが保存されていません', { position: 'top-center' });
          return;
        }
        const nextPlan = buildPdfCanvasCopyPlan(currentCanvas, canvas, currentCatalog, buildFieldCatalog(config));
        setSource(next);
        setSourceCanvas(canvas);
        setPlan(nextPlan);
        setSelectedIds(new Set(nextPlan.elements.map((entry) => entry.id)));
      })
      .catch(() => {
        toast.error('取り込み元のPDFレイアウトを取得できませんでした', { position: 'top-center' });
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  const items = useMemo<CopyChecklistItem[]>(
    () =>
      (plan?.elements ?? []).map((entry) => ({
        key: entry.id,
        title: entry.summary,
        subtitle: entry.kindLabel,
        badge: entry.missingRefs.length > 0
          ? { label: '参照先なし', variant: 'destructive' as const }
          : undefined,
        detail: entry.missingRefs.length > 0
          ? `現在のフォームに無い項目: ${entry.missingRefs.join(' / ')}（空欄で出力されます）`
          : undefined,
        selectable: true,
      })),
    [plan],
  );

  const toggle = (key: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (!sourceCanvas) {
      return;
    }
    onApply(applyPdfCanvasCopy(currentCanvas, sourceCanvas, selectedIds, mode, includePage));
    toast.success('レイアウトを取り込みました。内容を確認して保存してください。', { position: 'top-center' });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>他のライブからPDFレイアウトを取り込む</DialogTitle>
          <DialogDescription>
            {plan
              ? `${source?.name} のレイアウトです。取り込む要素を選んでください。反映後はまだ保存されていません。`
              : '取り込み元のライブを選んでください。PDFレイアウトを保存したライブだけ選べます。'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto">
          {plan ? (
            <div className="space-y-4">
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as PdfCanvasCopyMode)} className="gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="replace" />
                現在のレイアウトを置き換える
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="append" />
                現在のレイアウトに追加する
              </label>
            </RadioGroup>

            <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={includePage}
                onCheckedChange={(checked) => setIncludePage(checked === true)}
              />
              <span className="min-w-0">
                用紙設定も取り込む
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {plan.pageSummary}
                  {plan.pageChanged ? '' : '（現在の設定と同じ）'}
                </span>
              </span>
            </label>

              <CopyChecklist
                items={items}
                selected={selectedIds}
                onToggle={toggle}
                emptyMessage="取り込める要素がありません。"
              />
            </div>
          ) : (
            <CopySourcePicker
              sources={sources}
              isLoading={isLoading || isFetching}
              selectedId={null}
              onSelect={handleSelectSource}
              isAvailable={(candidate) => candidate.hasPdfCanvas}
              unavailableLabel="PDFレイアウト未保存"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {plan ? (
            <Button type="button" variant="ghost" onClick={reset}>
              <ChevronLeft className="size-4" />
              ライブを選び直す
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              キャンセル
            </Button>
            {plan ? (
              <Button type="button" onClick={handleApply} disabled={selectedIds.size === 0 && !includePage}>
                {selectedIds.size}件を反映
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
