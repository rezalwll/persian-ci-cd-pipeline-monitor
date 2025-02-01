import type { MetricKey, Severity } from './result.js';

export type Comparison = 'atLeast' | 'atMost';

export interface PolicyRule {
  readonly metric: MetricKey;
  readonly comparison: Comparison;
  readonly threshold: number;
  readonly severity: Severity;
}

export interface ReleasePolicy {
  readonly version: 1;
  readonly minimumSampleSize: number;
  readonly includeBranches: readonly string[];
  readonly excludeEvents: readonly string[];
  readonly rules: readonly PolicyRule[];
}

export const defaultPolicy: ReleasePolicy = {
  version: 1,
  minimumSampleSize: 5,
  includeBranches: ['main', 'master'],
  excludeEvents: ['workflow_dispatch'],
  rules: [
    {
      metric: 'successRate',
      comparison: 'atLeast',
      threshold: 95,
      severity: 'error',
    },
    {
      metric: 'durationP95Ms',
      comparison: 'atMost',
      threshold: 15 * 60 * 1_000,
      severity: 'warning',
    },
    {
      metric: 'queueP95Ms',
      comparison: 'atMost',
      threshold: 2 * 60 * 1_000,
      severity: 'warning',
    },
    {
      metric: 'flakyJobRate',
      comparison: 'atMost',
      threshold: 3,
      severity: 'error',
    },
  ],
};
