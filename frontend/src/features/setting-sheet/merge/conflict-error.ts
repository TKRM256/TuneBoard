/** 409 レスポンスから競合情報を取り出す */
import type {
  PublicSettingSheetSubmissionDetailResponse,
  SettingSheetSubmissionConflictBody,
} from '@/features/lives/types/live-types';
import { ApiClientError } from '@/lib/api/type';

/**
 * 提出済みシートの更新が競合した 409 かどうかを判定し、
 * マージに使える最新の提出内容を返す。それ以外のエラーなら null。
 */
export function parseSubmissionConflict(error: unknown): PublicSettingSheetSubmissionDetailResponse | null {
  if (!(error instanceof ApiClientError) || error.status !== 409) {
    return null;
  }

  const body = error.body as Partial<SettingSheetSubmissionConflictBody> | undefined;
  const latest = body?.latest;
  if (!latest || typeof latest !== 'object' || !Array.isArray(latest.answers)) {
    return null;
  }

  return latest;
}
