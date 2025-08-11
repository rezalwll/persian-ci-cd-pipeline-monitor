import type { AnalysisResult } from '../domain/result.js';

export interface JsonReport {
  readonly schemaVersion: 1;
  readonly generatedBy: 'release-lens';
  readonly result: AnalysisResult;
}

export function toJsonReport(result: AnalysisResult): JsonReport {
  return {
    schemaVersion: 1,
    generatedBy: 'release-lens',
    result,
  };
}

export function renderJson(result: AnalysisResult, pretty = true): string {
  return JSON.stringify(toJsonReport(result), undefined, pretty ? 2 : undefined);
}
