import { z } from 'zod';
import type { AnalysisResult } from '../domain/result.js';

const metricKeys = [
  'successRate',
  'durationP95Ms',
  'queueP95Ms',
  'flakyJobRate',
] as const;

const metricSchema = z.object({
  key: z.enum(metricKeys),
  value: z.number().finite().nonnegative(),
  unit: z.enum(['percent', 'milliseconds']),
  sampleSize: z.number().int().nonnegative(),
}).strict();

const findingSchema = z.object({
  ruleId: z.string().min(1),
  metric: z.enum(metricKeys),
  severity: z.enum(['notice', 'warning', 'error']),
  message: z.string().min(1),
  actual: z.number().finite(),
  threshold: z.number().finite(),
  helpUri: z.string().url().refine((value) => value.startsWith('https://'), {
    message: 'Help links must use HTTPS',
  }).optional(),
}).strict();

const resultSchema = z.object({
  repository: z.string().regex(/^[^/]+\/[^/]+$/u),
  evaluatedAt: z.string().datetime({ offset: true }),
  window: z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  }).strict(),
  metrics: z.object({
    successRate: metricSchema,
    durationP95Ms: metricSchema,
    queueP95Ms: metricSchema,
    flakyJobRate: metricSchema,
  }).strict(),
  findings: z.array(findingSchema),
  passed: z.boolean(),
}).strict();

const reportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedBy: z.literal('release-lens'),
  result: resultSchema,
}).strict();

export function parseJsonReport(input: unknown): AnalysisResult {
  const report = reportSchema.parse(input);
  for (const key of metricKeys) {
    if (report.result.metrics[key].key !== key) {
      throw new Error(`Metric slot ${key} contains ${report.result.metrics[key].key}`);
    }
  }
  return report.result;
}
