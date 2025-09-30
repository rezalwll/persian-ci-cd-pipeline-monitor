import { describe, expect, it } from 'vitest';
import { renderGitHubAnnotations } from '../../src/report/github.js';
import { failingResult } from '../fixtures/analysis-result.js';

describe('renderGitHubAnnotations', () => {
  it('maps finding severity to workflow commands', () => {
    const annotations = renderGitHubAnnotations(failingResult);
    expect(annotations).toContain('::error title=Release Lens%3A budget.successRate::');
  });

  it('escapes command injection characters', () => {
    const finding = {
      ...failingResult.findings[0]!,
      ruleId: 'budget:queue,p95',
      message: 'first%line\nsecond',
    };
    const annotations = renderGitHubAnnotations({ ...failingResult, findings: [finding] });

    expect(annotations).toContain('budget%3Aqueue%2Cp95');
    expect(annotations).toContain('first%25line%0Asecond');
  });

  it('prints no commands for a clean result', () => {
    expect(renderGitHubAnnotations({ ...failingResult, findings: [] })).toBe('');
  });
});
