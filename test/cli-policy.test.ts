import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { main } from '../src/cli.js';
import { runFixture } from './fixtures/run-data.js';

describe('policy-aware CLI', () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map(async (directory) => {
      await rm(directory, { recursive: true, force: true });
    }));
  });

  it('evaluates an input file with the explicitly selected policy', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'release-lens-cli-'));
    directories.push(directory);
    const inputPath = join(directory, 'runs.json');
    const policyPath = join(directory, 'strict.yml');
    const outputPath = join(directory, 'report.json');
    await writeFile(inputPath, JSON.stringify(runFixture), 'utf8');
    await writeFile(policyPath, [
      'version: 1',
      'minimumSampleSize: 1',
      'rules:',
      '  - metric: successRate',
      '    comparison: atLeast',
      '    threshold: 101',
      '    severity: error',
    ].join('\n'), 'utf8');

    const exitCode = await main([
      'node',
      'release-lens',
      'analyze',
      '--input', inputPath,
      '--policy', policyPath,
      '--format', 'json',
      '--output', outputPath,
    ]);
    const report = JSON.parse(await readFile(outputPath, 'utf8')) as {
      result: { findings: { threshold: number }[] };
    };

    expect(exitCode).toBe(1);
    expect(report.result.findings[0]?.threshold).toBe(101);
  });
});
