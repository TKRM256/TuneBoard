/**
 * PDFレイアウトのサーバ保存を扱う。
 * 読み込みはサーバ優先、無ければローカルキャッシュ、それも無ければ既定レイアウト。
 * ローカルキャッシュは未保存の作業を失わないための控えとして残す。
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type { SettingSheetConfigResponse } from '../types/live-types';
import type { CanvasDocument } from './canvas-schema';
import { loadStoredCanvas } from './canvas-storage';
import { buildDefaultCanvas } from './default-canvas';
import { fetchLivePdfCanvas, saveLivePdfCanvas } from './pdf-api';

export function useLiveCanvasSync(liveId: string | undefined) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  const markSaved = useCallback((doc: CanvasDocument | null) => {
    setSavedSignature(doc ? JSON.stringify(doc) : null);
  }, []);

  /** そのライブで最初に開くべきレイアウトを決める。 */
  const resolveInitialCanvas = useCallback(
    async (config: SettingSheetConfigResponse): Promise<CanvasDocument> => {
      if (!liveId) {
        return buildDefaultCanvas(config);
      }
      const stored = await fetchLivePdfCanvas(liveId);
      // 未保存でも「開いた時点からの変更」を検知できるよう、初期表示の内容を基準にする。
      const initial = stored ?? loadStoredCanvas(liveId) ?? buildDefaultCanvas(config);
      markSaved(initial);
      return initial;
    },
    [liveId, markSaved],
  );

  const save = useCallback(
    async (doc: CanvasDocument) => {
      if (!liveId) {
        return;
      }
      setIsSaving(true);
      try {
        await saveLivePdfCanvas(liveId, doc);
        markSaved(doc);
        toast.success('PDFレイアウトを保存しました', { position: 'top-center' });
      } catch {
        toast.error('PDFレイアウトの保存に失敗しました', { position: 'top-center' });
      } finally {
        setIsSaving(false);
      }
    },
    [liveId, markSaved],
  );

  const isDirty = useCallback(
    (doc: CanvasDocument) => savedSignature !== null && JSON.stringify(doc) !== savedSignature,
    [savedSignature],
  );

  return { isSaving, isDirty, resolveInitialCanvas, save };
}
