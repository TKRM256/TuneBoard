import { describe, expect, it } from 'vitest';

import { lcsMatches } from './lcs';

describe('lcsMatches', () => {
  it('共通部分列の位置を対応付ける', () => {
    expect(lcsMatches(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual([[0, 0], [2, 2]]);
  });

  it('片方が空なら対応は無い', () => {
    expect(lcsMatches([], ['a'])).toEqual([]);
  });

  it('並び替えは片方だけを対応付ける', () => {
    expect(lcsMatches(['a', 'b'], ['b', 'a'])).toEqual([[1, 0]]);
  });
});
