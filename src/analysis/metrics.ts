import type { MetricValue } from '../domain/result.js';
import type { WorkflowRun } from '../domain/run.js';
import { runDurationMs } from './duration.js';
import { groupRunAttempts } from './group-runs.js';
import { percentile } from './statistics.js';

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
    value: durations.length === 0 ? 0 : percentile(durations, 0.95),
    unit: 'milliseconds',
    sampleSize: durations.length,
  };
}
