/** フォームの設定の保存。読み込んだときの版の印を添え、他の人が先に保存していたら 409 で止まる。 */
import { apiClient } from '@/lib/api/client';
import { ApiClientError } from '@/lib/api/type';

import type { SettingSheetConfigResponse } from '../types/live-types';

export async function saveSettingSheetConfig(liveId: string, config: SettingSheetConfigResponse, baseRevision: string | undefined) {
  return apiClient.post<SettingSheetConfigResponse>(`/lives/${liveId}/setting-sheet/config`, { ...config, baseRevision });
}

/** サーバーが理由を返していればそれを、無ければ fallback を出す。 */
export function saveErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError && error.apiError?.message ? error.apiError.message : fallback;
}
