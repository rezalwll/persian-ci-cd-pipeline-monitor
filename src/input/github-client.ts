import { z } from 'zod';
import type { RunDataset } from '../domain/run.js';
import { parseRunDataset } from './run-schema.js';

const jobSchema = z.object({
  id: z.number(),
  name: z.string(),
  conclusion: z.string(),
  started_at: z.string(),
  completed_at: z.string(),
  runner_name: z.string().nullable().optional(),
  run_attempt: z.number().optional(),
});

const runSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  head_branch: z.string(),
  head_sha: z.string(),
  event: z.string(),
  conclusion: z.string(),
  created_at: z.string(),
  run_started_at: z.string(),
  updated_at: z.string(),
  run_attempt: z.number(),
});

const runPageSchema = z.object({ workflow_runs: z.array(runSchema) });
const jobPageSchema = z.object({ jobs: z.array(jobSchema) });

export interface GitHubClientOptions {
  readonly token: string;
  readonly fetch?: typeof fetch;
  readonly apiUrl?: string;
  readonly now?: () => Date;
}

export class GitHubActionsClient {
  readonly #fetch: typeof fetch;
  readonly #apiUrl: string;
  readonly #now: () => Date;
  readonly #headers: HeadersInit;

  constructor(options: GitHubClientOptions) {
    if (options.token.trim().length === 0) throw new Error('A GitHub token is required');
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#apiUrl = (options.apiUrl ?? 'https://api.github.com').replace(/\/$/u, '');
    this.#now = options.now ?? (() => new Date());
    this.#headers = {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${options.token}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'release-lens/0.1.0',
    };
  }

  async #json(path: string): Promise<unknown> {
    const response = await this.#fetch(`${this.#apiUrl}${path}`, { headers: this.#headers });
    if (!response.ok) {
      const requestId = response.headers.get('x-github-request-id');
      throw new Error(`GitHub API returned ${response.status}${requestId === null ? '' : ` (${requestId})`}`);
    }
    return response.json() as Promise<unknown>;
  }

  async collect(repository: string, branch = 'main', limit = 100): Promise<RunDataset> {
    const encodedRepository = repository.split('/').map(encodeURIComponent).join('/');
    const runs = runPageSchema.parse(await this.#json(
      `/repos/${encodedRepository}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=${String(Math.min(limit, 100))}`,
    )).workflow_runs.slice(0, limit);

    const hydrated = await Promise.all(runs.map(async (run) => {
      const jobs = jobPageSchema.parse(await this.#json(
        `/repos/${encodedRepository}/actions/runs/${String(run.id)}/jobs?per_page=100`,
      )).jobs;
      return {
        ...run,
        jobs: jobs.map((job) => ({
          ...job,
          ...(job.runner_name === null ? { runner_name: undefined } : {}),
        })),
      };
    }));

    return parseRunDataset({
      repository,
      generated_at: this.#now().toISOString(),
      runs: hydrated,
    });
  }
}
