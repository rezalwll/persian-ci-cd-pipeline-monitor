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
