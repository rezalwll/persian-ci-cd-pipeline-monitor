import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RunDataset } from '../domain/run.js';
import { parseRunDataset } from './run-schema.js';

export async function loadDatasetFile(path: string): Promise<RunDataset> {
  const absolutePath = resolve(path);
  let source: string;

  try {
    source = await readFile(absolutePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read workflow dataset at ${absolutePath}: ${message}`, { cause: error });
  }

  try {
    return parseRunDataset(JSON.parse(source) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid workflow dataset at ${absolutePath}: ${message}`, { cause: error });
  }
}
