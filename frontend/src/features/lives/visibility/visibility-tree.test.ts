import { describe, expect, it } from 'vitest';

import { createBlockTemplate, type SettingSheetBlock } from '../types/live-types';
import { isVisibleIn, toFieldValue, VISIBILITY_SCOPES } from './visibility-scopes';
import { countVisibleLeafBlocks, setAllVisibility, setBlockVisibility } from './visibility-tree';

const [sharedScope, adminScope, formScope] = VISIBILITY_SCOPES;

function leaf(id: string, overrides: Partial<SettingSheetBlock> = {}): SettingSheetBlock {
  return { ...createBlockTemplate('SHORT_TEXT'), id, label: id, ...overrides };
}

function section(id: string, fields: SettingSheetBlock[]): SettingSheetBlock {
  return { ...createBlockTemplate('SECTION'), id, label: id, fields };
}

describe('isVisibleIn', () => {
  it('falls back to publicVisible when adminVisible is missing', () => {
    const legacyVisible = leaf('a', { publicVisible: true, adminVisible: undefined });
    const legacyHidden = leaf('b', { publicVisible: false, adminVisible: undefined });

    expect(isVisibleIn(legacyVisible, adminScope)).toBe(true);
    expect(isVisibleIn(legacyHidden, adminScope)).toBe(false);
  });

  it('keeps admin independent from shared once set', () => {
    const block = leaf('a', { publicVisible: false, adminVisible: true });

    expect(isVisibleIn(block, sharedScope)).toBe(false);
    expect(isVisibleIn(block, adminScope)).toBe(true);
  });

  it('inverts hidden for the form scope', () => {
    expect(isVisibleIn(leaf('a', { hidden: false }), formScope)).toBe(true);
    expect(isVisibleIn(leaf('b', { hidden: true }), formScope)).toBe(false);
    expect(toFieldValue(formScope, true)).toBe(false);
  });
});

describe('setBlockVisibility', () => {
  const blocks = [section('sec', [leaf('a'), leaf('b')])];

  it('applies the change to every descendant', () => {
    const next = setBlockVisibility(blocks, 'sec', adminScope.field, true);

    expect(next[0].fields.map((field) => field.adminVisible)).toEqual([true, true]);
    expect(next[0].adminVisible).toBe(true);
  });

  it('turns the parent on when any child is on', () => {
    const next = setBlockVisibility(blocks, 'a', adminScope.field, true);

    expect(next[0].adminVisible).toBe(true);
    expect(next[0].fields[1].adminVisible).toBe(false);
  });

  it('turns the parent off only when every child is off', () => {
    const allOn = setBlockVisibility(blocks, 'sec', adminScope.field, true);
    const oneOff = setBlockVisibility(allOn, 'a', adminScope.field, false);

    expect(oneOff[0].adminVisible).toBe(true);

    const allOff = setBlockVisibility(oneOff, 'b', adminScope.field, false);
    expect(allOff[0].adminVisible).toBe(false);
  });

  it('does not touch the other scopes', () => {
    const next = setBlockVisibility(blocks, 'a', adminScope.field, true);

    expect(next[0].fields[0].publicVisible).toBe(false);
    expect(next[0].fields[0].hidden).toBe(false);
  });
});

describe('setAllVisibility', () => {
  it('switches every leaf at once', () => {
    const blocks = [section('sec', [leaf('a'), leaf('b')]), leaf('c')];

    const allShared = setAllVisibility(blocks, sharedScope.field, true);
    expect(countVisibleLeafBlocks(allShared, sharedScope)).toBe(3);

    const noneShared = setAllVisibility(allShared, sharedScope.field, false);
    expect(countVisibleLeafBlocks(noneShared, sharedScope)).toBe(0);
  });
});
