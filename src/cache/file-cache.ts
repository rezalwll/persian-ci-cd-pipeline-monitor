import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface CacheEnvelope<T> {
  readonly version: 1;
  readonly createdAt: string;
  readonly value: T;
}

export interface FileCacheOptions<T> {
  readonly directory: string;
  readonly ttlMs: number;
  readonly validate: (value: unknown) => T;
  readonly now?: () => Date;
}

function filenameFor(key: string): string {
  return `${createHash('sha256').update(key).digest('hex')}.json`;
}

export class FileCache<T> {
  readonly #directory: string;
  readonly #ttlMs: number;
  readonly #validate: (value: unknown) => T;
  readonly #now: () => Date;

  constructor(options: FileCacheOptions<T>) {
    if (options.ttlMs < 0) throw new RangeError('Cache TTL cannot be negative');
    this.#directory = options.directory;
    this.#ttlMs = options.ttlMs;
    this.#validate = options.validate;
    this.#now = options.now ?? (() => new Date());
  }

  async get(key: string): Promise<T | undefined> {
    try {
      const source = await readFile(join(this.#directory, filenameFor(key)), 'utf8');
      const envelope = JSON.parse(source) as Partial<CacheEnvelope<unknown>>;
      if (envelope.version !== 1 || typeof envelope.createdAt !== 'string') return undefined;
      const age = this.#now().getTime() - Date.parse(envelope.createdAt);
      if (!Number.isFinite(age) || age < 0 || age > this.#ttlMs) return undefined;
      return this.#validate(envelope.value);
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: T): Promise<void> {
    await mkdir(this.#directory, { recursive: true });
    const target = join(this.#directory, filenameFor(key));
    const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
    const envelope: CacheEnvelope<T> = {
      version: 1,
      createdAt: this.#now().toISOString(),
      value,
    };
    await writeFile(temporary, JSON.stringify(envelope), { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, target);
  }
}
