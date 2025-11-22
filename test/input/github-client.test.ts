import { describe, expect, it } from 'vitest';
import { GitHubActionsClient } from '../../src/input/github-client.js';
import { runFixture } from '../fixtures/run-data.js';

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('GitHubActionsClient', () => {
  it('hydrates runs with jobs and authenticates every request', async () => {
    const requests: { url: string; authorization?: string }[] = [];
    const fetchStub: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = init?.headers as Record<string, string>;
      requests.push({ url, authorization: headers.authorization });
      return url.includes('/jobs?')
        ? jsonResponse({ jobs: runFixture.runs[0].jobs })
        : jsonResponse({ workflow_runs: [{ ...runFixture.runs[0], jobs: undefined }] });
    };
    const client = new GitHubActionsClient({
      token: 'secret-token',
      fetch: fetchStub,
      apiUrl: 'https://github.example/api/v3/',
      now: () => new Date('2025-11-01T00:00:00Z'),
    });

    const dataset = await client.collect('acme/payments');

    expect(dataset.generatedAt).toBe('2025-11-01T00:00:00.000Z');
    expect(dataset.runs[0]?.jobs).toHaveLength(2);
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.authorization === 'Bearer secret-token')).toBe(true);
  });

  it('surfaces status and request id for API failures', async () => {
    const client = new GitHubActionsClient({
      token: 'secret-token',
      fetch: async () => jsonResponse({ message: 'rate limited' }, 403, { 'x-github-request-id': 'REQ-42' }),
    });

    await expect(client.collect('acme/payments')).rejects.toThrow('403 (REQ-42)');
  });

  it('rejects an empty token before issuing requests', () => {
    expect(() => new GitHubActionsClient({ token: '  ' })).toThrow('token is required');
  });
});
