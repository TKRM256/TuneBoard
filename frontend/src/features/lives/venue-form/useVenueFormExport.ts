/** 提出一覧から会場書式の PDF を出す。PC はエディタで確かめてから、スマホは保存済みの書式でそのままダウンロードする。 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useIsMobile } from '@/hooks/use-mobile';
import { useSingleFlight } from '@/hooks/use-single-flight';
import { ApiClientError } from '@/lib/api/type';

import { downloadBlob } from '../pdf/pdf-api';
import { fetchVenueFormPdf, fetchVenueFormZip } from './venue-form-api';

export function useVenueFormExport(tenantId: string | undefined, liveId: string | undefined) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { run, isRunning } = useSingleFlight();

  const exportVenueForm = useCallback((submissionIds: string[]) => {
    if (!tenantId || !liveId || submissionIds.length === 0) return;
    if (!isMobile) {
      navigate(`/tenants/${tenantId}/lives/${liveId}/venue-form?ids=${submissionIds.join(',')}`);
      return;
    }
    void run(async () => {
      const toastId = toast.loading('会場書式のPDFを作っています...', { position: 'top-center' });
      try {
        const result = submissionIds.length === 1
          ? await fetchVenueFormPdf(liveId, submissionIds[0])
          : await fetchVenueFormZip(liveId, submissionIds);
        downloadBlob(result.blob, result.filename);
        toast.success('ダウンロードしました', { id: toastId, position: 'top-center' });
      } catch (error) {
        const message = error instanceof ApiClientError ? error.apiError?.message : undefined;
        toast.error(message ?? 'ダウンロードに失敗しました', { id: toastId, position: 'top-center' });
      }
    });
  }, [tenantId, liveId, isMobile, navigate, run]);

  return { exportVenueForm, isExporting: isRunning };
}
