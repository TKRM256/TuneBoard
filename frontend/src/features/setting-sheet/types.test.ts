import { describe, expect, it } from 'vitest';

import type { SettingSheetConfigResponse } from '@/features/lives/types/type';

import { createDefaultSettingSheetValues, toSettingSheetSubmissionPayload, validateSettingSheetForm ,createSettingSheetValuesFromSubmissionAnswers} from './types';

const configWithHiddenSection: SettingSheetConfigResponse = {
  title: 'test',
  description: '',
  submitButtonLabel: '送信',
  publicSubmissionEnabled: false,
  recordLabelFieldId: '',
  blocks: [
    {
      id: 'section-1',
      type: 'SECTION',
      label: 'セクション',
      description: '',
      hidden: false,
      required: false,
      collapsible: false,
      appearance: 'plain',
      itemAppearance: 'plain',
      options: [],
      minItems: 0,
      addButtonLabel: '',
      entryTitle: '',
      titleSourceFieldId: '',
      layout: { width: 'full', optionColumns: 1, optionFitContent: false },
      optionSource: null,
      fields: [
        {
          id: 'visible-field',
          type: 'SHORT_TEXT',
          label: '表示項目',
          description: '',
          hidden: false,
          required: true,
          collapsible: false,
          appearance: 'outline',
          itemAppearance: 'plain',
          options: [],
          minItems: 0,
          addButtonLabel: '',
          entryTitle: '',
          titleSourceFieldId: '',
          layout: { width: 'half', optionColumns: 1, optionFitContent: false },
          optionSource: null,
          fields: [],
        },
        {
          id: 'hidden-field',
          type: 'SHORT_TEXT',
          label: '非表示項目',
          description: '',
          hidden: true,
          required: true,
          collapsible: false,
          appearance: 'outline',
          itemAppearance: 'plain',
          options: [],
          minItems: 0,
          addButtonLabel: '',
          entryTitle: '',
          titleSourceFieldId: '',
          layout: { width: 'half', optionColumns: 1, optionFitContent: false },
          optionSource: null,
          fields: [],
        },
      ],
    },
  ],
};

describe('setting-sheet types', () => {
  it('hidden な必須項目はバリデーション対象外になる', () => {
    const values = createDefaultSettingSheetValues(configWithHiddenSection.blocks);

    const issues = validateSettingSheetForm(values, configWithHiddenSection);

    expect(issues).toEqual([
      expect.objectContaining({ key: 'answers.visible-field', message: '必須項目です。' }),
    ]);
  });

  it('section 配下の項目は payload では同一スコープに flatten され、hidden は除外される', () => {
    const values = createDefaultSettingSheetValues(configWithHiddenSection.blocks);
    values.answers['visible-field'] = { values: ['visible'], items: [] };
    values.answers['hidden-field'] = { values: ['hidden'], items: [] };

    const payload = toSettingSheetSubmissionPayload(values, configWithHiddenSection);

    expect(payload).toEqual({
      answers: [
        {
          fieldId: 'visible-field',
          values: ['visible'],
          items: [],
        },
      ],
    });
  });

  it('repeatable group 内 section 配下の回答を提出済みデータから復元できる', () => {
    const config: SettingSheetConfigResponse = {
      title: 'test',
      description: '',
      submitButtonLabel: '送信',
      publicSubmissionEnabled: false,
      recordLabelFieldId: '',
      blocks: [
        {
          id: 'members',
          type: 'REPEATABLE_GROUP',
          label: '出演者',
          description: '',
          hidden: false,
          required: false,
          collapsible: false,
          appearance: 'subtle',
          itemAppearance: 'outline',
          options: [],
          minItems: 0,
          addButtonLabel: '追加',
          entryTitle: '出演者',
          titleSourceFieldId: 'member-name',
          layout: { width: 'full', optionColumns: 1, optionFitContent: false },
          optionSource: null,
          fields: [
            {
              id: 'member-section',
              type: 'SECTION',
              label: '基本情報',
              description: '',
              hidden: false,
              required: false,
              collapsible: false,
              appearance: 'plain',
              itemAppearance: 'plain',
              options: [],
              minItems: 0,
              addButtonLabel: '',
              entryTitle: '',
              titleSourceFieldId: '',
              layout: { width: 'full', optionColumns: 1, optionFitContent: false },
              optionSource: null,
              fields: [
                {
                  id: 'member-name',
                  type: 'SHORT_TEXT',
                  label: '氏名',
                  description: '',
                  hidden: false,
                  required: true,
                  collapsible: false,
                  appearance: 'outline',
                  itemAppearance: 'plain',
                  options: [],
                  minItems: 0,
                  addButtonLabel: '',
                  entryTitle: '',
                  titleSourceFieldId: '',
                  layout: { width: 'half', optionColumns: 1, optionFitContent: false },
                  optionSource: null,
                  fields: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const values = createSettingSheetValuesFromSubmissionAnswers(config.blocks, [
      {
        fieldId: 'members',
        values: [],
        items: [
          {
            answers: [
              {
                fieldId: 'member-name',
                values: ['Alice'],
                items: [],
              },
            ],
          },
        ],
      },
    ]);

    expect(values.answers.members.items).toHaveLength(1);
    expect(values.answers.members.items[0].answers['member-name']).toEqual({
      values: ['Alice'],
      items: [],
    });
  });
});