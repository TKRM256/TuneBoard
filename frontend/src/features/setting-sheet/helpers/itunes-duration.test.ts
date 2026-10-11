import { describe, expect, it } from 'vitest';

import { approxMinutes } from './itunes-duration';

describe('approxMinutes', () => {
  it('分単位に切り上げる', () => {
    expect(approxMinutes(180_000)).toBe(3);
    expect(approxMinutes(180_900)).toBe(3);
    expect(approxMinutes(181_000)).toBe(4);
  });

  it('長さが分からなければ null', () => {
    expect(approxMinutes(null)).toBeNull();
    expect(approxMinutes(undefined)).toBeNull();
    expect(approxMinutes(0)).toBeNull();
  });
});
