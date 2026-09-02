import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { appendGitHubStepSummary } from '../../src/report/step-summary.js';

describe('GitHub step summary', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }));
  });

  it('appends complete Markdown blocks without merging their last lines', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'release-lens-summary-'));
    directories.push(directory);
    const path = join(directory, 'summary.md');

    await appendGitHubStepSummary('## First', path);
    await appendGitHubStepSummary('## Second\n', path);

    expect(await readFile(path, 'utf8')).toBe('## First\n## Second\n');
  });

  it('is a no-op outside GitHub Actions and caps oversized reports', async () => {
    expect(await appendGitHubStepSummary('report', undefined)).toBe(false);
    await expect(appendGitHubStepSummary('x'.repeat(1_048_577), 'unused.md'))
      .rejects.toThrow(RangeError);
  });
});
