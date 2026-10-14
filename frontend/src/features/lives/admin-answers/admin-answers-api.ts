/** 管理者入力の保存 API。送った項目だけが置き換わり、値が空の項目は消える。 */
import { apiClient } from '@/lib/api/client';

import type { SettingSheetSubmissionAnswerResponse } from '../types/live-types';

export interface AdminAnswerUpdate {
  fieldId: string;
  values: string[];
}

export async function saveAdminAnswers(
  liveId: string,
  submissionId: string,
  updates: AdminAnswerUpdate[],
): Promise<SettingSheetSubmissionAnswerResponse[]> {
  const response = await apiClient.post<{ answers: SettingSheetSubmissionAnswerResponse[] }>(
    `/lives/${liveId}/setting-sheet/submissions/${submissionId}/admin-answers`,
    { answers: updates.map((update) => ({ fieldId: update.fieldId, values: update.values, items: [] })) },
  );
  return response?.answers ?? [];
}
