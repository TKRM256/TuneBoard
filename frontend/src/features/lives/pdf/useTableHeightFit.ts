/** Resizes a table element to the height its rows actually need.
 *
 *  The editor never renders real submission data, so the height comes from the
 *  backend, which measures it with the same font metrics the PDF is drawn with. */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { CanvasDocument, CanvasElement } from './canvas-schema';
import { measurePdfCanvasTables } from './pdf-api';

interface Options {
  liveId?: string;
  /** 現在プレビュー中の提出。これが測定の対象になる。 */
  submissionId?: string;
  doc: CanvasDocument;
  onUpdateElement: (id: string, patch: Partial<CanvasElement>) => void;
}

export function useTableHeightFit({ liveId, submissionId, doc, onUpdateElement }: Options) {
  const [isFitting, setIsFitting] = useState(false);

  const fitHeight = useCallback(
    async (elementId: string) => {
      if (!liveId || !submissionId) return;
      setIsFitting(true);
      try {
        const tables = await measurePdfCanvasTables(liveId, doc, submissionId);
        const measured = tables.find((t) => t.elementId === elementId);
        if (!measured) {
          toast.error('この表の高さは測定できませんでした', { position: 'top-center' });
          return;
        }
        // Round up to 0.1mm so rounding never clips the last row.
        const hMm = Math.max(1, Math.ceil(measured.requiredHeightMm * 10) / 10);
        onUpdateElement(elementId, { hMm });
        toast.success(`高さを ${hMm}mm に合わせました`, { position: 'top-center' });
      } catch (error) {
        console.error('measure failed', error);
        toast.error('高さの測定に失敗しました', { position: 'top-center' });
      } finally {
        setIsFitting(false);
      }
    },
    [liveId, submissionId, doc, onUpdateElement],
  );

  return {
    fitHeight,
    isFitting,
    disabledReason: submissionId ? undefined : 'プレビュー対象の提出がありません',
  };
}
