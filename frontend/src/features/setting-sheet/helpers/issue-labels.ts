/** バリデーションエラーのキーから、ユーザーに見せる項目名を引く */
import type { SettingSheetBlock, SettingSheetConfigResponse } from '@/features/lives/types/live-types';

export function resolveIssueLabel(key: string, config: SettingSheetConfigResponse) {
  const fieldId = key.match(/answers\.(.+?)(?:\.items|$)/)?.[1];
  if (!fieldId) {
    return key;
  }

  return findBlockLabel(config.blocks, fieldId) ?? fieldId;
}

/** サーバーが指摘した項目に、開いているフォームに無いものがあるか（開いたあとにフォームが変わった）。 */
export function hasFieldMissingFromForm(keys: string[], config: SettingSheetConfigResponse) {
  return keys.some((key) => {
    const fieldId = key.match(/answers\.(.+?)(?:\.items|$)/)?.[1];
    return fieldId !== undefined && findBlockLabel(config.blocks, fieldId) === null;
  });
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
