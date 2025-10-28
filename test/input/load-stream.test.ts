import { describe, expect, it } from 'vitest';
import { loadDatasetStream } from '../../src/input/load-stream.js';
import { runFixture } from '../fixtures/run-data.js';

async function* chunksOf(source: string, size: number): AsyncGenerator<Uint8Array> {
  const encoded = new TextEncoder().encode(source);
  for (let index = 0; index < encoded.length; index += size) {
    yield encoded.slice(index, index + size);
  }
}

describe('loadDatasetStream', () => {
  it('decodes JSON split across byte chunks', async () => {
    const result = await loadDatasetStream(chunksOf(JSON.stringify(runFixture), 13));
    expect(result.runs[0]?.jobs).toHaveLength(2);
  });

  it('rejects an empty input stream', async () => {
    await expect(loadDatasetStream(chunksOf('', 2))).rejects.toThrow('did not contain');
  });

  it('stops reading beyond the configured byte budget', async () => {
    await expect(loadDatasetStream(chunksOf(JSON.stringify(runFixture), 10), 20))
      .rejects.toThrow('exceeds the 20 byte limit');
  });
});
