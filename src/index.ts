export { analyze, type AnalyzeRequest, type CommandResult, type OutputFormat } from './commands/analyze.js';
export {
  compareResults,
  renderComparisonMarkdown,
  type ComparisonResult,
  type MetricDelta,
} from './commands/compare.js';
export { evaluateDataset } from './analysis/evaluate.js';
export { appendGitHubStepSummary } from './report/step-summary.js';
export { parseActionInputs, runAction, type ActionInputs } from './action.js';
export { parsePolicy } from './config/parse-policy.js';
export type { ReleasePolicy } from './domain/policy.js';
export type { AnalysisResult, Finding, MetricValue } from './domain/result.js';
export type { RunDataset, WorkflowJob, WorkflowRun } from './domain/run.js';
