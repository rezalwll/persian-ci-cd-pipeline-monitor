type RunConclusion = 'success' | 'failure' | 'cancelled' | 'timed_out' | 'skipped' | 'neutral' | 'action_required';
type JobConclusion = Exclude<RunConclusion, 'action_required'>;
interface WorkflowJob {
    readonly id: number;
    readonly name: string;
    readonly conclusion: JobConclusion;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly runnerName?: string;
    readonly attempt?: number;
}
interface WorkflowRun {
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
interface RunDataset {
    readonly repository: string;
    readonly generatedAt: string;
    readonly runs: readonly WorkflowRun[];
}

interface ActionInputs {
    readonly repository: string;
    readonly branch: string;
    readonly policyPath?: string;
    readonly failOnBudget: boolean;
    readonly token: string;
}
interface ActionDependencies {
    readonly collect?: (repository: string, branch: string, token: string) => Promise<RunDataset>;
    readonly environment?: NodeJS.ProcessEnv;
}
declare function parseActionInputs(environment?: NodeJS.ProcessEnv): ActionInputs;
declare function runAction(dependencies?: ActionDependencies): Promise<number>;

export { type ActionInputs as A, type RunDataset as R, type WorkflowJob as W, type WorkflowRun as a, type ActionDependencies as b, parseActionInputs as p, runAction as r };
