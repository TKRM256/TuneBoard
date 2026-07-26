import { describe, expect, it } from 'vitest';

import {
  createBlockTemplate,
  type SettingSheetBlock,
  type SettingSheetBlockType,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import { applyFormConfigCopy, buildFormConfigCopyPlan, defaultSelectedBlockIds } from './form-config-copy';

function block(id: string, type: SettingSheetBlockType, patch: Partial<SettingSheetBlock> = {}): SettingSheetBlock {
  return { ...createBlockTemplate(type), id, ...patch };
}

function config(blocks: SettingSheetBlock[], patch: Partial<SettingSheetConfigResponse> = {}): SettingSheetConfigResponse {
  return {
    title: 'いまのフォーム',
    description: '',
    submitButtonLabel: '送信する',
    publicSubmissionEnabled: true,
    blocks,
    ...patch,
  };
}

describe('buildFormConfigCopyPlan', () => {
  it('同じIDのトップレベルブロックは上書き、無いものは追加として並べる', () => {
    const current = config([block('a', 'SHORT_TEXT', { label: '既存' })]);
    const source = config([
      block('a', 'SHORT_TEXT', { label: '取り込み元' }),
      block('b', 'LONG_TEXT', { label: '新しい項目' }),
    ]);

    const plan = buildFormConfigCopyPlan(current, source);

    expect(plan.blocks.map((entry) => [entry.blockId, entry.status])).toEqual([
      ['a', 'overwrite'],
      ['b', 'new'],
    ]);
    expect(defaultSelectedBlockIds(plan)).toEqual(new Set(['a', 'b']));
  });

  it('入れ子の項目とIDが衝突するブロックは取り込めない', () => {
    const current = config([block('section', 'SECTION', { fields: [block('x', 'SHORT_TEXT')] })]);
    const source = config([block('x', 'SHORT_TEXT', { label: '衝突する項目' })]);

    const plan = buildFormConfigCopyPlan(current, source);

    expect(plan.blocks[0].status).toBe('conflict');
    expect(plan.blocks[0].selectable).toBe(false);
    expect(defaultSelectedBlockIds(plan).size).toBe(0);
  });

  it('繰り返しグループは子項目とバリアントの項目もまとめて示す', () => {
    const current = config([]);
    const source = config([
      block('members', 'REPEATABLE_GROUP', {
        label: '出演者',
        fields: [block('member-name', 'SHORT_TEXT', { label: '氏名' })],
        variants: [{ id: 'v1', label: '曲', fields: [block('song', 'SONG', { label: '楽曲' })] }],
      }),
    ]);

    const plan = buildFormConfigCopyPlan(current, source);

    expect(plan.blocks[0].childLabels).toEqual(['氏名', '楽曲']);
  });

  it('フォーム全体の設定は現在と違うものだけ changed になる', () => {
    const current = config([], { title: 'いまのフォーム', submitButtonLabel: '送信する' });
    const source = config([], { title: '別のフォーム', submitButtonLabel: '送信する' });

    const plan = buildFormConfigCopyPlan(current, source);

    expect(plan.meta.find((entry) => entry.key === 'title')?.changed).toBe(true);
    expect(plan.meta.find((entry) => entry.key === 'submitButtonLabel')?.changed).toBe(false);
  });
});

describe('applyFormConfigCopy', () => {
  it('選んだブロックだけを上書き・追加し、選ばなかったものは触らない', () => {
    const current = config([
      block('a', 'SHORT_TEXT', { label: '既存A' }),
      block('c', 'SHORT_TEXT', { label: '既存C' }),
    ]);
    const source = config([
      block('a', 'SHORT_TEXT', { label: '新しいA' }),
      block('b', 'SHORT_TEXT', { label: '新しいB' }),
      block('c', 'SHORT_TEXT', { label: '取り込まないC' }),
    ]);

    const result = applyFormConfigCopy(current, source, new Set(['a', 'b']), new Set());

    expect(result.blocks.map((entry) => [entry.id, entry.label])).toEqual([
      ['a', '新しいA'],
      ['c', '既存C'],
      ['b', '新しいB'],
    ]);
  });

  it('選んだフォーム全体の設定だけ差し替える', () => {
    const current = config([], { title: 'いまのフォーム', description: 'いまの説明' });
    const source = config([], { title: '別のフォーム', description: '別の説明' });

    const result = applyFormConfigCopy(current, source, new Set(), new Set(['title']));

    expect(result.title).toBe('別のフォーム');
    expect(result.description).toBe('いまの説明');
  });

  it('取り込んだブロックは元の設定と参照を共有しない', () => {
    const current = config([]);
    const source = config([block('a', 'SHORT_TEXT', { label: '取り込み元' })]);

    const result = applyFormConfigCopy(current, source, new Set(['a']), new Set());
    result.blocks[0].label = '書き換え';

    expect(source.blocks[0].label).toBe('取り込み元');
  });
});
