import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/report/markdown.js';
import { failingResult } from '../fixtures/analysis-result.js';

describe('renderMarkdown', () => {
  it('renders a GitHub-friendly metric and finding table', () => {
    const markdown = renderMarkdown(failingResult);

    expect(markdown).toContain('## ❌ Release Lens: acme/payments');
    expect(markdown).toContain('| successRate | 90.0% | 20 |');
    expect(markdown).toContain('| `budget.successRate` | error |');
    expect(markdown).toContain('**Verdict:** FAIL');
  });

  it('escapes table delimiters in policy messages', () => {
    const finding = { ...failingResult.findings[0]!, message: 'main | release' };
    const markdown = renderMarkdown({ ...failingResult, findings: [finding] });
    expect(markdown).toContain('main \\| release');
  });

  it('renders an explicit empty state', () => {
    const markdown = renderMarkdown({ ...failingResult, findings: [], passed: true });
    expect(markdown).toContain('| — | notice | No policy findings |');
  });
});
