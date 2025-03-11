import { describe, expect, it } from 'vitest';
import { median } from '../../src/analysis/statistics.js';

describe('median', () => {
  it('selects the middle value for odd samples', () => {
    expect(median([9, 1, 5])).toBe(5);
  });

  it('averages the middle pair for even samples', () => {
    expect(median([1, 9, 3, 5])).toBe(4);
  });

  it('keeps the source sample in its original order', () => {
    const source = [4, 2, 3];
    median(source);
    expect(source).toEqual([4, 2, 3]);
  });

  it('rejects empty and non-finite samples', () => {
    expect(() => median([])).toThrow(RangeError);
    expect(() => median([1, Number.NaN])).toThrow(TypeError);
  });
});
