/** 管理者だけが入力する項目の扱い（画面に依らない部分）。 */
import {
  isSectionBlock,
  type PublicSettingSheetSubmissionDetailResponse,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionAnswerResponse,
} from '../types/live-types';

/** 管理者入力のブロック（トップレベルとセクションの中）。 */
export function collectAdminBlocks(config: SettingSheetConfigResponse | null): SettingSheetBlock[] {
  if (!config) return [];
  const out: SettingSheetBlock[] = [];
  const visit = (blocks: SettingSheetBlock[]) => {
    for (const block of blocks) {
      if (isSectionBlock(block.type)) visit(block.fields);
      else if (block.adminOnly) out.push(block);
    }
  };
  visit(config.blocks);
  return out;
}

export function readAnswerValues(answers: SettingSheetSubmissionAnswerResponse[], fieldId: string): string[] {
  return answers.find((answer) => answer.fieldId === fieldId)?.values ?? [];
}

/** 選択肢。メンバー名など他の回答から選択肢を作る設定なら、その提出の回答から集める。 */
export function resolveAdminOptions(block: SettingSheetBlock, answers: SettingSheetSubmissionAnswerResponse[]): string[] {
  const source = block.optionSource;
  if (!source) return block.options;
  const values = new Set<string>();
  const visit = (current: SettingSheetSubmissionAnswerResponse[]) => {
    for (const answer of current) {
      for (const item of answer.items) {
        if (answer.fieldId === source.blockId) {
          for (const value of readAnswerValues(item.answers, source.fieldId)) {
            if (value.trim()) values.add(value.trim());
          }
        }
        visit(item.answers);
      }
    }
  };
  visit(answers);
  return Array.from(values);
}

/** 保存後に返ってきた管理者入力を、画面に持っている提出の回答へ反映する。 */
export function applyAdminAnswers(
  detail: PublicSettingSheetSubmissionDetailResponse,
  adminFieldIds: string[],
  saved: SettingSheetSubmissionAnswerResponse[],
): PublicSettingSheetSubmissionDetailResponse {
  const adminIds = new Set(adminFieldIds);
  const kept = detail.answers.filter((answer) => !adminIds.has(answer.fieldId));
  return { ...detail, answers: [...kept, ...saved.filter((answer) => adminIds.has(answer.fieldId))] };
}

/** 一覧の表で、その場で入力できる種類か。 */
export function isInlineEditable(type: SettingSheetBlock['type']): boolean {
  return ['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_SELECT', 'BOOLEAN', 'DURATION'].includes(type);
}
