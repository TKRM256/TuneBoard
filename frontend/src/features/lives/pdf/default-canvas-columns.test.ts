/** 既定フォームから組み立てられる表の列構成を確認する。 */
import { describe, expect, it } from 'vitest';

import {
  createBlockTemplate,
  type SettingSheetBlock,
  type SettingSheetBlockType,
  type SettingSheetConfigResponse,
} from '../types/live-types';
import { buildStandardGroupColumns } from './default-canvas-columns';
import { buildFieldCatalog } from './field-catalog';

function block(id: string, type: SettingSheetBlockType, label: string, patch: Partial<SettingSheetBlock> = {}): SettingSheetBlock {
  return { ...createBlockTemplate(type), id, label, ...patch };
}

/** backend の defaultSettingSheetConfig と同じ骨格。 */
function defaultFormConfig(): SettingSheetConfigResponse {
  const songMics = block('song-mics', 'REPEATABLE_GROUP', '使うマイク', {
    fields: [
      block('mic-member', 'SINGLE_SELECT', '担当者'),
      block('mic-main-vocal', 'BOOLEAN', 'メインボーカル'),
    ],
  });
  const mcMics = block('mc-mics', 'REPEATABLE_GROUP', '使うマイク', {
    fields: [
      block('mc-mic-member', 'SINGLE_SELECT', '担当者'),
      block('mc-mic-main', 'BOOLEAN', 'メインボーカル'),
    ],
  });

  return {
    title: 'バンド申請フォーム',
    description: '',
    submitButtonLabel: '送信する',
    publicSubmissionEnabled: true,
    blocks: [
      block('section-band', 'SECTION', 'バンド基本情報', {
        fields: [
          block('band-name', 'SHORT_TEXT', 'バンド名'),
          block('submission-status', 'SINGLE_SELECT', '提出状況'),
          block('detail', 'LONG_TEXT', '備考'),
        ],
      }),
      block('members', 'REPEATABLE_GROUP', '出演者', {
        fields: [
          block('member-name', 'SHORT_TEXT', '氏名'),
          block('member-representative', 'BOOLEAN', '代表者'),
          block('member-parts', 'MULTI_SELECT', '担当パート'),
        ],
      }),
      block('setlist', 'REPEATABLE_GROUP', 'セットリスト', {
        variants: [
          {
            id: 'song-entry',
            label: '曲',
            fields: [
              block('song', 'SONG', '楽曲'),
              block('song-parts', 'MULTI_SELECT', '使うパート'),
              block('song-note-pa', 'LONG_TEXT', 'PAへの要望'),
              block('song-note-light', 'LONG_TEXT', '照明への要望'),
              block('song-note-other', 'LONG_TEXT', '備考'),
              songMics,
            ],
          },
          { id: 'mc-entry', label: 'MC', fields: [mcMics] },
        ],
      }),
    ],
  };
}

function groupOf(id: string) {
  const catalog = buildFieldCatalog(defaultFormConfig());
  const group = catalog.groups.find((candidate) => candidate.id === id);
  if (!group) {
    throw new Error(`group not found: ${id}`);
  }
  return group;
}

describe('buildStandardGroupColumns（出演者）', () => {
  it('氏名と担当パートだけを列にする', () => {
    const columns = buildStandardGroupColumns(groupOf('members'));
    expect(columns?.map((column) => column.header)).toEqual(['No', '氏名', '担当パート']);
  });

  it('代表者のときだけ氏名に注記を付ける', () => {
    const columns = buildStandardGroupColumns(groupOf('members'));
    const name = columns?.find((column) => column.fieldId === 'member-name');
    expect(name?.format).toBe(
      "${item.field('member-name').value}${item.field('member-representative').value == 'true' ? '(代表者)' : ''}",
    );
  });
});

describe('buildStandardGroupColumns（セットリスト）', () => {
  const columns = buildStandardGroupColumns(groupOf('setlist'));

  it('曲・パート・マイク・各備考を列にする', () => {
    expect(columns?.map((column) => column.header)).toEqual([
      'No',
      '曲 / MC',
      '使うパート',
      '使うマイク',
      'PAへの要望',
      '照明への要望',
      '備考',
    ]);
  });

  it('MCの項目は曲名の代わりに MC と出す', () => {
    const song = columns?.find((column) => column.fieldId === 'song');
    expect(song?.format).toBe("${item.variant == 'mc-entry' ? 'MC' : item.field('song').values[0]}");
  });

  it('マイクは曲とMCで参照先を切り替え、メインには注記を付けて改行で並べる', () => {
    const mic = columns?.find((column) => column.header === '使うマイク');
    expect(mic?.format).toBe(
      "${item.variant == 'mc-entry'"
      + " ? mapJoin(item.group('mc-mics').items, (m) -> m.field('mc-mic-member').value"
      + " + (m.field('mc-mic-main').value == 'true' ? '(メイン)' : ''), '\\n')"
      + " : mapJoin(item.group('song-mics').items, (m) -> m.field('mic-member').value"
      + " + (m.field('mic-main-vocal').value == 'true' ? '(メイン)' : ''), '\\n')}",
    );
  });

  it('列幅の合計は 1 になる', () => {
    const total = (columns ?? []).reduce((sum, column) => sum + column.widthRatio, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe('buildStandardGroupColumns（既定フォーム以外）', () => {
  it('見覚えのないグループには専用の列構成を返さない', () => {
    const config: SettingSheetConfigResponse = {
      title: '',
      description: '',
      submitButtonLabel: '送信する',
      publicSubmissionEnabled: true,
      blocks: [block('crew', 'REPEATABLE_GROUP', 'スタッフ', { fields: [block('crew-name', 'SHORT_TEXT', '名前')] })],
    };
    const group = buildFieldCatalog(config).groups[0];
    expect(buildStandardGroupColumns(group)).toBeNull();
  });
});
