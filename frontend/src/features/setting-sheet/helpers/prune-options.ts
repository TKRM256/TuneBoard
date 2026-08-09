/** 設定変更などで選択肢から消えた回答値を取り除く */
import {
  getGroupItemFields,
  isOptionBlock,
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

import type { SettingSheetFieldValue, SettingSheetFormValues } from './form-state';
import { resolveOptionSourceValues } from './serialization';

/**
 * 現在の選択肢に存在しない回答値を落とした値を返す。
 * 管理者が選択肢を差し替えた後も、画面に表示されない旧値が残って
 * 「選択肢が不正です。」で更新できなくなるのを防ぐ。
 * 変更がなければ元のオブジェクトをそのまま返す。
 */
export function pruneUnknownOptionValues(
  values: SettingSheetFormValues,
  config: SettingSheetConfigResponse,
): SettingSheetFormValues {
  const answers = pruneScopedAnswers(config.blocks, values.answers, config.blocks, values.answers);
  return answers === values.answers ? values : { ...values, answers };
}

function pruneScopedAnswers(
  blocks: SettingSheetBlock[],
  answers: Record<string, SettingSheetFieldValue>,
  rootBlocks: SettingSheetBlock[],
  rootAnswers: Record<string, SettingSheetFieldValue>,
): Record<string, SettingSheetFieldValue> {
  const updates = new Map<string, SettingSheetFieldValue>();
  collectPrunedAnswers(blocks, answers, rootBlocks, rootAnswers, updates);
  return updates.size === 0 ? answers : { ...answers, ...Object.fromEntries(updates) };
}

function collectPrunedAnswers(
  blocks: SettingSheetBlock[],
  answers: Record<string, SettingSheetFieldValue>,
  rootBlocks: SettingSheetBlock[],
  rootAnswers: Record<string, SettingSheetFieldValue>,
  updates: Map<string, SettingSheetFieldValue>,
) {
  for (const block of blocks) {
    // 非表示ブロックは検証にも送信にも含まれないため触らない
    if (block.hidden) {
      continue;
    }
    // セクションの子は同じスコープに並ぶので、同じ answers を辿る
    if (isSectionBlock(block.type)) {
      collectPrunedAnswers(block.fields, answers, rootBlocks, rootAnswers, updates);
      continue;
    }

    const fieldValue = answers[block.id];
    if (!fieldValue) {
      continue;
    }

    if (isRepeatableGroupBlock(block.type)) {
      const items = fieldValue.items.map((item) => {
        const itemAnswers = pruneScopedAnswers(
          getGroupItemFields(block, item.variantId),
          item.answers,
          rootBlocks,
          rootAnswers,
        );
        return itemAnswers === item.answers ? item : { ...item, answers: itemAnswers };
      });
      if (items.some((item, index) => item !== fieldValue.items[index])) {
        updates.set(block.id, { ...fieldValue, items });
      }
      continue;
    }

    if (!isOptionBlock(block.type)) {
      continue;
    }

    // optionSource を使う動的な選択肢は、参照元の現在の回答から解決する
    const options = block.optionSource
      ? resolveOptionSourceValues(rootBlocks, rootAnswers, block.optionSource)
      : block.options;
    const kept = fieldValue.values.filter((value) => options.includes(value));
    if (kept.length !== fieldValue.values.length) {
      updates.set(block.id, { ...fieldValue, values: kept });
    }
  }
}
