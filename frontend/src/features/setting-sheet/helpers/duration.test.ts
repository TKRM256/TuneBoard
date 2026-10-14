import { describe, expect, it } from 'vitest';

import { composeDuration, isValidDuration, splitDuration } from './duration';

describe('duration helpers', () => {
  it('accepts minutes:seconds with two-digit seconds only', () => {
    expect(isValidDuration('3:45')).toBe(true);
    expect(isValidDuration('12:05')).toBe(true);
    expect(isValidDuration('3:60')).toBe(false);
    expect(isValidDuration('3:5')).toBe(false);
    expect(isValidDuration('3分45秒')).toBe(false);
  });

  it('pads seconds when composing from the two inputs', () => {
    expect(composeDuration('3', '5')).toBe('3:05');
    expect(composeDuration('', '45')).toBe('0:45');
    expect(composeDuration('', '')).toBe('');
  });

  it('keeps non-numeric input so validation can flag it', () => {
    expect(composeDuration('a', '1')).toBe('a:1');
    expect(isValidDuration(composeDuration('a', '1'))).toBe(false);
  });

  it('splits stored values back into the inputs', () => {
    expect(splitDuration('3:05')).toEqual({ minutes: '3', seconds: '05' });
    expect(splitDuration('')).toEqual({ minutes: '', seconds: '' });
  });
});
