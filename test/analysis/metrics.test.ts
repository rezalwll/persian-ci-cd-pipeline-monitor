import { describe, expect, it } from 'vitest';
import {
  calculateDurationP95,
  calculateFlakyJobRate,
  calculateQueueP95,
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

describe('calculateQueueP95', () => {
  it('measures scheduler delay independently from runtime', () => {
    const metric = calculateQueueP95([
      makeRun({ headSha: 'queue-one', runStartedAt: '2025-01-01T10:00:10Z' }),
      makeRun({ headSha: 'queue-two', runStartedAt: '2025-01-01T10:00:30Z' }),
      makeRun({ headSha: 'queue-three', runStartedAt: '2025-01-01T10:01:00Z' }),
    ]);

    expect(metric.value).toBe(57_000);
    expect(metric.unit).toBe('milliseconds');
  });

  it('reports an empty queue sample without throwing', () => {
    expect(calculateQueueP95([]).sampleSize).toBe(0);
  });
});

describe('calculateFlakyJobRate', () => {
  it('counts failed attempts that recover on the same revision', () => {
    const metric = calculateFlakyJobRate([
      makeRun({ id: 1, attempt: 1, conclusion: 'failure' }),
      makeRun({ id: 2, attempt: 2, conclusion: 'success' }),
      makeRun({ id: 3, headSha: 'stable-sha', conclusion: 'success' }),
    ]);

    expect(metric.value).toBe(50);
    expect(metric.sampleSize).toBe(2);
  });

  it('does not label persistent failure as flakiness', () => {
    expect(calculateFlakyJobRate([
      makeRun({ attempt: 1, conclusion: 'failure' }),
      makeRun({ attempt: 2, conclusion: 'failure' }),
    ]).value).toBe(0);
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
