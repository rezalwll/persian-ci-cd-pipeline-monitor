const TOKEN_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/gu,
  /\bBearer\s+[A-Za-z0-9._~-]{12,}\b/giu,
] as const;

const MINIMUM_SECRET_LENGTH = 5;

export function redactText(source: string, secrets: readonly string[] = []): string {
  let redacted = source;

  for (const pattern of TOKEN_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }

  for (const secret of [...secrets].filter((value) => value.length >= MINIMUM_SECRET_LENGTH).toSorted(
    (left, right) => right.length - left.length,
  )) {
    redacted = redacted.replaceAll(secret, '[REDACTED]');
  }

  return redacted;
}

export function safeErrorMessage(error: unknown, secrets: readonly string[] = []): string {
  const message = error instanceof Error ? error.message : String(error);
  return redactText(message, secrets);
}
