import type { WorkflowRun } from '../domain/run.js';

export function durationBetween(start: string, end: string): number {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new TypeError('Duration boundaries must be valid ISO timestamps');
  }

  if (endTime < startTime) {
    throw new RangeError('A duration cannot end before it starts');
  }

  return endTime - startTime;
}

export function runDurationMs(run: WorkflowRun): number {
  return durationBetween(run.runStartedAt, run.updatedAt);
}

export function queueDurationMs(run: WorkflowRun): number {
  return durationBetween(run.createdAt, run.runStartedAt);
}
