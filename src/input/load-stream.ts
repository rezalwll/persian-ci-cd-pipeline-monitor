import type { RunDataset } from '../domain/run.js';
import { parseRunDataset } from './run-schema.js';

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export async function loadDatasetStream(
  stream: AsyncIterable<Uint8Array | string>,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<RunDataset> {
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytes = 0;

  for await (const chunk of stream) {
    const encoded = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
    bytes += encoded.byteLength;
    if (bytes > maxBytes) {
      throw new RangeError(`Standard input exceeds the ${maxBytes} byte limit`);
    }
    chunks.push(typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }));
  }

  chunks.push(decoder.decode());
  const source = chunks.join('').trim();
  if (source.length === 0) {
    throw new Error('Standard input did not contain a workflow dataset');
  }

  return parseRunDataset(JSON.parse(source) as unknown);
}
