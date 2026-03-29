/** フォーム値とAPI送信ペイロード間のシリアライズ・逆シリアライズ */
import {
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetOptionSource,
} from '@/features/lives/types/live-types';

import {
  createSettingSheetFieldValue,
  normalizeValuesForBlocks,
  type SettingSheetFieldValue,
  type SettingSheetFormValues,
} from './form-state';

interface SettingSheetSubmissionAnswer {
  fieldId: string;
  values: string[];
  items: Array<{ answers: SettingSheetSubmissionAnswer[] }>;
}

export function toSettingSheetSubmissionPayload(values: SettingSheetFormValues, config: SettingSheetConfigResponse) {
  return { answers: serializeScopeBlocks(config.blocks, values.answers) };
}

export function normalizeValuesForConfig(values: SettingSheetFormValues, config: SettingSheetConfigResponse): SettingSheetFormValues {
  return { answers: normalizeValuesForBlocks(config.blocks, values.answers as Record<string, unknown>) };
}

export function resolveOptionSourceValues(
  blocks: SettingSheetBlock[],
  answers: Record<string, SettingSheetFieldValue>,
  source: SettingSheetOptionSource,
) {
  const resolved = new Set<string>();

  const visit = (currentBlocks: SettingSheetBlock[], currentAnswers: Record<string, SettingSheetFieldValue>) => {
    for (const block of currentBlocks) {
      if (block.hidden) {
        continue;
      }
      if (isSectionBlock(block.type)) {
        visit(block.fields, currentAnswers);
        continue;
      }

      const fieldValue = currentAnswers[block.id] ?? createSettingSheetFieldValue(block);
      if (!isRepeatableGroupBlock(block.type)) {
        continue;
      }
      if (block.id === source.blockId) {
        for (const item of fieldValue.items) {
          const target = item.answers[source.fieldId];
          if (!target) {
            continue;
          }
          for (const value of target.values) {
            if (value.trim()) {
              resolved.add(value.trim());
            }
          }
        }
      }
      for (const item of fieldValue.items) {
        visit(block.fields, item.answers);
      }
    }
  };

  visit(blocks, answers);
  return Array.from(resolved);
}

export function moveArrayItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [target] = next.splice(from, 1);
  next.splice(to, 0, target);
  return next;
}

function serializeScopeBlocks(blocks: SettingSheetBlock[], answers: Record<string, SettingSheetFieldValue>): SettingSheetSubmissionAnswer[] {
  const serialized: SettingSheetSubmissionAnswer[] = [];
  for (const block of blocks) {
    if (block.hidden) {
      continue;
    }
    if (isSectionBlock(block.type)) {
      serialized.push(...serializeScopeBlocks(block.fields, answers));
      continue;
    }
    serialized.push(serializeFieldValue(block, answers[block.id] ?? createSettingSheetFieldValue(block)));
  }
  return serialized;
}

function serializeFieldValue(block: SettingSheetBlock, value: SettingSheetFieldValue): SettingSheetSubmissionAnswer {
  if (isRepeatableGroupBlock(block.type)) {
    return {
      fieldId: block.id,
      values: [],
      items: value.items.map((item) => ({ answers: serializeScopeBlocks(block.fields, item.answers) })),
    };
  }
  return { fieldId: block.id, values: value.values, items: [] };
}
