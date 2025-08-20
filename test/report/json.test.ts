import { describe, expect, it } from 'vitest';
import { renderJson, toJsonReport } from '../../src/report/json.js';
import { failingResult } from '../fixtures/analysis-result.js';

describe('JSON report', () => {
  it('wraps results with a stable schema version', () => {
    expect(toJsonReport(failingResult)).toMatchObject({
      schemaVersion: 1,
      generatedBy: 'release-lens',
      result: { repository: 'acme/payments', passed: false },
    });
  });

  it('supports compact output for CI artifacts', () => {
    const compact = renderJson(failingResult, false);
    expect(compact).not.toContain('\n');
    expect(JSON.parse(compact)).toHaveProperty('result.findings.0.ruleId', 'budget.successRate');
  });

  it('pretty prints by default for local inspection', () => {
    expect(renderJson(failingResult)).toContain('\n  "schemaVersion"');
  });
});
