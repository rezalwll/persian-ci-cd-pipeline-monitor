import { describe, expect, it } from 'vitest';
import { renderSarif, toSarif } from '../../src/report/sarif.js';
import { failingResult } from '../fixtures/analysis-result.js';

describe('SARIF report', () => {
  it('maps policy errors to SARIF error results', () => {
    expect(toSarif(failingResult)).toMatchObject({
      version: '2.1.0',
      runs: [{
        automationDetails: { id: 'acme/payments' },
        results: [{
          ruleId: 'budget.successRate',
          level: 'error',
          properties: { actual: 90, threshold: 95 },
        }],
      }],
    });
  });

  it('emits valid JSON with a declared schema', () => {
    const sarif = JSON.parse(renderSarif(failingResult));
    expect(sarif.$schema).toContain('sarif-2.1.0');
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);
  });

  it('supports a clean run with no SARIF results', () => {
    const sarif = toSarif({ ...failingResult, findings: [], passed: true }) as { runs: { results: unknown[] }[] };
    expect(sarif.runs[0]?.results).toEqual([]);
  });
});
