export type Severity = 'notice' | 'warning' | 'error';

export type MetricKey =
  | 'successRate'
  | 'durationP95Ms'
  | 'queueP95Ms'
  | 'flakyJobRate';

export interface MetricValue {
  readonly key: MetricKey;
  readonly value: number;
  readonly unit: 'percent' | 'milliseconds';
  readonly sampleSize: number;
}

export interface Finding {
  readonly ruleId: string;
  readonly metric: MetricKey;
  readonly severity: Severity;
  readonly message: string;
  readonly actual: number;
  readonly threshold: number;
  readonly helpUri?: string | undefined;
}

export interface AnalysisResult {
  readonly repository: string;
  readonly evaluatedAt: string;
  readonly window: {
    readonly from: string;
    readonly to: string;
  };
  readonly metrics: Readonly<Record<MetricKey, MetricValue>>;
  readonly findings: readonly Finding[];
  readonly passed: boolean;
}
