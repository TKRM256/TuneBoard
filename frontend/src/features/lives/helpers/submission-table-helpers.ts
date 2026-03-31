/** Table column definitions and cell value extraction for the submissions table. */
import {
  isSectionBlock,
  type SettingSheetBlock,
  type SettingSheetConfigResponse,
  type SettingSheetSubmissionAnswerResponse,
} from '../types/live-types';

export interface ColumnDef {
  id: string;
  label: string;
  path: string[];
  type: SettingSheetBlock['type'];
}

export function collectColumns(config: SettingSheetConfigResponse | null): ColumnDef[] {
  if (!config) {
    return [];
  }
  const columns: ColumnDef[] = [];

  const visit = (blocks: SettingSheetConfigResponse['blocks'], labelTrail: string[], answerPath: string[]) => {
    for (const block of blocks) {
      const nextLabelTrail = isSectionBlock(block.type) ? [...labelTrail, block.label] : labelTrail;
      const nextAnswerPath = isSectionBlock(block.type) ? answerPath : [...answerPath, block.id];

      if (block.publicVisible && !isSectionBlock(block.type)) {
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

export function extractCellValue(
  answers: SettingSheetSubmissionAnswerResponse[],
  path: string[],
  blockType: SettingSheetBlock['type'],
): string {
  if (path.length === 0) {
    return '未入力';
  }

  const [currentId, ...restPath] = path;
  const answer = answers.find((entry) => entry.fieldId === currentId);
  if (!answer) {
    return '未入力';
  }

  if (restPath.length === 0) {
    if (blockType === 'REPEATABLE_GROUP') {
      return answer.items.length === 0 ? '未入力' : `${answer.items.length}件`;
    }
    return answer.values.length > 0 ? answer.values.join(' / ') : '未入力';
  }

  const nestedValues = answer.items
    .map((item) => extractCellValue(item.answers, restPath, blockType))
    .filter((value) => value !== '未入力');

  return nestedValues.length === 0 ? '未入力' : nestedValues.join('\n');
}
