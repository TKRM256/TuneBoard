/** Verifies the snippet picker emits valid JEXL expressions covering live
 *  variables, fields, repeatable groups (with nested groups), and helpers. */
import { describe, expect, it } from 'vitest';

import type { SettingSheetBlock, SettingSheetConfigResponse } from '../../types/live-types';
import { buildFieldCatalog } from '../field-catalog';
import { buildSnippetGroups } from './expression-snippets';

const layout = { width: 'half' as const, optionColumns: 1, optionFitContent: false };

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
    layout,
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

describe('buildSnippetGroups', () => {
  it('always emits live & helper sections', () => {
    const groups = buildSnippetGroups(buildFieldCatalog(null));
    const titles = groups.map((g) => g.title);
    expect(titles).toContain('ライブ・提出情報');
    expect(titles).toContain('ヘルパー関数');
  });

  it('emits a section per repeatable group with join/count helpers', () => {
    const config = configOf([
      group('members', '出演者', [leaf('member-name', '氏名'), leaf('member-parts', 'パート')]),
    ]);
    const groups = buildSnippetGroups(buildFieldCatalog(config));
    const membersGroup = groups.find((g) => g.title.startsWith('出演者'));
    expect(membersGroup).toBeDefined();
    const expressions = membersGroup!.entries.map((e) => e.expression);
    expect(expressions).toContain("count(groups['members'])");
    expect(expressions).toContain("joinField(groups['members'], 'member-name', ', ')");
    expect(expressions).toContain("joinField(groups['members'], 'member-parts', ', ')");
  });

  it('emits sections for nested repeatable groups using item().group() chain', () => {
    const config = configOf([
      group('members', '出演者', [
        leaf('member-name', '氏名'),
        group('mics', 'マイク', [leaf('mic-name', 'マイク')]),
      ]),
    ]);
    const groups = buildSnippetGroups(buildFieldCatalog(config));
    const micsGroup = groups.find((g) => g.title.startsWith('マイク'));
    expect(micsGroup).toBeDefined();
    const expressions = micsGroup!.entries.map((e) => e.expression);
    // Nested group reference must traverse through items[0].group(...)
    expect(expressions.some((e) => e.includes("groups['members'].items[0].group('mics')"))).toBe(true);
  });

  it('exposes single-field section when scalar fields exist', () => {
    const config = configOf([leaf('band-name', 'バンド名')]);
    const groups = buildSnippetGroups(buildFieldCatalog(config));
    const fieldsGroup = groups.find((g) => g.title === 'フォーム項目（単発）');
    expect(fieldsGroup?.entries[0]).toMatchObject({
      label: 'バンド名',
      expression: "fields['band-name'].value",
    });
  });
});
