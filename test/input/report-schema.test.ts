import { describe, expect, it } from 'vitest';
import { parseJsonReport } from '../../src/input/report-schema.js';
import { toJsonReport } from '../../src/report/json.js';
import { failingResult } from '../fixtures/analysis-result.js';

describe('parseJsonReport', () => {
  it('round-trips a versioned Release Lens report', () => {
    expect(parseJsonReport(toJsonReport(failingResult))).toEqual(failingResult);
  });

  it('rejects unknown report schema versions', () => {
    expect(() => parseJsonReport({ ...toJsonReport(failingResult), schemaVersion: 2 })).toThrow();
  });

  it('rejects a metric stored in the wrong slot', () => {
    const report = toJsonReport(failingResult);
    const corrupted = {
      ...report,
      result: {
        ...report.result,
        metrics: {
          ...report.result.metrics,
          successRate: { ...report.result.metrics.successRate, key: 'flakyJobRate' },
        },
      },
    };
    expect(() => parseJsonReport(corrupted)).toThrow('Metric slot successRate');
  });

  it('rejects non-URL help links', () => {
    const report = toJsonReport({
      ...failingResult,
      findings: [{ ...failingResult.findings[0]!, helpUri: 'javascript:alert(1)' }],
    });
    expect(() => parseJsonReport(report)).toThrow();
  });
});
