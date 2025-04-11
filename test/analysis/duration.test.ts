import { describe, expect, it } from 'vitest';
import {
  durationBetween,
  queueDurationMs,
  runDurationMs,
} from '../../src/analysis/duration.js';
import { parseRunDataset } from '../../src/input/run-schema.js';
import { runFixture } from '../fixtures/run-data.js';

describe('duration metrics', () => {
  const run = parseRunDataset(runFixture).runs[0];

  it('calculates complete workflow runtime', () => {
    expect(run === undefined ? 0 : runDurationMs(run)).toBe(8 * 60 * 1_000);
  });

  it('separates scheduler queue time', () => {
    expect(run === undefined ? 0 : queueDurationMs(run)).toBe(30_000);
  });

  it('accepts equivalent timestamps with different offsets', () => {
    expect(durationBetween('2025-01-01T12:00:00+03:30', '2025-01-01T09:00:30Z')).toBe(30_000);
  });

  it('rejects reversed and malformed boundaries', () => {
    expect(() => durationBetween('2025-01-02T00:00:00Z', '2025-01-01T00:00:00Z')).toThrow(RangeError);
    expect(() => durationBetween('later', 'never')).toThrow(TypeError);
  });
});
