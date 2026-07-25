import { describe, expect, it } from 'vitest';

import type {
  SettingSheetBlock,
  SettingSheetConfigResponse,
  SettingSheetSubmissionAnswerResponse,
} from '@/features/lives/types/live-types';

import { createSettingSheetValuesFromSubmissionAnswers } from '../helpers/form-state';
import { applyMergeSelections } from './merge-apply';
import { buildMergeTree, collectMergeRows } from './merge-diff';
import { pruneToDiffs, type MergeNode } from './merge-tree';
import { buildDefaultSelections, type MergeSelections } from './merge-types';

function block(overrides: Partial<SettingSheetBlock> & Pick<SettingSheetBlock, 'id' | 'type' | 'label'>): SettingSheetBlock {
  return {
    description: '',
    hidden: false,
    required: false,
    collapsible: false,
    appearance: 'outline',
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
  return { title: '', description: '', submitButtonLabel: '送信', publicSubmissionEnabled: false, blocks };
}

function values(cfg: SettingSheetConfigResponse, answers: SettingSheetSubmissionAnswerResponse[]) {
  return createSettingSheetValuesFromSubmissionAnswers(cfg.blocks, answers, []);
}

function field(fieldId: string, ...fieldValues: string[]): SettingSheetSubmissionAnswerResponse {
  return { fieldId, values: fieldValues, items: [] };
}

function group(fieldId: string, items: SettingSheetSubmissionAnswerResponse[][]): SettingSheetSubmissionAnswerResponse {
  return { fieldId, values: [], items: items.map((answers) => ({ answers })) };
}

const simpleConfig = config([
  block({ id: 'band-name', type: 'SHORT_TEXT', label: 'バンド名' }),
  block({ id: 'note', type: 'LONG_TEXT', label: '備考' }),
]);

describe('collectMergeRows', () => {
  it('自分と相手が同じ値なら差分行を出さない', () => {
    const base = values(simpleConfig, [field('band-name', 'A')]);
    const same = values(simpleConfig, [field('band-name', 'B')]);

    expect(collectMergeRows(simpleConfig, base, same, same)).toEqual([]);
  });

  it('片側だけの変更はその側を既定選択にする', () => {
    const base = values(simpleConfig, [field('band-name', 'A')]);
    const mine = values(simpleConfig, [field('band-name', 'A')]);
    const theirs = values(simpleConfig, [field('band-name', 'B')]);

    const rows = collectMergeRows(simpleConfig, base, mine, theirs);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: 'band-name', changedBy: 'theirs', kind: 'value' });
    expect(buildDefaultSelections(rows)).toEqual({ 'band-name': { kind: 'side', side: 'theirs' } });
  });

  it('双方が変更した項目はコンフリクトになり既定選択を持たない', () => {
    const base = values(simpleConfig, [field('band-name', 'A')]);
    const mine = values(simpleConfig, [field('band-name', 'B')]);
    const theirs = values(simpleConfig, [field('band-name', 'C')]);

    const rows = collectMergeRows(simpleConfig, base, mine, theirs);

    expect(rows[0]).toMatchObject({ changedBy: 'both', editable: true });
    expect(buildDefaultSelections(rows)).toEqual({});
  });

  it('自由記述でない項目は直接入力の対象にしない', () => {
    const selectConfig = config([
      block({ id: 'status', type: 'SINGLE_SELECT', label: '提出状況', options: ['未完成', '完成'] }),
    ]);
    const base = values(selectConfig, [field('status', '未完成')]);
    const mine = values(selectConfig, [field('status', '完成')]);
    const theirs = values(selectConfig, [field('status', '確認中')]);

    expect(collectMergeRows(selectConfig, base, mine, theirs)[0]).toMatchObject({ editable: false });
  });

  it('LONG_TEXT は複数行の直接入力にする', () => {
    const base = values(simpleConfig, [field('note', 'x')]);
    const mine = values(simpleConfig, [field('note', 'y')]);
    const theirs = values(simpleConfig, [field('note', 'z')]);

    expect(collectMergeRows(simpleConfig, base, mine, theirs)[0]).toMatchObject({
      key: 'note',
      editable: true,
      multiline: true,
    });
  });

  it('SECTION 配下のフィールドも差分の対象になる', () => {
    const sectionConfig = config([
      block({
        id: 'section',
        type: 'SECTION',
        label: '基本情報',
        fields: [block({ id: 'band-name', type: 'SHORT_TEXT', label: 'バンド名' })],
      }),
    ]);
    const base = values(sectionConfig, [field('band-name', 'A')]);
    const mine = values(sectionConfig, [field('band-name', 'A')]);
    const theirs = values(sectionConfig, [field('band-name', 'B')]);

    const rows = collectMergeRows(sectionConfig, base, mine, theirs);

    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('基本情報 › バンド名');
  });

  it('hidden なブロックは差分にしない', () => {
    const hiddenConfig = config([block({ id: 'secret', type: 'SHORT_TEXT', label: '内部メモ', hidden: true })]);
    const base = values(hiddenConfig, [field('secret', 'a')]);
    const mine = values(hiddenConfig, [field('secret', 'b')]);
    const theirs = values(hiddenConfig, [field('secret', 'c')]);

    expect(collectMergeRows(hiddenConfig, base, mine, theirs)).toEqual([]);
  });
});

