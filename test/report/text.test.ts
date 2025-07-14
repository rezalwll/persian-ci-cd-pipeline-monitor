import { describe, expect, it } from 'vitest';
import { renderText } from '../../src/report/text.js';
import { failingResult } from '../fixtures/analysis-result.js';

describe('renderText', () => {
  it('renders units, sample sizes, findings and verdict', () => {
    const report = renderText(failingResult);

    expect(report).toContain('Release Lens · acme/payments');
    expect(report).toContain('successRate');
    expect(report).toContain('90.0%');
    expect(report).toContain('durationP95Ms');
    expect(report).toContain('12.0m');
    expect(report).toContain('[ERROR] successRate is 90');
    expect(report).toContain('Verdict: FAIL');
  });

  it('prints a clean finding state', () => {
    const report = renderText({ ...failingResult, findings: [], passed: true });
    expect(report).toContain('No policy findings.');
    expect(report).toContain('Verdict: PASS');
  });
});
