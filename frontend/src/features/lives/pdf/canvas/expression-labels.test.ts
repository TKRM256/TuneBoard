import { describe, expect, it } from 'vitest';

import type { SettingSheetBlock, SettingSheetConfigResponse } from '../../types/live-types';
import { buildFieldCatalog } from '../field-catalog';
import { humanizeExpression, splitExpressionLabels } from './expression-labels';

const layout = { width: 'half' as const, optionColumns: 1, optionFitContent: false };

function leaf(id: string, label: string): SettingSheetBlock {
  return {
    id, type: 'SHORT_TEXT', label, description: '', hidden: false, required: false,
    collapsible: false, appearance: 'outline', itemAppearance: 'plain', options: [],
    minItems: 0, addButtonLabel: '', entryTitle: '', titleSourceFieldId: '', fields: [],
    layout, optionSource: null, duplicateDetectionRole: '',
  };
}

function group(id: string, label: string, fields: SettingSheetBlock[]): SettingSheetBlock {
  return { ...leaf(id, label), type: 'REPEATABLE_GROUP', fields };
}

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const FIELD_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

const config: SettingSheetConfigResponse = {
  title: 't', description: '', submitButtonLabel: 's', publicSubmissionEnabled: true,
  blocks: [
    leaf('band-name', 'バンド名'),
    group(UUID, '出演者', [leaf(FIELD_UUID, '氏名')]),
  ],
};

const catalog = buildFieldCatalog(config);

describe('humanizeExpression', () => {
  it('fields[id] をラベルに置き換える', () => {
    expect(humanizeExpression("fields['band-name'].value", catalog)).toBe("fields['バンド名'].value");
  });

  it('ユーザー追加項目の UUID もラベルになる', () => {
    expect(humanizeExpression(`groups['${UUID}'].items`, catalog)).toBe("groups['出演者'].items");
  });

  it('field() / group() のラムダ内もラベルになる', () => {
    const expr = `mapJoin(groups['${UUID}'].items, (m) -> m.field('${FIELD_UUID}').value, ' / ')`;

    expect(humanizeExpression(expr, catalog)).toBe(
      "mapJoin(groups['出演者'].items, (m) -> m.field('氏名').value, ' / ')",
    );
  });

  it('引数として渡される裸の ID もラベルになる', () => {
    expect(humanizeExpression(`joinField(groups['${UUID}'], '${FIELD_UUID}', ', ')`, catalog)).toBe(
      "joinField(groups['出演者'], '氏名', ', ')",
    );
  });

  it('カタログに無い文字列はそのまま残す', () => {
    expect(humanizeExpression("formatDate(live.date, 'yyyy/M/d')", catalog)).toBe(
      "formatDate(live.date, 'yyyy/M/d')",
    );
  });
});

describe('splitExpressionLabels', () => {
  it('ラベルに置き換えた部分だけ isLabel で区別する', () => {
    const segments = splitExpressionLabels("fields['band-name'].value", catalog);

    expect(segments).toEqual([
      { text: "fields['", isLabel: false },
      { text: 'バンド名', isLabel: true },
      { text: "'].value", isLabel: false },
    ]);
  });
});
