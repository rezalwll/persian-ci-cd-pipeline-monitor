import type { AnalysisResult, MetricKey } from '../domain/result.js';

export interface MetricDelta {
  readonly metric: MetricKey;
  readonly baseline: number;
  readonly current: number;
  readonly changePercent: number;
  readonly regressed: boolean;
}

export interface ComparisonResult {
  readonly repository: string;
  readonly tolerancePercent: number;
  readonly deltas: readonly MetricDelta[];
  readonly passed: boolean;
}

const lowerIsBetter = new Set<MetricKey>(['durationP95Ms', 'queueP95Ms', 'flakyJobRate']);

export const DEFAULT_TOLERANCE_PERCENT = 5;

export function compareResults(
  baseline: AnalysisResult,
  current: AnalysisResult,
  tolerancePercent = DEFAULT_TOLERANCE_PERCENT,
): ComparisonResult {
  if (baseline.repository !== current.repository) {
    throw new Error('Baseline and current reports must target the same repository');
  }
  if (tolerancePercent < 0) throw new RangeError('Comparison tolerance cannot be negative');

  const deltas = (Object.keys(current.metrics) as MetricKey[]).map((metric) => {
    const before = baseline.metrics[metric].value;
    const after = current.metrics[metric].value;
    const changePercent = before === 0 ? (after === 0 ? 0 : 100) : ((after - before) / before) * 100;
    const detrimentalChange = lowerIsBetter.has(metric) ? changePercent : -changePercent;
    return {
      metric,
      baseline: before,
      current: after,
      changePercent,
      regressed: detrimentalChange > tolerancePercent,
    };
  });

  return {
    repository: current.repository,
    tolerancePercent,
    deltas,
    passed: !deltas.some((delta) => delta.regressed),
  };
}

export function renderComparisonMarkdown(result: ComparisonResult): string {
  return [
    `## ${result.passed ? '✅' : '❌'} Release health comparison`,
    '',
    `Tolerance: ${result.tolerancePercent.toFixed(1)}%`,
    '',
    '| Metric | Baseline | Current | Change | Status |',
    '| --- | ---: | ---: | ---: | --- |',
    ...result.deltas.map((delta) => [
      `| ${delta.metric}`,
      delta.baseline.toFixed(2),
      delta.current.toFixed(2),
      `${delta.changePercent >= 0 ? '+' : ''}${delta.changePercent.toFixed(1)}%`,
      `${delta.regressed ? 'regressed' : 'within budget'} |`,
    ].join(' | ')),
  ].join('\n');
}
