/** 提出内容を表示するときの日時・回答の書き方。 */
import { summarizeStagePlot } from '@/features/stage-plot/stage-plot-types';
import type { SettingSheetBlock, SettingSheetSubmissionAnswerResponse } from '../types/live-types';

export function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatAnswerValue(values: string[], blockType: SettingSheetBlock['type']) {
  if (values.length === 0) {
    return '未入力';
  }
  if (blockType === 'BOOLEAN') {
    return values[0] === 'true' ? 'はい' : values[0] === 'false' ? 'いいえ' : values.join(' / ');
  }
  if (blockType === 'STAGE_PLOT') {
    return summarizeStagePlot(values[0]) || '未入力';
  }
  return values.join(' / ');
}

export function resolveItemTitle(block: SettingSheetBlock, itemAnswers: SettingSheetSubmissionAnswerResponse[], itemIndex: number) {
  if (block.titleSourceFieldId) {
    const source = itemAnswers.find((a) => a.fieldId === block.titleSourceFieldId);
    if (source && source.values.length > 0 && source.values[0].trim()) {
      return source.values[0].trim();
    }
  }
  return `${block.entryTitle || block.label} ${itemIndex + 1}`;
}

