import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { defaultPolicy, type ReleasePolicy } from '../domain/policy.js';
import { parsePolicy } from './parse-policy.js';

const CANDIDATES = [
  '.release-lens.yml',
  '.release-lens.yaml',
  '.release-lens.json',
  'release-lens.config.yml',
  'release-lens.config.yaml',
  'release-lens.config.json',
] as const;

export interface LoadedPolicy {
  readonly policy: ReleasePolicy;
  readonly path: string | null;
}

async function readable(path: string): Promise<boolean> {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch {
    return false;
  }
}

export async function loadPolicy(explicitPath?: string, cwd = process.cwd()): Promise<LoadedPolicy> {
  const path = explicitPath === undefined
    ? (await Promise.all(CANDIDATES.map(async (name) => {
      const candidate = join(cwd, name);
      return await readable(candidate) ? candidate : null;
    }))).find((candidate) => candidate !== null) ?? null
    : (isAbsolute(explicitPath) ? explicitPath : resolve(cwd, explicitPath));

  if (path === null) return { policy: defaultPolicy, path: null };

  try {
    const source = await readFile(path, 'utf8');
    return { policy: parsePolicy(source, path), path };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load release policy at ${path}: ${message}`, { cause: error });
  }
}