const songsConfig = config([
  block({
    id: 'songs',
    type: 'REPEATABLE_GROUP',
    label: '曲',
    entryTitle: '曲',
    titleSourceFieldId: 'title',
    fields: [
      block({ id: 'title', type: 'SHORT_TEXT', label: '曲名' }),
      block({ id: 'tuning', type: 'SHORT_TEXT', label: 'チューニング' }),
    ],
  }),
]);

describe('繰り返しグループの差分', () => {
  it('相手が追加した項目は取り込むかどうかの行になる', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1')]])]);
    const mine = base;
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1')], [field('title', '曲2')]])]);

    const rows = collectMergeRows(songsConfig, base, mine, theirs);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'item-added', changedBy: 'theirs', mine: null });
    expect(rows[0].itemSummary?.theirs).toBe('曲2');
  });

  it('相手が削除した項目は残すかどうかの行になる', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1')], [field('title', '曲2')]])]);
    const mine = base;
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1')]])]);

    const rows = collectMergeRows(songsConfig, base, mine, theirs);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: 'item-removed', changedBy: 'theirs', theirs: null });
  });

  it('自分が変更した項目を相手が削除したらコンフリクトになる', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1')], [field('title', '曲2')]])]);
    const mine = values(songsConfig, [group('songs', [[field('title', '曲1')], [field('title', '曲2改')]])]);
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1')]])]);

    const rows = collectMergeRows(songsConfig, base, mine, theirs);

    expect(rows[0]).toMatchObject({ kind: 'item-removed', changedBy: 'both' });
  });

  it('同じ項目の中のフィールドごとに差分行が出る', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1'), field('tuning', 'レギュラー')]])]);
    const mine = values(songsConfig, [group('songs', [[field('title', '曲1'), field('tuning', '半音下げ')]])]);
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1改'), field('tuning', 'レギュラー')]])]);

    const rows = collectMergeRows(songsConfig, base, mine, theirs);

    expect(rows.map((row) => [row.key, row.changedBy, row.label])).toEqual([
      ['songs#0/title', 'theirs', '曲1 › 曲名'],
      ['songs#0/tuning', 'mine', '曲1 › チューニング'],
    ]);
  });

  it('双方が同じ項目を追加した場合は差分にしない', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1')]])]);
    const added = values(songsConfig, [group('songs', [[field('title', '曲1')], [field('title', '曲2')]])]);

    expect(collectMergeRows(songsConfig, base, added, added)).toEqual([]);
  });
});

