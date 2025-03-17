function assertFiniteSample(values: readonly number[]): void {
  if (values.length === 0) {
    throw new RangeError('A statistical sample cannot be empty');
  }

  if (values.some((value) => !Number.isFinite(value))) {
    throw new TypeError('A statistical sample must contain only finite numbers');
  }
}

export function median(values: readonly number[]): number {
  assertFiniteSample(values);
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }

  const lower = sorted[middle - 1] ?? 0;
  const upper = sorted[middle] ?? 0;
  return (lower + upper) / 2;
}

export function percentile(values: readonly number[], quantile: number): number {
  assertFiniteSample(values);

  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
    throw new RangeError('A quantile must be between zero and one');
  }

  const sorted = [...values].sort((left, right) => left - right);
  const rank = (sorted.length - 1) * quantile;
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sorted[lowerIndex] ?? 0;
  const upper = sorted[upperIndex] ?? lower;

  return lower + (upper - lower) * (rank - lowerIndex);
}
