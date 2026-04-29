import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileCache } from '../../src/cache/file-cache.js';

const directories: string[] = [];

async function directory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'release-lens-cache-'));
  directories.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map(async (path) => rm(path, { recursive: true, force: true })));
});

describe('FileCache', () => {
  it('round-trips validated snapshots without exposing keys', async () => {
    const path = await directory();
    const cache = new FileCache<string>({
      directory: path,
      ttlMs: 60_000,
      validate: (value) => {
        if (typeof value !== 'string') throw new TypeError('not a string');
        return value;
      },
      now: () => new Date('2026-04-01T00:00:00Z'),
    });
    await cache.set('acme/private-repository', 'snapshot');

    await expect(cache.get('acme/private-repository')).resolves.toBe('snapshot');
    const files = await readdir(path);
    expect(files).toHaveLength(1);
    expect(files[0]).not.toContain('private-repository');
  });

  it('ignores expired cache entries', async () => {
    const path = await directory();
    let now = new Date('2026-04-01T00:00:00Z');
    const cache = new FileCache({ directory: path, ttlMs: 1_000, validate: String, now: () => now });
    await cache.set('key', 'value');
    now = new Date('2026-04-01T00:00:02Z');
    await expect(cache.get('key')).resolves.toBeUndefined();
  });

  it('treats corrupt entries as cache misses', async () => {
    const path = await directory();
    const cache = new FileCache({ directory: path, ttlMs: 1_000, validate: String });
    await cache.set('key', 'value');
    const [file] = await readdir(path);
    if (file === undefined) throw new Error('Expected cache entry');
    await writeFile(join(path, file), '{', 'utf8');
    await expect(cache.get('key')).resolves.toBeUndefined();
  });
});
