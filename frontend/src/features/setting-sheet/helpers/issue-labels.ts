/** バリデーションエラーのキーから、ユーザーに見せる項目名を引く */
import type { SettingSheetBlock, SettingSheetConfigResponse } from '@/features/lives/types/live-types';

export function resolveIssueLabel(key: string, config: SettingSheetConfigResponse) {
  const fieldId = key.match(/answers\.(.+?)(?:\.items|$)/)?.[1];
  if (!fieldId) {
    return key;
  }

  return findBlockLabel(config.blocks, fieldId) ?? fieldId;
}

function findBlockLabel(blocks: SettingSheetBlock[], fieldId: string): string | null {
  for (const block of blocks) {
    if (block.id === fieldId) {
      return block.label;
    }

    if (block.fields.length > 0) {
      const nested = findBlockLabel(block.fields, fieldId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}
