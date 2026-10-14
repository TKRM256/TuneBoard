/** 選んだ提出を、指定した書式で PDF（2 件以上なら Zip）にして保存する。 */
import { useState } from 'react';
import { toast } from 'sonner';

import { ApiClientError } from '@/lib/api/type';

import { downloadBlob } from './blob-download';
import { fetchLayoutPdf, fetchLayoutZip } from './venue-form-api';

/** layoutId が null ならテンプレート（フォームの項目を並べただけの書式）で出す。 */
export function useLayoutDownload(liveId: string, submissionIds: string[]) {
  const [pending, setPending] = useState<string | null | undefined>(undefined);

  const download = async (layoutId: string | null) => {
    if (pending !== undefined || submissionIds.length === 0) return;
    setPending(layoutId);
    const toastId = toast.loading('PDFを作っています...', { position: 'top-center' });
    try {
      const result = submissionIds.length === 1
        ? await fetchLayoutPdf(liveId, submissionIds[0], { layoutId })
        : await fetchLayoutZip(liveId, submissionIds, { layoutId });
      downloadBlob(result.blob, result.filename);
      toast.success('ダウンロードしました', { id: toastId, position: 'top-center' });
    } catch (error) {
      const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
      toast.error(message ?? 'ダウンロードに失敗しました', { id: toastId, position: 'top-center' });
    } finally {
      setPending(undefined);
    }
  };

  return {
    download,
    isBusy: pending !== undefined,
    isPending: (layoutId: string | null) => pending === layoutId,
  };
}
