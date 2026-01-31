import { describe, expect, it } from 'vitest';
import { compareResults, renderComparisonMarkdown } from '../../src/commands/compare.js';
import type { AnalysisResult } from '../../src/domain/result.js';
import { failingResult } from '../fixtures/analysis-result.js';

function withMetrics(overrides: Partial<Record<keyof AnalysisResult['metrics'], number>>): AnalysisResult {
  return {
    ...failingResult,
    metrics: Object.fromEntries(Object.entries(failingResult.metrics).map(([key, metric]) => [
      key,
      { ...metric, value: overrides[key as keyof typeof overrides] ?? metric.value },
    ])) as unknown as AnalysisResult['metrics'],
  };
}

describe('compareResults', () => {
  it('flags lower success and slower duration beyond tolerance', () => {
    const comparison = compareResults(
      withMetrics({ successRate: 100, durationP95Ms: 600_000 }),
      withMetrics({ successRate: 90, durationP95Ms: 720_000 }),
    );

    expect(comparison.passed).toBe(false);
    expect(comparison.deltas.filter((delta) => delta.regressed).map((delta) => delta.metric))
      .toEqual(['successRate', 'durationP95Ms']);
  });

  it('accepts improvements and changes within tolerance', () => {
    const comparison = compareResults(
      withMetrics({ successRate: 95, queueP95Ms: 50_000 }),
      withMetrics({ successRate: 98, queueP95Ms: 52_000 }),
    );
    expect(comparison.passed).toBe(true);
  });

  it('validates repository identity and tolerance', () => {
    expect(() => compareResults(failingResult, { ...failingResult, repository: 'acme/other' })).toThrow();
    expect(() => compareResults(failingResult, failingResult, -1)).toThrow(RangeError);
  });

  it('renders a Markdown regression table', () => {
    expect(renderComparisonMarkdown(compareResults(failingResult, failingResult)))
      .toContain('| successRate | 90.00 | 90.00 | +0.0% | within budget |');
  });
});
