/** Sanity checks for the default canvas seed produced from a form config.
 *  Mirrors the backend DefaultCanvasFactory so client/server starting layouts
 *  stay aligned. */
import { describe, expect, it } from 'vitest';

import type { SettingSheetBlock, SettingSheetConfigResponse } from '../types/live-types';
import { buildDefaultCanvas } from './default-canvas';

const baseLayout = { width: 'half' as const, optionColumns: 1, optionFitContent: false };

function leaf(id: string, label: string): SettingSheetBlock {
  return {
    id,
    type: 'SHORT_TEXT',
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

function group(id: string, label: string, fields: SettingSheetBlock[]): SettingSheetBlock {
  return { ...leaf(id, label), type: 'REPEATABLE_GROUP', fields };
}

function configOf(blocks: SettingSheetBlock[]): SettingSheetConfigResponse {
  return { title: 't', description: '', submitButtonLabel: 's', publicSubmissionEnabled: true, blocks };
}

describe('buildDefaultCanvas', () => {
  it('produces a non-empty document even without form config', () => {
    const doc = buildDefaultCanvas(null);
    expect(doc.page.size).toBe('A4');
    expect(doc.page.orientation).toBe('LANDSCAPE');
    expect(doc.elements.length).toBeGreaterThan(0);
    // Always include the live-name title as the first element.
    expect(doc.elements[0]).toMatchObject({ kind: 'text', content: '${live.name}' });
  });

  it('emits a divider and submission-time text for any form', () => {
    const doc = buildDefaultCanvas(null);
    expect(doc.elements.some((e) => e.kind === 'divider')).toBe(true);
    expect(
      doc.elements.some((e) => e.kind === 'text' && e.content.includes('submission.submittedAt')),
    ).toBe(true);
  });

  it('adds a fields KV table when the config exposes scalar fields', () => {
    const config = configOf([leaf('band-name', 'バンド名')]);
    const doc = buildDefaultCanvas(config);
    const table = doc.elements.find((e) => e.kind === 'table' && e.source.kind === 'fields');
    expect(table).toBeDefined();
    if (table && table.kind === 'table' && table.source.kind === 'fields') {
      expect(table.source.fields).toEqual([{ fieldId: 'band-name', fallbackLabel: 'バンド名' }]);
    }
  });

  it('adds one group table per repeatable group with a No column', () => {
    const config = configOf([
      group('members', '出演者', [leaf('member-name', '氏名'), leaf('member-parts', 'パート')]),
    ]);
    const doc = buildDefaultCanvas(config);
    const groupTables = doc.elements.filter(
      (e) => e.kind === 'table' && e.source.kind === 'group',
    );
    expect(groupTables).toHaveLength(1);
    if (groupTables[0].kind === 'table') {
      const cols = groupTables[0].columns.map((c) => c.fieldId);
      expect(cols).toContain('__index__');
      expect(cols).toContain('member-name');
      expect(cols).toContain('member-parts');
    }
  });
});
