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

const DEFAULT_MINIMUM_SAMPLE_SIZE = 5;
const DEFAULT_SUCCESS_RATE_PERCENT = 95;
const DEFAULT_DURATION_BUDGET_MINUTES = 15;
const SECONDS_PER_MINUTE = 60;
const DEFAULT_FLAKY_JOB_RATE_PERCENT = 3;

export const defaultPolicy: ReleasePolicy = {
  version: 1,
  minimumSampleSize: DEFAULT_MINIMUM_SAMPLE_SIZE,
  includeBranches: ['main', 'master'],
  excludeEvents: ['workflow_dispatch'],
  rules: [
    {
      metric: 'successRate',
      comparison: 'atLeast',
      threshold: DEFAULT_SUCCESS_RATE_PERCENT,
      severity: 'error',
    },
    {
      metric: 'durationP95Ms',
      comparison: 'atMost',
      threshold: DEFAULT_DURATION_BUDGET_MINUTES * SECONDS_PER_MINUTE * 1_000,
      severity: 'warning',
    },
    {
      metric: 'queueP95Ms',
      comparison: 'atMost',
      threshold: 2 * SECONDS_PER_MINUTE * 1_000,
      severity: 'warning',
    },
    {
      metric: 'flakyJobRate',
      comparison: 'atMost',
      threshold: DEFAULT_FLAKY_JOB_RATE_PERCENT,
      severity: 'error',
    },
  ],
};
