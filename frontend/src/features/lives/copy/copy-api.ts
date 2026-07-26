/** 他ライブからフォーム設定 / PDFレイアウトを取り込むための API 呼び出し。 */
import { apiClient } from '@/lib/api/client';

import {
  normalizeSettingSheetConfig,
  type LiveCopySourceResponse,
  type SettingSheetConfigResponse,
} from '../types/live-types';

export async function fetchCopySources(): Promise<LiveCopySourceResponse[]> {
  const response = await apiClient.get<LiveCopySourceResponse[]>('/lives/copy-sources');
  return response ?? [];
}

export async function fetchLiveSettingSheetConfig(liveId: string): Promise<SettingSheetConfigResponse> {
  const response = await apiClient.get<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`);
  return normalizeSettingSheetConfig(response ?? null);
}
