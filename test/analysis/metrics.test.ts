import { describe, expect, it } from 'vitest';
import {
  calculateDurationP95,
  calculateSuccessRate,
} from '../../src/analysis/metrics.js';
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

describe('calculateDurationP95', () => {
  it('summarizes terminal execution durations in milliseconds', () => {
    const metric = calculateDurationP95([
      makeRun({ headSha: 'sha-1-000', updatedAt: '2025-01-01T10:10:30Z' }),
      makeRun({ headSha: 'sha-2-000', updatedAt: '2025-01-01T10:20:30Z' }),
      makeRun({ headSha: 'sha-3-000', updatedAt: '2025-01-01T10:30:30Z' }),
    ]);

    expect(metric.value).toBe(29 * 60 * 1_000);
    expect(metric.sampleSize).toBe(3);
  });

  it('returns zero without observations', () => {
    expect(calculateDurationP95([]).value).toBe(0);
  });
});
