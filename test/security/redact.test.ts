import { describe, expect, it } from 'vitest';
import { redactText, safeErrorMessage } from '../../src/security/redact.js';

describe('credential redaction', () => {
  it('removes classic and fine-grained GitHub tokens', () => {
    const classic = 'ghp_1234567890abcdefghijklmn';
    const fineGrained = 'github_pat_1234567890abcdefghijklmn';
    const output = redactText(`classic=${classic} fine=${fineGrained}`);

    expect(output).not.toContain(classic);
    expect(output).not.toContain(fineGrained);
    expect(output.match(/\[REDACTED\]/gu)).toHaveLength(2);
  });

  it('redacts caller-supplied secrets literally', () => {
    expect(redactText('token=a.b+c and again a.b+c', ['a.b+c']))
      .toBe('token=[REDACTED] and again [REDACTED]');
  });

  it('ignores short values that would over-redact logs', () => {
    expect(redactText('branch=main', ['main'])).toBe('branch=main');
  });

  it('normalizes unknown errors without exposing credentials', () => {
    expect(safeErrorMessage(new Error('Bearer abcdefghijklmnop failed')))
      .toBe('[REDACTED] failed');
  });
});
