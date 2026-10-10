/** セッティングシートのバリデーション (必須チェック・エラーIssue生成) */
import {
  getGroupItemFields,
  isOptionBlock,
  isRepeatableGroupBlock,
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';
import { createSettingSheetFieldValue, type SettingSheetFieldValue, type SettingSheetFormValues } from './form-state';
import { resolveOptionSourceValues } from './serialization';

export interface SettingSheetIssue {
  key: string;
  label: string;
  message: string;
}

export function fieldIdFromKey(key: string) {
  return key.replace(/\[/g, '-').replace(/\]\./g, '-').replace(/\]/g, '').replace(/\./g, '-');
}

export function validateSettingSheetForm(values: SettingSheetFormValues, config: SettingSheetConfigResponse): SettingSheetIssue[] {
  const issues: SettingSheetIssue[] = [];

  const validateBlocks = (blocks: SettingSheetBlock[], answers: Record<string, SettingSheetFieldValue>, pathPrefix: string) => {
    for (const block of blocks) {
      if (block.hidden) {
        continue;
      }

      const fieldValue = answers[block.id] ?? createSettingSheetFieldValue(block);
      const key = `${pathPrefix}${block.id}`;

      if (isSectionBlock(block.type)) {
        validateBlocks(block.fields, answers, pathPrefix);
        continue;
      }
      if (isRepeatableGroupBlock(block.type)) {
        const minimum = Math.max(block.required ? 1 : 0, block.minItems);
        if ((block.required || block.minItems > 0) && fieldValue.items.length < minimum) {
          issues.push({ key: `${key}.items`, label: block.label, message: `少なくとも${minimum}件入力してください。` });
        }
        fieldValue.items.forEach((item, index) => {
          const itemFields = getGroupItemFields(block, item.variantId);
          validateBlocks(itemFields, item.answers, `${key}.items[${index}].answers.`);
        });
        continue;
      }

      const answerValues = fieldValue.values;
      if (block.required && answerValues.length === 0) {
        issues.push({ key, label: block.label, message: '必須項目です。' });
        continue;
      }
      const maxLength = resolveTextMaxLength(block);
      if (maxLength !== null && answerValues.some((value) => value.trim().length > maxLength)) {
        issues.push({ key, label: block.label, message: `${maxLength}文字以内で入力してください。` });
        continue;
      }
      if (['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_SELECT', 'BOOLEAN'].includes(block.type) && answerValues.length > 1) {
        issues.push({ key, label: block.label, message: '回答は1つだけにしてください。' });
        continue;
      }
      if (block.type === 'BOOLEAN' && answerValues.some((value) => !['true', 'false'].includes(value))) {
        issues.push({ key, label: block.label, message: '真偽値の形式が不正です。' });
        continue;
      }

      const options = resolveBlockOptions(config.blocks, values.answers, block);
      if (isOptionBlock(block.type) && answerValues.some((value) => !options.includes(value))) {
        issues.push({ key, label: block.label, message: '選択肢が不正です。' });
      }
    }
  };

  validateBlocks(config.blocks, values.answers, 'answers.');
  return issues;
}

/** 自由入力欄の文字数上限。バックエンドの SettingSheetSubmissionService と同じ値にする。選択肢系は対象外。 */
export const SHORT_TEXT_MAX_LENGTH = 255;
export const LONG_TEXT_MAX_LENGTH = 5000;

export function resolveTextMaxLength(block: SettingSheetBlock): number | null {
  if (block.type === 'LONG_TEXT') return LONG_TEXT_MAX_LENGTH;
  if (block.type === 'SHORT_TEXT' || block.type === 'SONG') return SHORT_TEXT_MAX_LENGTH;
  return null;
}

function resolveBlockOptions(blocks: SettingSheetBlock[], answers: Record<string, SettingSheetFieldValue>, block: SettingSheetBlock) {
  return block.optionSource ? resolveOptionSourceValues(blocks, answers, block.optionSource) : block.options;
}
