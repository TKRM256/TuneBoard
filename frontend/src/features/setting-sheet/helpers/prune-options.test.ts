import { describe, expect, it } from 'vitest';

import type { SettingSheetBlock, SettingSheetConfigResponse } from '@/features/lives/types/live-types';

import { pruneUnknownOptionValues } from './prune-options';
import type { SettingSheetFormValues } from './form-state';

function block(overrides: Partial<SettingSheetBlock> & Pick<SettingSheetBlock, 'id' | 'type'>): SettingSheetBlock {
  return {
    label: overrides.id,
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
    fields: [],
    layout: { width: 'full', optionColumns: 1, optionFitContent: false },
    optionSource: null,
    duplicateDetectionRole: '',
    ...overrides,
  };
}

function config(blocks: SettingSheetBlock[]): SettingSheetConfigResponse {
  return { title: 'test', description: '', submitButtonLabel: '送信', publicSubmissionEnabled: true, blocks };
}

function formValues(answers: SettingSheetFormValues['answers']): SettingSheetFormValues {
  return { answers, itunesLinks: {} };
}

describe('pruneUnknownOptionValues', () => {
  it('管理者が選択肢を差し替えた後、現在の選択肢に無い旧値を落とす', () => {
    const sheet = config([block({ id: 'genres', type: 'CHECKBOX', options: ['C', 'D', 'E'] })]);
    const values = formValues({ genres: { values: ['A', 'B', 'D', 'E'], items: [] } });

    const pruned = pruneUnknownOptionValues(values, sheet);

    expect(pruned.answers.genres.values).toEqual(['D', 'E']);
  });

  it('SINGLE_SELECT の旧値も落とす', () => {
    const sheet = config([block({ id: 'part', type: 'SINGLE_SELECT', options: ['Gt', 'Ba'] })]);
    const values = formValues({ part: { values: ['Dr'], items: [] } });

    const pruned = pruneUnknownOptionValues(values, sheet);

    expect(pruned.answers.part.values).toEqual([]);
  });

  it('落とす値が無ければ同じオブジェクトを返す', () => {
    const sheet = config([block({ id: 'genres', type: 'CHECKBOX', options: ['C', 'D'] })]);
    const values = formValues({ genres: { values: ['C'], items: [] } });

    expect(pruneUnknownOptionValues(values, sheet)).toBe(values);
  });

  it('選択肢ブロック以外の値には触れない', () => {
    const sheet = config([block({ id: 'note', type: 'SHORT_TEXT' })]);
    const values = formValues({ note: { values: ['自由入力'], items: [] } });

    expect(pruneUnknownOptionValues(values, sheet).answers.note.values).toEqual(['自由入力']);
  });

  it('hidden なブロックは検証・送信の対象外なので触れない', () => {
    const sheet = config([block({ id: 'genres', type: 'CHECKBOX', hidden: true, options: ['C'] })]);
    const values = formValues({ genres: { values: ['A'], items: [] } });

    expect(pruneUnknownOptionValues(values, sheet)).toBe(values);
  });

  it('section 配下のブロックも対象になる', () => {
    const sheet = config([
      block({
        id: 'section',
        type: 'SECTION',
        fields: [block({ id: 'genres', type: 'MULTI_SELECT', options: ['C'] })],
      }),
    ]);
    const values = formValues({
      section: { values: [], items: [] },
      genres: { values: ['A', 'C'], items: [] },
    });

    expect(pruneUnknownOptionValues(values, sheet).answers.genres.values).toEqual(['C']);
  });

  it('repeatable group の各アイテム内も対象になり、変更の無いアイテムは参照を保つ', () => {
    const sheet = config([
      block({
        id: 'songs',
        type: 'REPEATABLE_GROUP',
        fields: [block({ id: 'mood', type: 'CHECKBOX', options: ['C'] })],
      }),
    ]);
    const values = formValues({
      songs: {
        values: [],
        items: [
          { id: 'item-1', variantId: '', answers: { mood: { values: ['A', 'C'], items: [] } } },
          { id: 'item-2', variantId: '', answers: { mood: { values: ['C'], items: [] } } },
        ],
      },
    });

    const pruned = pruneUnknownOptionValues(values, sheet);

    expect(pruned.answers.songs.items[0].answers.mood.values).toEqual(['C']);
    expect(pruned.answers.songs.items[1]).toBe(values.answers.songs.items[1]);
  });

  it('optionSource の選択肢は参照元の現在の回答で判定する', () => {
    const sheet = config([
      block({
        id: 'songs',
        type: 'REPEATABLE_GROUP',
        fields: [block({ id: 'song-title', type: 'SHORT_TEXT' })],
      }),
      block({
        id: 'encore',
        type: 'SINGLE_SELECT',
        optionSource: { blockId: 'songs', fieldId: 'song-title' },
      }),
    ]);
    const values = formValues({
      songs: {
        values: [],
        items: [{ id: 'item-1', variantId: '', answers: { 'song-title': { values: ['新しい曲'], items: [] } } }],
      },
      encore: { values: ['古い曲'], items: [] },
    });

    const pruned = pruneUnknownOptionValues(values, sheet);

    expect(pruned.answers.encore.values).toEqual([]);
  });
});
