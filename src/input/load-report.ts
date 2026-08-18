import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { AnalysisResult } from '../domain/result.js';
import { parseJsonReport } from './report-schema.js';

export async function loadAnalysisReport(path: string): Promise<AnalysisResult> {
  const absolutePath = resolve(path);
  let source: string;

  try {
    source = await readFile(absolutePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read analysis report at ${absolutePath}: ${message}`, { cause: error });
  }

  try {
    return parseJsonReport(JSON.parse(source) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid analysis report at ${absolutePath}: ${message}`, { cause: error });
  }
}
