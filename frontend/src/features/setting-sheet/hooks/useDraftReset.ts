/** この端末の下書きを破棄し、サーバの最新の提出内容へ戻すためのフック。 */
import { useState } from 'react';
import { toast } from 'sonner';

import type {
  PublicSettingSheetSubmissionDetailResponse,
  SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';
import { apiClient } from '@/lib/api/client';

import { createSettingSheetValuesFromSubmissionAnswers, type SettingSheetFormValues } from '../types';
import { collectMergeRows } from '../merge/merge-diff';
import type { MergeRow } from '../merge/merge-types';

interface UseDraftResetParams {
  publicToken: string;
  /** 提出済みシートを開いているときだけ「最新に戻す」ことができる。 */
  submissionId: string | undefined;
  config: SettingSheetConfigResponse;
  formValues: SettingSheetFormValues;
  onApply: (values: SettingSheetFormValues, version: number | null) => void;
}

interface LatestSnapshot {
  values: SettingSheetFormValues;
  version: number | null;
}

export function useDraftReset({ publicToken, submissionId, config, formValues, onApply }: UseDraftResetParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [latest, setLatest] = useState<LatestSnapshot | null>(null);
  const [rows, setRows] = useState<MergeRow[]>([]);

  const open = async () => {
    if (!submissionId) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get<PublicSettingSheetSubmissionDetailResponse>(
        `/public/lives/${publicToken}/setting-sheet/submissions/${submissionId}`,
      );
      if (!response?.id) {
        throw new Error('submission not found');
      }

      const values = createSettingSheetValuesFromSubmissionAnswers(config.blocks, response.answers, response.itunesLinks);
      // base と相手側の両方を最新の内容にそろえると、いま画面にある下書きだけが差分として並ぶ。
      setRows(collectMergeRows(config, values, formValues, values));
      setLatest({ values, version: response.version ?? null });
      setIsOpen(true);
    } catch {
      toast.error('最新の内容を取得できませんでした', { position: 'top-center' });
    } finally {
      setIsLoading(false);
    }
  };

  const confirm = () => {
    if (!latest) {
      return;
    }
    onApply(latest.values, latest.version);
    setIsOpen(false);
    toast.success('下書きを破棄して最新の内容に戻しました。', { position: 'top-center' });
  };

  return {
    isAvailable: !!submissionId,
    isLoading,
    isOpen,
    rows,
    open,
    confirm,
    close: () => setIsOpen(false),
  };
}
