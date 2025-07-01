import { defaultPolicy, type PolicyRule, type ReleasePolicy } from '../domain/policy.js';
import type { AnalysisResult, Finding, MetricValue } from '../domain/result.js';
import type { RunDataset, WorkflowRun } from '../domain/run.js';
import {
  calculateDurationP95,
  calculateFlakyJobRate,
  calculateQueueP95,
  calculateSuccessRate,
} from './metrics.js';
import { selectRuns } from './select-runs.js';

function violates(rule: PolicyRule, metric: MetricValue): boolean {
  return rule.comparison === 'atLeast'
    ? metric.value < rule.threshold
    : metric.value > rule.threshold;
}

function findingFor(rule: PolicyRule, metric: MetricValue, minimumSampleSize: number): Finding | undefined {
  if (metric.sampleSize < minimumSampleSize) {
    return {
      ruleId: `sample.${rule.metric}`,
      metric: rule.metric,
      severity: 'notice',
      message: `${rule.metric} needs ${minimumSampleSize} observations; received ${metric.sampleSize}`,
      actual: metric.sampleSize,
      threshold: minimumSampleSize,
      helpUri: 'https://github.com/rezalwll/release-lens#sample-size',
    };
  }

  if (!violates(rule, metric)) {
    return undefined;
  }

  const direction = rule.comparison === 'atLeast' ? 'at least' : 'at most';
  return {
    ruleId: `budget.${rule.metric}`,
    metric: rule.metric,
    severity: rule.severity,
    message: `${rule.metric} is ${metric.value}; expected ${direction} ${rule.threshold}`,
    actual: metric.value,
    threshold: rule.threshold,
    helpUri: `https://github.com/rezalwll/release-lens#${rule.metric.toLowerCase()}`,
  };
}

function analysisWindow(runs: readonly WorkflowRun[], fallback: string): AnalysisResult['window'] {
  return {
    from: runs[0]?.createdAt ?? fallback,
    to: runs.at(-1)?.updatedAt ?? fallback,
  };
}

export function evaluateDataset(
  dataset: RunDataset,
  policy: ReleasePolicy = defaultPolicy,
): AnalysisResult {
  const runs = selectRuns(dataset.runs, policy);
  const metrics = {
    successRate: calculateSuccessRate(runs),
    durationP95Ms: calculateDurationP95(runs),
    queueP95Ms: calculateQueueP95(runs),
    flakyJobRate: calculateFlakyJobRate(runs),
  } as const;
  const findings = policy.rules.flatMap((rule) => {
    const finding = findingFor(rule, metrics[rule.metric], policy.minimumSampleSize);
    return finding === undefined ? [] : [finding];
  });

  return {
    repository: dataset.repository,
    evaluatedAt: dataset.generatedAt,
    window: analysisWindow(runs, dataset.generatedAt),
    metrics,
    findings,
    passed: !findings.some((finding) => finding.severity === 'error'),
  };
}
