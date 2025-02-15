import { describe, expect, it } from 'vitest';
import { parsePolicy } from '../../src/config/parse-policy.js';

describe('parsePolicy', () => {
  it('applies safe defaults to a minimal JSON document', () => {
    const policy = parsePolicy('{"version":1}');

    expect(policy.minimumSampleSize).toBe(5);
    expect(policy.includeBranches).toEqual(['main', 'master']);
    expect(policy.rules).toHaveLength(4);
  });

  it('accepts a strict YAML policy', () => {
    const policy = parsePolicy(`
version: 1
minimumSampleSize: 10
includeBranches: [main]
excludeEvents: []
rules:
  - metric: successRate
    comparison: atLeast
    threshold: 98
    severity: error
`, 'release-lens.yaml');

    expect(policy.minimumSampleSize).toBe(10);
    expect(policy.rules[0]?.threshold).toBe(98);
  });

  it('rejects misspelled policy keys', () => {
    expect(() => parsePolicy('{"version":1,"minimumSamples":3}')).toThrow();
  });

  it('rejects negative thresholds', () => {
    expect(() => parsePolicy(`
version: 1
rules:
  - metric: queueP95Ms
    comparison: atMost
    threshold: -1
    severity: warning
`, 'policy.yml')).toThrow();
  });
});
