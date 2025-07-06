import pc from 'picocolors';
import type { AnalysisResult, MetricValue, Severity } from '../domain/result.js';

const severityLabel: Readonly<Record<Severity, string>> = {
  notice: 'NOTICE',
  warning: 'WARN',
  error: 'ERROR',
};

function formatValue(metric: MetricValue): string {
  if (metric.unit === 'percent') {
    return `${metric.value.toFixed(1)}%`;
  }

  return metric.value >= 60_000
    ? `${(metric.value / 60_000).toFixed(1)}m`
    : `${Math.round(metric.value / 1_000)}s`;
}

function colorSeverity(severity: Severity, value: string, color: boolean): string {
  if (!color) return value;
  if (severity === 'error') return pc.red(value);
  if (severity === 'warning') return pc.yellow(value);
  return pc.cyan(value);
}

export function renderText(result: AnalysisResult, color = false): string {
  const metricLines = Object.values(result.metrics).map(
    (metric) => `  ${metric.key.padEnd(18)} ${formatValue(metric).padStart(8)}  n=${metric.sampleSize}`,
  );
  const findingLines = result.findings.length === 0
    ? ['  No policy findings.']
    : result.findings.map((finding) => colorSeverity(
      finding.severity,
      `  [${severityLabel[finding.severity]}] ${finding.message}`,
      color,
    ));
  const plainVerdict = result.passed ? 'PASS' : 'FAIL';
  const verdict = color
    ? (result.passed ? pc.green(plainVerdict) : pc.red(plainVerdict))
    : plainVerdict;

  return [
    `Release Lens · ${result.repository}`,
    `Window: ${result.window.from} → ${result.window.to}`,
    '',
    ...metricLines,
    '',
    ...findingLines,
    '',
    `Verdict: ${verdict}`,
  ].join('\n');
}