describe('buildMergeTree', () => {
  it('元のフォームと同じ構造で、差分の無い項目も含めて並べる', () => {
    const sectionConfig = config([
      block({
        id: 'section',
        type: 'SECTION',
        label: '基本情報',
        fields: [
          block({ id: 'band-name', type: 'SHORT_TEXT', label: 'バンド名' }),
          block({ id: 'contact', type: 'SHORT_TEXT', label: '連絡先' }),
        ],
      }),
    ]);
    const base = values(sectionConfig, [field('band-name', 'A'), field('contact', 'c')]);
    const mine = values(sectionConfig, [field('band-name', 'A'), field('contact', 'c')]);
    const theirs = values(sectionConfig, [field('band-name', 'B'), field('contact', 'c')]);

    const tree = buildMergeTree(sectionConfig, base, mine, theirs);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ kind: 'section', label: '基本情報' });
    const children = (tree[0] as { children: MergeNode[] }).children;
    expect(children.map((node) => [node.kind, (node as { label: string }).label])).toEqual([
      ['field', 'バンド名'],
      ['field', '連絡先'],
    ]);
    // 差分のある項目だけ row を持つ
    expect((children[0] as { row: unknown }).row).not.toBeNull();
    expect((children[1] as { row: unknown }).row).toBeNull();
  });

  it('繰り返しグループは項目ごとにぶら下げる', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1'), field('tuning', 'レギュラー')]])]);
    const mine = base;
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1'), field('tuning', '半音下げ')]])]);

    const tree = buildMergeTree(songsConfig, base, mine, theirs);

    expect(tree[0]).toMatchObject({ kind: 'group', label: '曲' });
    const groupNode = tree[0] as { items: Array<{ label: string; children: MergeNode[] }> };
    expect(groupNode.items).toHaveLength(1);
    expect(groupNode.items[0].label).toBe('曲1');
    expect(groupNode.items[0].children.map((node) => (node as { label: string }).label)).toEqual([
      '曲名',
      'チューニング',
    ]);
  });
});

describe('pruneToDiffs', () => {
  it('差分を含まない枝を落としつつ、見出しの文脈は残す', () => {
    const sectionConfig = config([
      block({
        id: 'section',
        type: 'SECTION',
        label: '基本情報',
        fields: [
          block({ id: 'band-name', type: 'SHORT_TEXT', label: 'バンド名' }),
          block({ id: 'contact', type: 'SHORT_TEXT', label: '連絡先' }),
        ],
      }),
      block({
        id: 'other',
        type: 'SECTION',
        label: 'その他',
        fields: [block({ id: 'memo', type: 'SHORT_TEXT', label: 'メモ' })],
      }),
    ]);
    const base = values(sectionConfig, [field('band-name', 'A'), field('contact', 'c'), field('memo', 'm')]);
    const mine = base;
    const theirs = values(sectionConfig, [field('band-name', 'B'), field('contact', 'c'), field('memo', 'm')]);

    const pruned = pruneToDiffs(buildMergeTree(sectionConfig, base, mine, theirs));

    expect(pruned).toHaveLength(1);
    expect(pruned[0]).toMatchObject({ kind: 'section', label: '基本情報' });
    const children = (pruned[0] as { children: MergeNode[] }).children;
    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ kind: 'field', label: 'バンド名' });
  });

  it('差分が無ければ空になる', () => {
    const base = values(simpleConfig, [field('band-name', 'A')]);

    expect(pruneToDiffs(buildMergeTree(simpleConfig, base, base, base))).toEqual([]);
  });
});

function resolveAll(cfg: SettingSheetConfigResponse, base: ReturnType<typeof values>, mine: ReturnType<typeof values>, theirs: ReturnType<typeof values>, overrides: MergeSelections = {}) {
  const rows = collectMergeRows(cfg, base, mine, theirs);
  const selections = { ...buildDefaultSelections(rows), ...overrides };
  return applyMergeSelections(cfg, base, mine, theirs, rows, selections);
}

