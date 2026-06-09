import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { analyze } from '../../src/commands/analyze.js';
import { loadPolicy } from '../../src/config/load-policy.js';
import { loadDatasetFile } from '../../src/input/load-file.js';
import { parseJsonReport } from '../../src/input/report-schema.js';
import { makeRun } from '../fixtures/run-data.js';

describe('file-to-report pipeline', () => {
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'release-lens-e2e-'));
    const runs = Array.from({ length: 6 }, (_, index) => makeRun({
      id: index + 1,
      headSha: `pipeline-${String(index)}`,
      conclusion: index === 0 ? 'failure' : 'success',
    }));
    await writeFile(join(directory, 'runs.json'), JSON.stringify({
      repository: 'acme/payments',
      generated_at: '2026-06-01T00:00:00Z',
      runs: runs.map((run) => ({
        id: run.id,
        name: run.name,
        path: run.workflowPath,
        head_branch: run.headBranch,
        head_sha: run.headSha,
        event: run.event,
        conclusion: run.conclusion,
        created_at: run.createdAt,
        run_started_at: run.runStartedAt,
        updated_at: run.updatedAt,
        run_attempt: run.attempt,
        jobs: [],
      })),
    }), 'utf8');
    await writeFile(join(directory, '.release-lens.yml'), [
      'version: 1',
      'minimumSampleSize: 5',
      'rules:',
      '  - metric: successRate',
      '    comparison: atLeast',
      '    threshold: 90',
      '    severity: error',
    ].join('\n'), 'utf8');
  });

  afterAll(async () => rm(directory, { recursive: true, force: true }));

  it('loads, evaluates, serializes and revalidates an artifact', async () => {
    const dataset = await loadDatasetFile(join(directory, 'runs.json'));
    const { policy } = await loadPolicy(undefined, directory);
    const command = analyze({ dataset, policy, format: 'json' });
    const result = parseJsonReport(JSON.parse(command.output));

    expect(command.exitCode).toBe(1);
    expect(result.metrics.successRate.value).toBeCloseTo(83.33, 1);
    expect(result.findings[0]?.ruleId).toBe('budget.successRate');
  });
});
