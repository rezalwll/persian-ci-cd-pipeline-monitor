import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseActionInputs, runAction } from '../src/action.js';
import type { RunDataset } from '../src/domain/run.js';
import { makeRun } from './fixtures/run-data.js';

function dataset(failures = 0): RunDataset {
  return {
    repository: 'acme/payments',
    generatedAt: '2026-09-01T08:00:00Z',
    runs: Array.from({ length: 5 }, (_, index) => makeRun({
      id: index + 1,
      headSha: `action-${String(index)}`,
      conclusion: index < failures ? 'failure' : 'success',
    })),
  };
}

describe('JavaScript action entrypoint', () => {
  const directories: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(directories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }));
  });

  it('normalizes defaults and validates boolean inputs', () => {
    expect(parseActionInputs({ GITHUB_REPOSITORY: 'acme/payments', GITHUB_TOKEN: 'secret' }))
      .toMatchObject({ repository: 'acme/payments', branch: 'main', failOnBudget: true });
    expect(() => parseActionInputs({
      GITHUB_REPOSITORY: 'acme/payments',
      GITHUB_TOKEN: 'secret',
      'INPUT_FAIL-ON-BUDGET': 'sometimes',
    })).toThrow(TypeError);
  });

  it('publishes outputs and a summary while honoring advisory mode', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'release-lens-action-'));
    directories.push(directory);
    const outputPath = join(directory, 'output.txt');
    const summaryPath = join(directory, 'summary.md');
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const exitCode = await runAction({
      environment: {
        GITHUB_REPOSITORY: 'acme/payments',
        GITHUB_TOKEN: 'secret',
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: summaryPath,
        'INPUT_FAIL-ON-BUDGET': 'false',
      },
      collect: async () => dataset(1),
    });

    expect(exitCode).toBe(0);
    expect(await readFile(outputPath, 'utf8')).toContain('passed=false');
    expect(await readFile(summaryPath, 'utf8')).toContain('Release Lens');
  });
});
