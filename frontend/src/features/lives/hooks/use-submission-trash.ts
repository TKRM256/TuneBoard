/** 提出の削除・ゴミ箱・復元・完全削除。削除はすぐ一覧から外し、トーストから取り消せる。 */
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

import { useKeyedSingleFlight } from '@/hooks/use-single-flight';
import { apiClient } from '@/lib/api/client';

import type { PublicSettingSheetSubmissionDetailResponse } from '../types/live-types';

type Detail = PublicSettingSheetSubmissionDetailResponse;

export const getSubmissionActionKey = (id: string) => `submission:${id}`;

export function useSubmissionTrash(liveId: string | undefined, details: Detail[], setDetails: Dispatch<SetStateAction<Detail[]>>) {
  const [trashedDetails, setTrashedDetails] = useState<Detail[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashFetched, setTrashFetched] = useState(false);
  const { run: runSubmissionAction, isRunning: isSubmissionActionRunning } = useKeyedSingleFlight<string>();

  const restoreDeletedSubmission = useCallback((id: string, deleted: PublicSettingSheetSubmissionDetailResponse | undefined) => {
    return runSubmissionAction(getSubmissionActionKey(id), async () => {
      await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/restore`, {});
      setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
      if (deleted) {
        setDetails((prev) => [deleted, ...prev]);
      }
      toast.success('バンドを復元しました', { position: 'top-center' });
    });
  }, [liveId, runSubmissionAction, setDetails]);

  const fetchTrash = useCallback(() => {
    apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/trash`)
      .then((res) => {
        setTrashedDetails(res ?? []);
        setTrashFetched(true);
      });
  }, [liveId]);

  const handleOpenTrash = useCallback(() => {
    if (!trashFetched) fetchTrash();
    setTrashOpen(true);
  }, [trashFetched, fetchTrash]);

  const handleDeleteSubmission = useCallback((id: string) => {
    const deleted = details.find((d) => d.id === id);
    void runSubmissionAction(getSubmissionActionKey(id), async () => {
      try {
        await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/delete`, {});
        setDetails((prev) => prev.filter((d) => d.id !== id));
        if (deleted) setTrashedDetails((prev) => [deleted, ...prev]);
        toast.success('バンドを削除しました', {
          position: 'top-center',
          action: {
            label: '取り消す',
            onClick: () => {
              void restoreDeletedSubmission(id, deleted).catch(() => {
                toast.error('復元に失敗しました', { position: 'top-center' });
              });
            },
          },
        });
      } catch {
        toast.error('バンドの削除に失敗しました', { position: 'top-center' });
      }
    });
  }, [details, liveId, runSubmissionAction, restoreDeletedSubmission, setDetails]);

  const handleRestoreFromTrash = useCallback((id: string) => {
    void runSubmissionAction(getSubmissionActionKey(id), async () => {
      try {
        await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/restore`, {});
        setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
        const response = await apiClient.get<PublicSettingSheetSubmissionDetailResponse[]>(`/lives/${liveId}/setting-sheet/submissions/details`);
        setDetails(response ?? []);
        toast.success('バンドを復元しました', { position: 'top-center' });
      } catch {
        toast.error('復元に失敗しました', { position: 'top-center' });
      }
    });
  }, [liveId, runSubmissionAction, setDetails]);

  const handlePurgeSubmission = useCallback((id: string) => {
    void runSubmissionAction(getSubmissionActionKey(id), async () => {
      try {
        await apiClient.post<void>(`/lives/${liveId}/setting-sheet/submissions/${id}/purge`, {});
        setTrashedDetails((prev) => prev.filter((d) => d.id !== id));
        toast.success('バンドを完全に削除しました', { position: 'top-center' });
      } catch {
        toast.error('完全削除に失敗しました', { position: 'top-center' });
      }
    });
  }, [liveId, runSubmissionAction]);

  return {
    trashedDetails,
    trashOpen,
    setTrashOpen,
    handleOpenTrash,
    handleDeleteSubmission,
    handleRestoreFromTrash,
    handlePurgeSubmission,
    isSubmissionPending: (id: string) => isSubmissionActionRunning(getSubmissionActionKey(id)),
  };
}
