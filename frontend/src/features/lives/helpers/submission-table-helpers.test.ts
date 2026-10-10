import { describe, expect, it } from 'vitest';

import { createBlockTemplate, type SettingSheetBlock, type SettingSheetConfigResponse } from '../types/live-types';
import { collectColumns } from './submission-table-helpers';

function leaf(id: string, overrides: Partial<SettingSheetBlock> = {}): SettingSheetBlock {
  return { ...createBlockTemplate('SHORT_TEXT'), id, label: id, ...overrides };
}

function configOf(blocks: SettingSheetBlock[]): SettingSheetConfigResponse {
  return { title: '', description: '', submitButtonLabel: '送信する', publicSubmissionEnabled: true, blocks };
}

describe('collectColumns', () => {
  it('separates the admin scope from the shared scope', () => {
    const config = configOf([
      leaf('shared-only', { publicVisible: true, adminVisible: false }),
      leaf('admin-only', { publicVisible: false, adminVisible: true }),
      leaf('both', { publicVisible: true, adminVisible: true }),
    ]);

    expect(collectColumns(config, 'shared').map((column) => column.id)).toEqual(['shared-only', 'both']);
    expect(collectColumns(config, 'admin').map((column) => column.id)).toEqual(['admin-only', 'both']);
  });

  it('falls back to publicVisible for legacy blocks without adminVisible', () => {
    const config = configOf([
      leaf('legacy-visible', { publicVisible: true, adminVisible: undefined }),
      leaf('legacy-hidden', { publicVisible: false, adminVisible: undefined }),
    ]);

    expect(collectColumns(config, 'admin').map((column) => column.id)).toEqual(['legacy-visible']);
    expect(collectColumns(config, 'shared').map((column) => column.id)).toEqual(['legacy-visible']);
  });

  it('keeps section labels in the column label but never lists the section itself', () => {
    const config = configOf([
      {
        ...createBlockTemplate('SECTION'),
        id: 'sec',
        label: 'バンド基本情報',
        adminVisible: true,
        fields: [leaf('band-name', { label: 'バンド名', adminVisible: true })],
      },
    ]);

    const columns = collectColumns(config, 'admin');
    expect(columns).toHaveLength(1);
    expect(columns[0].label).toBe('バンド基本情報 / バンド名');
    expect(columns[0].path).toEqual(['band-name']);
  });
});
