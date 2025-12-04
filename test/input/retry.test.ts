import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '../../src/input/retry.js';

describe('withRetry', () => {
  it('recovers after transient failures', async () => {
    const operation = vi.fn(async (attempt: number) => {
      if (attempt < 3) throw new Error('transient');
      return 'ready';
    });
    const sleep = vi.fn(async () => Promise.resolve());

    await expect(withRetry(operation, { sleep, random: () => 0.5 })).resolves.toBe('ready');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 250);
    expect(sleep).toHaveBeenNthCalledWith(2, 500);
  });

  it('stops immediately for non-retryable errors', async () => {
    const sleep = vi.fn(async () => Promise.resolve());
    await expect(withRetry(async () => Promise.reject(new Error('invalid')), {
      sleep,
      shouldRetry: () => false,
    })).rejects.toThrow('invalid');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('caps backoff and validates configuration', async () => {
    const sleep = vi.fn(async () => Promise.resolve());
    await expect(withRetry(async () => Promise.reject(new Error('still failing')), {
      attempts: 3,
      baseDelayMs: 1_000,
      maximumDelayMs: 1_200,
      jitter: 0,
      sleep,
    })).rejects.toThrow('still failing');
    expect(sleep).toHaveBeenNthCalledWith(2, 1_200);
    await expect(withRetry(async () => 'ok', { attempts: 0 })).rejects.toThrow(RangeError);
  });
});
