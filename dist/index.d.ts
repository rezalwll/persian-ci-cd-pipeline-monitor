import { R as RunDataset } from './action-DySg-Ekl.js';
export { A as ActionInputs, W as WorkflowJob, a as WorkflowRun, p as parseActionInputs, r as runAction } from './action-DySg-Ekl.js';

type Severity = 'notice' | 'warning' | 'error';
type MetricKey = 'successRate' | 'durationP95Ms' | 'queueP95Ms' | 'flakyJobRate';
interface MetricValue {
    readonly key: MetricKey;
    readonly value: number;
    readonly unit: 'percent' | 'milliseconds';
    readonly sampleSize: number;
}
interface Finding {
    readonly ruleId: string;
    readonly metric: MetricKey;
    readonly severity: Severity;
    readonly message: string;
    readonly actual: number;
    readonly threshold: number;
    readonly helpUri?: string | undefined;
}
interface AnalysisResult {
    readonly repository: string;
    readonly evaluatedAt: string;
    readonly window: {
        readonly from: string;
        readonly to: string;
    };
    readonly metrics: Readonly<Record<MetricKey, MetricValue>>;
    readonly findings: readonly Finding[];
    readonly passed: boolean;
}

type Comparison = 'atLeast' | 'atMost';
interface PolicyRule {
    readonly metric: MetricKey;
    readonly comparison: Comparison;
    readonly threshold: number;
    readonly severity: Severity;
}
interface ReleasePolicy {
    readonly version: 1;
    readonly minimumSampleSize: number;
    readonly includeBranches: readonly string[];
    readonly excludeEvents: readonly string[];
    readonly rules: readonly PolicyRule[];
}

type OutputFormat = 'text' | 'json' | 'markdown' | 'sarif' | 'github';
interface AnalyzeRequest {
    readonly dataset: RunDataset;
    readonly policy?: ReleasePolicy;
    readonly format?: OutputFormat;
    readonly color?: boolean;
}
interface CommandResult {
    readonly output: string;
    readonly exitCode: 0 | 1;
}
declare function analyze(request: AnalyzeRequest): CommandResult;

interface MetricDelta {
    readonly metric: MetricKey;
    readonly baseline: number;
    readonly current: number;
    readonly changePercent: number;
    readonly regressed: boolean;
}
interface ComparisonResult {
    readonly repository: string;
    readonly tolerancePercent: number;
    readonly deltas: readonly MetricDelta[];
    readonly passed: boolean;
}
declare function compareResults(baseline: AnalysisResult, current: AnalysisResult, tolerancePercent?: number): ComparisonResult;
declare function renderComparisonMarkdown(result: ComparisonResult): string;

declare function evaluateDataset(dataset: RunDataset, policy?: ReleasePolicy): AnalysisResult;

declare function appendGitHubStepSummary(markdown: string, path?: string | undefined): Promise<boolean>;

declare function parsePolicy(source: string, filename?: string): ReleasePolicy;

export { type AnalysisResult, type AnalyzeRequest, type CommandResult, type ComparisonResult, type Finding, type MetricDelta, type MetricValue, type OutputFormat, type ReleasePolicy, RunDataset, analyze, appendGitHubStepSummary, compareResults, evaluateDataset, parsePolicy, renderComparisonMarkdown };
