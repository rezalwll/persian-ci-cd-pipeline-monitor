import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadPolicy } from '../../src/config/load-policy.js';

const directories: string[] = [];

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'release-lens-policy-'));
  directories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(async (path) => rm(path, { recursive: true, force: true })));
});

describe('loadPolicy', () => {
  it('falls back to built-in policy when no config exists', async () => {
    const directory = await workspace();
    const loaded = await loadPolicy(undefined, directory);
    expect(loaded.path).toBeNull();
    expect(loaded.policy.minimumSampleSize).toBe(5);
  });

  it('discovers dotfile configuration before named variants', async () => {
    const directory = await workspace();
    await writeFile(join(directory, 'release-lens.config.json'), '{"version":1,"minimumSampleSize":20}');
    await writeFile(join(directory, '.release-lens.yml'), 'version: 1\nminimumSampleSize: 7\n');
    const loaded = await loadPolicy(undefined, directory);
    expect(loaded.path).toBe(join(directory, '.release-lens.yml'));
    expect(loaded.policy.minimumSampleSize).toBe(7);
  });

  it('fails with context for an explicit missing path', async () => {
    const directory = await workspace();
    await expect(loadPolicy('missing.yml', directory)).rejects.toThrow('Unable to load release policy');
  });
});
