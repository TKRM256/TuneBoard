/** Table column definitions and cell value extraction for the submissions table. */
import {
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionAnswerResponse,
} from '../types/live-types';

/** 回答が無いセルの表示値。検索・ソートでも同じ値を空扱いの判定に使う。 */
export const EMPTY_CELL_VALUE = '未入力';

export interface ColumnDef {
  id: string;
  label: string;
  path: string[];
  type: SettingSheetBlock['type'];
}

/**
 * 列を出す画面。
 * - admin: 管理者画面の提出一覧（adminVisible）
 * - shared: 共有フォーム＝公開の提出一覧（publicVisible）
 */
export type ColumnScope = 'admin' | 'shared';

function isVisibleInScope(block: SettingSheetBlock, scope: ColumnScope): boolean {
  if (scope === 'shared') {
    return block.publicVisible === true;
  }
  // adminVisible が無い旧データは共有設定を引き継ぐ
  return block.adminVisible === undefined ? block.publicVisible === true : block.adminVisible === true;
}

export function collectColumns(config: SettingSheetConfigResponse | null, scope: ColumnScope): ColumnDef[] {
  if (!config) {
    return [];
  }
  const columns: ColumnDef[] = [];

  const visit = (blocks: SettingSheetConfigResponse['blocks'], labelTrail: string[], answerPath: string[]) => {
    for (const block of blocks) {
      const nextLabelTrail = isSectionBlock(block.type) ? [...labelTrail, block.label] : labelTrail;
      const nextAnswerPath = isSectionBlock(block.type) ? answerPath : [...answerPath, block.id];

      if (isVisibleInScope(block, scope) && !isSectionBlock(block.type)) {
        columns.push({
          id: block.id,
          label: [...labelTrail, block.label].join(' / '),
          path: [...answerPath, block.id],
          type: block.type,
        });
      }

      if (block.fields.length > 0) {
        visit(block.fields, nextLabelTrail, nextAnswerPath);
      }

      if (block.variants && block.variants.length > 0) {
        const baseVariantLabelTrail = isSectionBlock(block.type) ? nextLabelTrail : [...labelTrail, block.label];
        for (const variant of block.variants) {
          const variantLabelTrail = [...baseVariantLabelTrail, variant.label];
          visit(variant.fields, variantLabelTrail, nextAnswerPath);
        }
      }
    }
  };

  visit(config.blocks, [], []);
  return columns;
}

function formatBooleanValue(value: string): string {
  return value === 'true' || value === 'はい' ? 'はい' : 'いいえ';
}

export function extractCellValue(
  answers: SettingSheetSubmissionAnswerResponse[],
  path: string[],
  blockType: SettingSheetBlock['type'],
): string {
  if (path.length === 0) {
    return EMPTY_CELL_VALUE;
  }

  const [currentId, ...restPath] = path;
  const answer = answers.find((entry) => entry.fieldId === currentId);
  if (!answer) {
    return EMPTY_CELL_VALUE;
  }

  if (restPath.length === 0) {
    if (blockType === 'REPEATABLE_GROUP') {
      return answer.items.length === 0 ? EMPTY_CELL_VALUE : `${answer.items.length}件`;
    }
    return answer.values.length > 0 ? answer.values.map(
      (value) => {
        return blockType === 'BOOLEAN' ? formatBooleanValue(value) : value;
      }
    ).join(' / ') : EMPTY_CELL_VALUE;
  }

  const nestedValues = answer.items
    .map((item) => extractCellValue(item.answers, restPath, blockType))
    .filter((value) => value !== EMPTY_CELL_VALUE);

  return nestedValues.length === 0 ? EMPTY_CELL_VALUE : nestedValues.map(
    (value) => {
      return blockType === 'BOOLEAN' ? formatBooleanValue(value) : value;
    }
  ).join('\n');
}
