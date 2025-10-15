import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadDatasetFile } from '../../src/input/load-file.js';
import { runFixture } from '../fixtures/run-data.js';

const temporaryDirectories: string[] = [];

async function temporaryFile(name: string, source: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'release-lens-'));
  temporaryDirectories.push(directory);
  const path = join(directory, name);
  await writeFile(path, source, 'utf8');
  return path;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(
    async (directory) => rm(directory, { recursive: true, force: true }),
  ));
});

describe('loadDatasetFile', () => {
  it('reads and validates a JSON dataset', async () => {
    const path = await temporaryFile('runs.json', JSON.stringify(runFixture));
    await expect(loadDatasetFile(path)).resolves.toMatchObject({ repository: 'acme/payments' });
  });

  it('includes the path when JSON is malformed', async () => {
    const path = await temporaryFile('broken.json', '{');
    await expect(loadDatasetFile(path)).rejects.toThrow(`Invalid workflow dataset at ${path}`);
  });

  it('explains missing files', async () => {
    await expect(loadDatasetFile('missing-runs.json')).rejects.toThrow('Unable to read workflow dataset');
  });
});
