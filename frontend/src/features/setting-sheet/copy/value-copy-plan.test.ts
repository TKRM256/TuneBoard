import { describe, expect, it } from 'vitest';

import {
  createBlockTemplate,
  type SettingSheetBlock,
  type SettingSheetBlockType,
  type SettingSheetConfigResponse,
} from '@/features/lives/types/live-types';

import type { SettingSheetFieldValue, SettingSheetFormValues } from '../helpers/form-state';
import { applyValueCopy, buildValueCopyPlan } from './value-copy-plan';

function block(id: string, type: SettingSheetBlockType, patch: Partial<SettingSheetBlock> = {}): SettingSheetBlock {
  return { ...createBlockTemplate(type), id, ...patch };
}

function config(blocks: SettingSheetBlock[]): SettingSheetConfigResponse {
  return {
    title: 'フォーム',
    description: '',
    submitButtonLabel: '送信する',
    publicSubmissionEnabled: true,
    blocks,
  };
}

function values(answers: Record<string, SettingSheetFieldValue>): SettingSheetFormValues {
  return { answers, itunesLinks: {} };
}

function scalar(...entries: string[]): SettingSheetFieldValue {
  return { values: entries, items: [] };
}

describe('buildValueCopyPlan', () => {
  it('IDが一致する項目の値を取り込む', () => {
    const current = config([block('band-name', 'SHORT_TEXT', { label: 'バンド名' })]);
    const source = config([block('band-name', 'SHORT_TEXT', { label: 'バンド名' })]);

    const plan = buildValueCopyPlan(current, values({}), source, values({ 'band-name': scalar('たぬきバンド') }));

    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({ key: 'band-name', matchedBy: 'id', incomingText: 'たぬきバンド' });
  });

  it('IDが違ってもラベルと種類が一致すれば取り込む', () => {
    const current = config([block('current-memo', 'LONG_TEXT', { label: '備考' })]);
    const source = config([block('source-memo', 'LONG_TEXT', { label: '備考' })]);

    const plan = buildValueCopyPlan(current, values({}), source, values({ 'source-memo': scalar('去年のメモ') }));

    expect(plan.rows[0]).toMatchObject({ key: 'current-memo', matchedBy: 'label' });
    expect(plan.rows[0].value.values).toEqual(['去年のメモ']);
  });

  it('セクションの中の項目も対象にする', () => {
    const current = config([block('section', 'SECTION', { fields: [block('memo', 'SHORT_TEXT', { label: 'メモ' })] })]);
    const source = config([block('memo', 'SHORT_TEXT', { label: 'メモ' })]);

    const plan = buildValueCopyPlan(current, values({}), source, values({ memo: scalar('去年') }));

    expect(plan.rows.map((row) => row.key)).toEqual(['memo']);
  });

  it('いまの選択肢に無い値は落として報告する', () => {
    const current = config([block('parts', 'MULTI_SELECT', { label: '担当パート', options: ['Vocal', 'Guitar'] })]);
    const source = config([block('parts', 'MULTI_SELECT', { label: '担当パート', options: ['Vocal', 'Sax'] })]);

    const plan = buildValueCopyPlan(current, values({}), source, values({ parts: scalar('Vocal', 'Sax') }));

    expect(plan.rows[0].value.values).toEqual(['Vocal']);
    expect(plan.rows[0].droppedValues).toEqual(['Sax']);
  });

  it('繰り返しグループは項目ごと引き継ぐ', () => {
    const memberFields = [block('member-name', 'SHORT_TEXT', { label: '氏名' })];
    const group = (id: string) => block(id, 'REPEATABLE_GROUP', {
      label: '出演者',
      titleSourceFieldId: 'member-name',
      fields: memberFields,
    });
    const current = config([group('members')]);
    const source = config([group('members')]);
    const sourceValues = values({
      members: {
        values: [],
        items: [
          { id: 'old-1', variantId: '', answers: { 'member-name': scalar('たぬき') } },
          { id: 'old-2', variantId: '', answers: { 'member-name': scalar('きつね') } },
        ],
      },
    });

    const plan = buildValueCopyPlan(current, values({}), source, sourceValues);

    expect(plan.rows[0].incomingText).toBe('2件: たぬき / きつね');
    // 項目 ID は取り込み先で振り直し、元のシートと共有しない
    expect(plan.rows[0].value.items.map((item) => item.id)).not.toContain('old-1');
  });

  it('取り込む内容が無い項目は対象外として並べる', () => {
    const current = config([block('memo', 'SHORT_TEXT', { label: 'メモ' })]);
    const source = config([block('other', 'SHORT_TEXT', { label: '別の項目' })]);

    const plan = buildValueCopyPlan(current, values({}), source, values({}));

    expect(plan.rows).toHaveLength(0);
    expect(plan.unmatchedLabels).toEqual(['メモ']);
  });
});

describe('applyValueCopy', () => {
  it('選んだ行だけを現在の入力に反映する', () => {
    const current = config([
      block('a', 'SHORT_TEXT', { label: 'A' }),
      block('b', 'SHORT_TEXT', { label: 'B' }),
    ]);
    const source = config([
      block('a', 'SHORT_TEXT', { label: 'A' }),
      block('b', 'SHORT_TEXT', { label: 'B' }),
    ]);
    const currentValues = values({ a: scalar('いまのA'), b: scalar('いまのB') });
    const plan = buildValueCopyPlan(current, currentValues, source, values({ a: scalar('前回A'), b: scalar('前回B') }));

    const result = applyValueCopy(current, currentValues, plan.rows, new Set(['a']), {});

    expect(result.answers.a.values).toEqual(['前回A']);
    expect(result.answers.b.values).toEqual(['いまのB']);
  });
});
