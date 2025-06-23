import { describe, expect, it } from 'vitest';
import { selectRuns } from '../../src/analysis/select-runs.js';
import { defaultPolicy } from '../../src/domain/policy.js';
import { makeRun } from '../fixtures/run-data.js';

describe('selectRuns', () => {
  it('keeps configured branches and ignores excluded events', () => {
    const selected = selectRuns([
      makeRun({ id: 1, headBranch: 'feature/slow' }),
      makeRun({ id: 2, event: 'workflow_dispatch' }),
      makeRun({ id: 3, headBranch: 'main', event: 'push' }),
      makeRun({ id: 4, headBranch: 'master', event: 'pull_request' }),
    ], defaultPolicy);

    expect(selected.map((run) => run.id)).toEqual([3, 4]);
  });

  it('sorts by creation time and then stable run id', () => {
    const selected = selectRuns([
      makeRun({ id: 4, createdAt: '2025-01-03T00:00:00Z' }),
      makeRun({ id: 2, createdAt: '2025-01-01T00:00:00Z' }),
      makeRun({ id: 1, createdAt: '2025-01-01T00:00:00Z' }),
    ], defaultPolicy);

    expect(selected.map((run) => run.id)).toEqual([1, 2, 4]);
  });
});
