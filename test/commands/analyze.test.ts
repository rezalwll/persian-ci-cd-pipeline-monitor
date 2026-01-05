import { describe, expect, it } from 'vitest';
import { analyze } from '../../src/commands/analyze.js';
import type { RunDataset } from '../../src/domain/run.js';
import { makeRun } from '../fixtures/run-data.js';

function dataset(failures = 0): RunDataset {
  return {
    repository: 'acme/payments',
    generatedAt: '2026-01-01T00:00:00Z',
    runs: Array.from({ length: 5 }, (_, index) => makeRun({
      id: index + 1,
      headSha: `revision-${String(index)}`,
      conclusion: index < failures ? 'failure' : 'success',
    })),
  };
}

describe('analyze command', () => {
  it('returns zero and a passing text report for healthy runs', () => {
    const result = analyze({ dataset: dataset(), format: 'text' });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Verdict: PASS');
  });

  it('returns one when an error-level budget fails', () => {
    const result = analyze({ dataset: dataset(1), format: 'json' });
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.output)).toHaveProperty('result.passed', false);
  });

  it.each(['markdown', 'sarif', 'github'] as const)('supports the %s reporter', (format) => {
    expect(analyze({ dataset: dataset(1), format }).output.length).toBeGreaterThan(0);
  });
});
