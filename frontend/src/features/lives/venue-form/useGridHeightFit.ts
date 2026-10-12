/** 罫線つきの表の高さを、見本の提出の行が全部入る高さに合わせる。
 *  エディタは提出の中身で行を組まないので、PDF と同じ文字幅で測れるバックエンドに測ってもらう。 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { measureGrids } from './venue-form-api';
import type { VenueElement, VenueFormDocument } from './venue-form-schema';

interface Options {
  liveId: string;
  submissionId: string | null;
  doc: VenueFormDocument;
  onUpdateElement: (id: string, patch: Partial<VenueElement>) => void;
}

export function useGridHeightFit({ liveId, submissionId, doc, onUpdateElement }: Options) {
  const [isFitting, setIsFitting] = useState(false);

  const fitHeight = useCallback(async (elementId: string) => {
    if (!submissionId) return;
    setIsFitting(true);
    try {
      const measured = (await measureGrids(liveId, submissionId, doc)).find((table) => table.elementId === elementId);
      if (!measured) {
        toast.error('この表の高さは測れませんでした', { position: 'top-center' });
        return;
      }
      // 0.1mm 単位で切り上げ、丸めで最後の行が切れないようにする
      const hMm = Math.max(1, Math.ceil(measured.requiredHeightMm * 10) / 10);
      onUpdateElement(elementId, { hMm });
      toast.success(`高さを ${hMm}mm に合わせました`, { position: 'top-center' });
    } catch {
      toast.error('高さを測れませんでした', { position: 'top-center' });
    } finally {
      setIsFitting(false);
    }
  }, [liveId, submissionId, doc, onUpdateElement]);

  return {
    onFitHeight: (elementId: string) => void fitHeight(elementId),
    isFittingHeight: isFitting,
    fitDisabledReason: submissionId ? undefined : '見本にする提出がありません',
  };
}
