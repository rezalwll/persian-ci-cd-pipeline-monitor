import type { ReleasePolicy } from '../domain/policy.js';
import type { WorkflowRun } from '../domain/run.js';

export function selectRuns(
  runs: readonly WorkflowRun[],
  policy: ReleasePolicy,
): readonly WorkflowRun[] {
  const branches = new Set(policy.includeBranches);
  const excludedEvents = new Set(policy.excludeEvents);

  return runs
    .filter((run) => branches.has(run.headBranch))
    .filter((run) => !excludedEvents.has(run.event))
    .toSorted((left, right) => {
      const chronological = Date.parse(left.createdAt) - Date.parse(right.createdAt);
      return chronological === 0 ? left.id - right.id : chronological;
    });
}
