import type { AnalysisResult } from '../../src/domain/result.js';

export const failingResult: AnalysisResult = {
  repository: 'acme/payments',
  evaluatedAt: '2025-07-01T00:00:00Z',
  window: {
    from: '2025-06-01T00:00:00Z',
    to: '2025-07-01T00:00:00Z',
  },
  metrics: {
    successRate: { key: 'successRate', value: 90, unit: 'percent', sampleSize: 20 },
    durationP95Ms: { key: 'durationP95Ms', value: 720_000, unit: 'milliseconds', sampleSize: 20 },
    queueP95Ms: { key: 'queueP95Ms', value: 45_000, unit: 'milliseconds', sampleSize: 20 },
    flakyJobRate: { key: 'flakyJobRate', value: 5, unit: 'percent', sampleSize: 20 },
  },
  findings: [
    {
      ruleId: 'budget.successRate',
      metric: 'successRate',
      severity: 'error',
      message: 'successRate is 90; expected at least 95',
      actual: 90,
      threshold: 95,
    },
  ],
  passed: false,
};
