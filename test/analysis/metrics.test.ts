import { describe, expect, it } from 'vitest';
import { calculateSuccessRate } from '../../src/analysis/metrics.js';
import { makeRun } from '../fixtures/run-data.js';

describe('calculateSuccessRate', () => {
  it('uses the terminal result of each workflow revision', () => {
    const metric = calculateSuccessRate([
      makeRun({ id: 1, attempt: 1, conclusion: 'failure' }),
      makeRun({ id: 2, attempt: 2, conclusion: 'success' }),
      makeRun({ id: 3, headSha: 'different-sha', conclusion: 'failure' }),
    ]);

    expect(metric.value).toBe(50);
    expect(metric.sampleSize).toBe(2);
  });

  it('returns a zero-sized metric for empty history', () => {
    expect(calculateSuccessRate([])).toEqual({
      key: 'successRate',
      value: 0,
      unit: 'percent',
      sampleSize: 0,
    });
  });
});
