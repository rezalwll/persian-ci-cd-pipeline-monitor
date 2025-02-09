import { extname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { defaultPolicy, type ReleasePolicy } from '../domain/policy.js';

const metricSchema = z.enum([
  'successRate',
  'durationP95Ms',
  'queueP95Ms',
  'flakyJobRate',
]);

const ruleSchema = z.object({
  metric: metricSchema,
  comparison: z.enum(['atLeast', 'atMost']),
  threshold: z.number().finite().nonnegative(),
  severity: z.enum(['notice', 'warning', 'error']),
}).strict();

const policySchema = z.object({
  version: z.literal(1).default(1),
  minimumSampleSize: z.number().int().positive().default(defaultPolicy.minimumSampleSize),
  includeBranches: z.array(z.string().min(1)).default([...defaultPolicy.includeBranches]),
  excludeEvents: z.array(z.string().min(1)).default([...defaultPolicy.excludeEvents]),
  rules: z.array(ruleSchema).min(1).default([...defaultPolicy.rules]),
}).strict();

function parseDocument(source: string, filename: string): unknown {
  const extension = extname(filename).toLowerCase();

  if (extension === '.yaml' || extension === '.yml') {
    return parseYaml(source);
  }

  return JSON.parse(source) as unknown;
}

export function parsePolicy(source: string, filename = 'release-lens.config.json'): ReleasePolicy {
  const document = parseDocument(source, filename);
  return policySchema.parse(document);
}
