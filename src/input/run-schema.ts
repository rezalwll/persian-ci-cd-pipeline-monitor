import { z } from 'zod';
import type { RunDataset } from '../domain/run.js';

const conclusionSchema = z.enum([
  'success',
  'failure',
  'cancelled',
  'timed_out',
  'skipped',
  'neutral',
  'action_required',
]);

const MINIMUM_SHORT_SHA_LENGTH = 7;

const jobSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  conclusion: conclusionSchema.exclude(['action_required']),
  started_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }),
  runner_name: z.string().min(1).optional(),
  run_attempt: z.number().int().positive().optional(),
}).strict();

const runSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  path: z.string().min(1),
  head_branch: z.string().min(1),
  head_sha: z.string().min(MINIMUM_SHORT_SHA_LENGTH),
  event: z.string().min(1),
  conclusion: conclusionSchema,
  created_at: z.string().datetime({ offset: true }),
  run_started_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  run_attempt: z.number().int().positive(),
  jobs: z.array(jobSchema),
}).strict();

const datasetSchema = z.object({
  repository: z.string().regex(/^[^/]+\/[^/]+$/u),
  generated_at: z.string().datetime({ offset: true }),
  runs: z.array(runSchema),
}).strict();

export function parseRunDataset(input: unknown): RunDataset {
  const data = datasetSchema.parse(input);

  return {
    repository: data.repository,
    generatedAt: data.generated_at,
    runs: data.runs.map((run) => ({
      id: run.id,
      name: run.name,
      workflowPath: run.path,
      headBranch: run.head_branch,
      headSha: run.head_sha,
      event: run.event,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      runStartedAt: run.run_started_at,
      updatedAt: run.updated_at,
      attempt: run.run_attempt,
      jobs: run.jobs.map((job) => ({
        id: job.id,
        name: job.name,
        conclusion: job.conclusion,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        ...(job.runner_name === undefined ? {} : { runnerName: job.runner_name }),
        ...(job.run_attempt === undefined ? {} : { attempt: job.run_attempt }),
      })),
    })),
  };
}
