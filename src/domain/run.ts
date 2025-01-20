export type RunConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'timed_out'
  | 'skipped'
  | 'neutral'
  | 'action_required';

export type JobConclusion = Exclude<RunConclusion, 'action_required'>;

export interface WorkflowJob {
  readonly id: number;
  readonly name: string;
  readonly conclusion: JobConclusion;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly runnerName?: string;
  readonly attempt?: number;
}

export interface WorkflowRun {
  readonly id: number;
  readonly name: string;
  readonly workflowPath: string;
  readonly headBranch: string;
  readonly headSha: string;
  readonly event: string;
  readonly conclusion: RunConclusion;
  readonly createdAt: string;
  readonly runStartedAt: string;
  readonly updatedAt: string;
  readonly attempt: number;
  readonly jobs: readonly WorkflowJob[];
}

export interface RunDataset {
  readonly repository: string;
  readonly generatedAt: string;
  readonly runs: readonly WorkflowRun[];
}
