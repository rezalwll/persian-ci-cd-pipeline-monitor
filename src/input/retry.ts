export interface RetryOptions {
  readonly attempts?: number;
  readonly baseDelayMs?: number;
  readonly maximumDelayMs?: number;
  readonly jitter?: number;
  readonly shouldRetry?: (error: unknown, attempt: number) => boolean;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly random?: () => number;
}

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAXIMUM_DELAY_MS = 5_000;
const DEFAULT_JITTER = 0.2;

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maximumDelayMs = options.maximumDelayMs ?? DEFAULT_MAXIMUM_DELAY_MS;
  const jitter = options.jitter ?? DEFAULT_JITTER;
  const shouldRetry = options.shouldRetry ?? (() => true);
  const sleep = options.sleep ?? delay;
  const random = options.random ?? Math.random;

  if (!Number.isInteger(attempts) || attempts < 1) throw new RangeError('Retry attempts must be positive');
  if (jitter < 0 || jitter > 1) throw new RangeError('Retry jitter must be between zero and one');

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt === attempts || !shouldRetry(error, attempt)) throw error;
      const exponential = Math.min(baseDelayMs * (2 ** (attempt - 1)), maximumDelayMs);
      const jitterFactor = 1 - jitter + random() * jitter * 2;
      await sleep(Math.round(exponential * jitterFactor));
    }
  }

  throw new Error('Retry loop completed without a result');
}
