import type { MetricValue } from '../domain/result.js';
import type { WorkflowRun } from '../domain/run.js';
import { queueDurationMs, runDurationMs } from './duration.js';
import { groupRunAttempts } from './group-runs.js';
import { percentile } from './statistics.js';

const P95_QUANTILE = 0.95;

function percent(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : (numerator / denominator) * 100;
}

function terminalRuns(runs: readonly WorkflowRun[]): readonly WorkflowRun[] {
  return groupRunAttempts(runs).flatMap((group) => group.attempts.at(-1) ?? []);
}

export function calculateSuccessRate(runs: readonly WorkflowRun[]): MetricValue {
  const terminal = terminalRuns(runs);
  const successful = terminal.filter((run) => run.conclusion === 'success').length;

  return {
    key: 'successRate',
    value: percent(successful, terminal.length),
    unit: 'percent',
    sampleSize: terminal.length,
  };
}

export function calculateDurationP95(runs: readonly WorkflowRun[]): MetricValue {
  const durations = terminalRuns(runs).map(runDurationMs);

  return {
    key: 'durationP95Ms',
    value: durations.length === 0 ? 0 : percentile(durations, P95_QUANTILE),
    unit: 'milliseconds',
    sampleSize: durations.length,
  };
}

export function calculateFlakyJobRate(runs: readonly WorkflowRun[]): MetricValue {
  const groups = groupRunAttempts(runs);
  const flakyGroups = groups.filter((group) => {
    const terminal = group.attempts.at(-1);
    const priorAttempts = group.attempts.slice(0, -1);
    return terminal?.conclusion === 'success'
      && priorAttempts.some((attempt) => attempt.conclusion === 'failure' || attempt.conclusion === 'timed_out');
  });

  return {
    key: 'flakyJobRate',
    value: percent(flakyGroups.length, groups.length),
    unit: 'percent',
    sampleSize: groups.length,
  };
}

export function calculateQueueP95(runs: readonly WorkflowRun[]): MetricValue {
  const queueTimes = terminalRuns(runs).map(queueDurationMs);

  return {
    key: 'queueP95Ms',
    value: queueTimes.length === 0 ? 0 : percentile(queueTimes, P95_QUANTILE),
    unit: 'milliseconds',
    sampleSize: queueTimes.length,
  };
}
