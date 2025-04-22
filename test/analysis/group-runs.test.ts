import { describe, expect, it } from 'vitest';
import { groupRunAttempts } from '../../src/analysis/group-runs.js';
import { makeRun } from '../fixtures/run-data.js';

describe('groupRunAttempts', () => {
  it('coalesces reruns of the same workflow revision', () => {
    const groups = groupRunAttempts([
      makeRun({ id: 2, attempt: 2, conclusion: 'success' }),
      makeRun({ id: 1, attempt: 1, conclusion: 'failure' }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.attempts.map((run) => run.attempt)).toEqual([1, 2]);
  });

  it('keeps different workflow files and revisions separate', () => {
    const groups = groupRunAttempts([
      makeRun(),
      makeRun({ workflowPath: '.github/workflows/verify.yml' }),
      makeRun({ headSha: 'fedcba9876543210' }),
    ]);

    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.key)).toEqual([...groups.map((group) => group.key)].sort());
  });
});
