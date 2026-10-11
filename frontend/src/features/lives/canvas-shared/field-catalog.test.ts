/** Verifies the readable field catalog handles user-defined forms (sections,
 *  groups, variants, nesting) without leaking UUIDs into the visible label. */
import { describe, expect, it } from 'vitest';

import type { SettingSheetBlock, SettingSheetConfigResponse } from '../types/live-types';
import { buildFieldCatalog } from './field-catalog';

const baseLayout = { width: 'half' as const, optionColumns: 1, optionFitContent: false };

function leaf(id: string, type: SettingSheetBlock['type'], label: string): SettingSheetBlock {
  return {
    id,
    type,
    label,
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
    layout: baseLayout,
    optionSource: null,
    duplicateDetectionRole: '',
  };
}

function section(id: string, label: string, children: SettingSheetBlock[]): SettingSheetBlock {
  return { ...leaf(id, 'SECTION', label), fields: children };
}

function group(id: string, label: string, fields: SettingSheetBlock[]): SettingSheetBlock {
  return {
    ...leaf(id, 'REPEATABLE_GROUP', label),
    fields,
    appearance: 'subtle',
    itemAppearance: 'outline',
    minItems: 1,
  };
}

function configOf(blocks: SettingSheetBlock[]): SettingSheetConfigResponse {
  return {
    title: 'test',
    description: '',
    submitButtonLabel: '送信',
    publicSubmissionEnabled: true,
    blocks,
  };
}

describe('buildFieldCatalog', () => {
  it('returns empty catalog for null config', () => {
    const out = buildFieldCatalog(null);
    expect(out.fields).toEqual([]);
    expect(out.groups).toEqual([]);
    expect(out.labelById.size).toBe(0);
  });

  it('flattens top-level scalar fields with type labels', () => {
    const config = configOf([
      leaf('band-name', 'SHORT_TEXT', 'バンド名'),
      leaf('detail', 'LONG_TEXT', '備考'),
    ]);
    const catalog = buildFieldCatalog(config);
    expect(catalog.fields).toHaveLength(2);
    expect(catalog.fields[0]).toMatchObject({ id: 'band-name', label: 'バンド名', typeLabel: 'テキスト' });
    expect(catalog.fields[1]).toMatchObject({ id: 'detail', label: '備考', typeLabel: '長文' });
  });

  it('descends into sections and surfaces nested fields at top level', () => {
    const config = configOf([
      section('s1', '基本', [leaf('band-name', 'SHORT_TEXT', 'バンド名')]),
    ]);
    const catalog = buildFieldCatalog(config);
    expect(catalog.fields).toHaveLength(1);
    expect(catalog.fields[0].pathLabel).toBe('基本 > バンド名');
  });

  it('groups repeatable fields under their parent group entry', () => {
    const config = configOf([
      group('members', '出演者', [
        leaf('member-name', 'SHORT_TEXT', '氏名'),
        leaf('member-parts', 'MULTI_SELECT', 'パート'),
      ]),
    ]);
    const catalog = buildFieldCatalog(config);
    expect(catalog.fields).toHaveLength(0);
    expect(catalog.groups).toHaveLength(1);
    expect(catalog.groups[0]).toMatchObject({ id: 'members', label: '出演者' });
    expect(catalog.groups[0].fields.map((f) => f.label)).toEqual(['氏名', 'パート']);
  });

  it('unions fields across variants and exposes per-variant lists', () => {
    const songVariant = { id: 'song', label: '曲', fields: [leaf('song-title', 'SHORT_TEXT', '曲名')] };
    const mcVariant = { id: 'mc', label: 'MC', fields: [leaf('mc-content', 'LONG_TEXT', '内容')] };
    const setlist: SettingSheetBlock = {
      ...group('setlist', 'セットリスト', []),
      variants: [songVariant, mcVariant],
    };
    const catalog = buildFieldCatalog(configOf([setlist]));
    const setlistGroup = catalog.groups.find((g) => g.id === 'setlist');
    expect(setlistGroup?.fields.map((f) => f.label).sort()).toEqual(['内容', '曲名']);
    expect(setlistGroup?.variants.map((v) => v.label)).toEqual(['曲', 'MC']);
    expect(setlistGroup?.variants[0].fields.map((f) => f.id)).toEqual(['song-title']);
    expect(setlistGroup?.variants[1].fields.map((f) => f.id)).toEqual(['mc-content']);
    // Fields keep track of which variant(s) they appeared in.
    const songTitle = setlistGroup?.fields.find((f) => f.id === 'song-title');
    expect(songTitle?.variantIds).toEqual(['song']);
  });

  it('captures nested repeatable groups under their parent', () => {
    const innerLeaf = leaf('mic-name', 'SHORT_TEXT', 'マイク');
    const innerGroup = group('mics', 'マイク', [innerLeaf]);
    const outer = group('members', '出演者', [leaf('member-name', 'SHORT_TEXT', '氏名'), innerGroup]);
    const catalog = buildFieldCatalog(configOf([outer]));
    const members = catalog.groups.find((g) => g.id === 'members');
    expect(members?.childGroups).toHaveLength(1);
    expect(members?.childGroups[0]).toMatchObject({ id: 'mics', label: 'マイク' });
    expect(members?.childGroups[0].fields.map((f) => f.id)).toEqual(['mic-name']);
    expect(catalog.labelById.get('mic-name')?.path).toBe('出演者 > マイク > マイク');
  });

  it('builds labelById map covering both top-level fields and group children', () => {
    const config = configOf([
      leaf('band-name', 'SHORT_TEXT', 'バンド名'),
      group('members', '出演者', [leaf('member-name', 'SHORT_TEXT', '氏名')]),
    ]);
    const catalog = buildFieldCatalog(config);
    expect(catalog.labelById.get('band-name')).toEqual({ label: 'バンド名', path: 'バンド名' });
    expect(catalog.labelById.get('member-name')).toEqual({ label: '氏名', path: '出演者 > 氏名' });
    expect(catalog.labelById.get('members')).toEqual({ label: '出演者', path: '出演者' });
  });
});
