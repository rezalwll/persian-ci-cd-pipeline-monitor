import type { WorkflowRun } from '../domain/run.js';

export interface RunAttemptGroup {
  readonly key: string;
  readonly workflowPath: string;
  readonly headSha: string;
  readonly attempts: readonly WorkflowRun[];
}

function attemptKey(run: WorkflowRun): string {
  return `${run.workflowPath}:${run.headSha}`;
}

export function groupRunAttempts(runs: readonly WorkflowRun[]): readonly RunAttemptGroup[] {
  const grouped = new Map<string, WorkflowRun[]>();

  for (const run of runs) {
    const key = attemptKey(run);
    const attempts = grouped.get(key) ?? [];
    attempts.push(run);
    grouped.set(key, attempts);
  }

  return [...grouped.entries()]
    .map(([key, attempts]) => ({
      key,
      workflowPath: attempts[0]?.workflowPath ?? '',
      headSha: attempts[0]?.headSha ?? '',
      attempts: [...attempts].sort((left, right) => left.attempt - right.attempt),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}
