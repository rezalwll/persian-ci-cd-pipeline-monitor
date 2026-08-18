import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { main } from '../src/cli.js';
import { renderJson } from '../src/report/json.js';
import { failingResult } from './fixtures/analysis-result.js';

describe('comparison CLI', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }));
  });

  it('returns a policy exit code and a directional Markdown diff', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'release-lens-compare-'));
    directories.push(directory);
    const baselinePath = join(directory, 'baseline.json');
    const currentPath = join(directory, 'current.json');
    const outputPath = join(directory, 'comparison.md');
    const baseline = {
      ...failingResult,
      metrics: {
        ...failingResult.metrics,
        successRate: { ...failingResult.metrics.successRate, value: 100 },
      },
    };
    const current = {
      ...failingResult,
      metrics: {
        ...failingResult.metrics,
        successRate: { ...failingResult.metrics.successRate, value: 90 },
      },
    };
    await Promise.all([
      writeFile(baselinePath, renderJson(baseline), 'utf8'),
      writeFile(currentPath, renderJson(current), 'utf8'),
    ]);

    const exitCode = await main([
      'node', 'release-lens', 'compare',
      '--baseline', baselinePath,
      '--current', currentPath,
      '--tolerance', '5',
      '--output', outputPath,
    ]);
    const markdown = await readFile(outputPath, 'utf8');

    expect(exitCode).toBe(1);
    expect(markdown).toContain('| successRate | 100.00 | 90.00 | -10.0% | regressed |');
  });
});
