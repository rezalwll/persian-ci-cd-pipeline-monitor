import { describe, expect, it } from 'vitest';
import { parseRunDataset } from '../../src/input/run-schema.js';
import { runFixture } from '../fixtures/run-data.js';

describe('parseRunDataset', () => {
  it('maps API field names to the domain model', () => {
    const result = parseRunDataset(runFixture);

    expect(result.repository).toBe('acme/payments');
    expect(result.runs[0]?.workflowPath).toBe('.github/workflows/release.yml');
    expect(result.runs[0]?.jobs[0]?.runnerName).toBe('GitHub Actions 2');
  });

  it('rejects repositories without an owner', () => {
    expect(() => parseRunDataset({ ...runFixture, repository: 'payments' })).toThrow();
  });

  it('rejects incomplete run records', () => {
    const invalidRun = { ...runFixture.runs[0], head_sha: undefined };
    expect(() => parseRunDataset({ ...runFixture, runs: [invalidRun] })).toThrow();
  });
});
