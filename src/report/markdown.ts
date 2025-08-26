import type { AnalysisResult, MetricValue } from '../domain/result.js';

function formatValue(metric: MetricValue): string {
  return metric.unit === 'percent'
    ? `${metric.value.toFixed(1)}%`
    : `${Math.round(metric.value)} ms`;
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function renderMarkdown(result: AnalysisResult): string {
  const icon = result.passed ? '✅' : '❌';
  const metricRows = Object.values(result.metrics).map(
    (metric) => `| ${metric.key} | ${formatValue(metric)} | ${metric.sampleSize} |`,
  );
  const findingRows = result.findings.length === 0
    ? ['| — | notice | No policy findings |']
    : result.findings.map(
      (finding) => `| \`${finding.ruleId}\` | ${finding.severity} | ${escapeCell(finding.message)} |`,
    );

  return [
    `## ${icon} Release Lens: ${result.repository}`,
    '',
    `**Window:** ${result.window.from} → ${result.window.to}`,
    '',
    '| Metric | Value | Samples |',
    '| --- | ---: | ---: |',
    ...metricRows,
    '',
    '| Rule | Severity | Finding |',
    '| --- | --- | --- |',
    ...findingRows,
    '',
    `**Verdict:** ${result.passed ? 'PASS' : 'FAIL'}`,
  ].join('\n');
}