describe('applyMergeSelections', () => {
  it('片側だけの変更は既定でその側が採用される', () => {
    const base = values(simpleConfig, [field('band-name', 'A'), field('note', 'x')]);
    const mine = values(simpleConfig, [field('band-name', 'A'), field('note', 'mine')]);
    const theirs = values(simpleConfig, [field('band-name', 'theirs'), field('note', 'x')]);

    const merged = resolveAll(simpleConfig, base, mine, theirs);

    expect(merged.answers['band-name'].values).toEqual(['theirs']);
    expect(merged.answers.note.values).toEqual(['mine']);
  });

  it('コンフリクトは選択した側が採用される', () => {
    const base = values(simpleConfig, [field('band-name', 'A')]);
    const mine = values(simpleConfig, [field('band-name', 'B')]);
    const theirs = values(simpleConfig, [field('band-name', 'C')]);

    const merged = resolveAll(simpleConfig, base, mine, theirs, {
      'band-name': { kind: 'side', side: 'theirs' },
    });

    expect(merged.answers['band-name'].values).toEqual(['C']);
  });

  it('文字単位マージの結果を採用できる', () => {
    const base = values(simpleConfig, [field('band-name', 'A')]);
    const mine = values(simpleConfig, [field('band-name', 'B')]);
    const theirs = values(simpleConfig, [field('band-name', 'C')]);

    const merged = resolveAll(simpleConfig, base, mine, theirs, {
      'band-name': { kind: 'text', value: 'BC' },
    });

    expect(merged.answers['band-name'].values).toEqual(['BC']);
  });

  it('相手が追加した項目を取り込まない選択ができる', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1')]])]);
    const mine = base;
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1')], [field('title', '曲2')]])]);

    const adopted = resolveAll(songsConfig, base, mine, theirs);
    expect(adopted.answers.songs.items).toHaveLength(2);

    const rejected = resolveAll(songsConfig, base, mine, theirs, {
      'songs#1': { kind: 'side', side: 'mine' },
    });
    expect(rejected.answers.songs.items).toHaveLength(1);
  });

  it('相手が削除した項目を残す選択ができる', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1')], [field('title', '曲2')]])]);
    const mine = base;
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1')]])]);

    const deleted = resolveAll(songsConfig, base, mine, theirs);
    expect(deleted.answers.songs.items).toHaveLength(1);

    const kept = resolveAll(songsConfig, base, mine, theirs, {
      'songs#1': { kind: 'side', side: 'mine' },
    });
    expect(kept.answers.songs.items).toHaveLength(2);
  });

  it('項目内のフィールドはそれぞれの採用側が混ざる', () => {
    const base = values(songsConfig, [group('songs', [[field('title', '曲1'), field('tuning', 'レギュラー')]])]);
    const mine = values(songsConfig, [group('songs', [[field('title', '曲1'), field('tuning', '半音下げ')]])]);
    const theirs = values(songsConfig, [group('songs', [[field('title', '曲1改'), field('tuning', 'レギュラー')]])]);

    const merged = resolveAll(songsConfig, base, mine, theirs);
    const item = merged.answers.songs.items[0];

    expect(item.answers.title.values).toEqual(['曲1改']);
    expect(item.answers.tuning.values).toEqual(['半音下げ']);
  });

  it('hidden なブロックの値は自分のものが保持される', () => {
    const hiddenConfig = config([block({ id: 'secret', type: 'SHORT_TEXT', label: '内部メモ', hidden: true })]);
    const base = values(hiddenConfig, [field('secret', 'a')]);
    const mine = values(hiddenConfig, [field('secret', 'b')]);
    const theirs = values(hiddenConfig, [field('secret', 'c')]);

    expect(resolveAll(hiddenConfig, base, mine, theirs).answers.secret.values).toEqual(['b']);
  });
});
