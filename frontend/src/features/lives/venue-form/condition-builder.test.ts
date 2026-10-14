import { describe, expect, it } from 'vitest';

import { buildCondition, operatorsFor, quote } from './condition-builder';

describe('buildCondition', () => {
  it('checks a selected option on a top-level field', () => {
    expect(buildCondition({ fieldId: 'parts', operator: 'includes', value: 'Bass' }))
      .toBe("${contains(fields['parts'].values, 'Bass')}");
  });

  it('checks whether any member of a group matches', () => {
    expect(buildCondition({ fieldId: 'member-parts', groupId: 'members', operator: 'includes', value: 'Drum' }))
      .toBe("${count(filter(groups['members'].items, (m) -> contains(m.field('member-parts').values, 'Drum'))) > 0}");
  });

  it('builds equality, filled and boolean checks', () => {
    expect(buildCondition({ fieldId: 'pa', operator: 'equals', value: '有' })).toBe("${fields['pa'].value == '有'}");
    expect(buildCondition({ fieldId: 'pa', operator: 'filled' })).toBe("${count(fields['pa'].values) > 0}");
    expect(buildCondition({ fieldId: 'rep', operator: 'isTrue' })).toBe("${fields['rep'].value == 'true'}");
    expect(buildCondition({ fieldId: 'rep', operator: 'isFalse' })).toBe("${fields['rep'].value == 'false'}");
  });

  it('checks only the given item of a group, guarding against missing items', () => {
    expect(buildCondition({ fieldId: 'song-parts', groupId: 'setlist', itemIndex: 2, operator: 'includes', value: 'Bass' }))
      .toBe("${count(groups['setlist'].items) >= 2 && contains(groups['setlist'].items[1].field('song-parts').values, 'Bass')}");
  });

  it('escapes quotes in option values', () => {
    expect(quote(`B.D 22"`)).toBe(`'B.D 22"'`);
    expect(quote("Rock'n Roll")).toBe("'Rock\\'n Roll'");
  });

  it('offers operators that fit the field type', () => {
    expect(operatorsFor('MULTI_SELECT')).toEqual(['includes', 'filled']);
    expect(operatorsFor('BOOLEAN')).toEqual(['isTrue', 'isFalse']);
    expect(operatorsFor('SHORT_TEXT')).toEqual(['equals', 'filled']);
  });
});
