import type { WorkflowRun } from '../../src/domain/run.js';

export const runFixture = {
  repository: 'acme/payments',
  generated_at: '2025-03-10T08:00:00Z',
  runs: [
    {
      id: 101,
      name: 'release',
      path: '.github/workflows/release.yml',
      head_branch: 'main',
      head_sha: 'a1b2c3d4e5f6a7b8',
      event: 'push',
      conclusion: 'success',
      created_at: '2025-03-10T07:00:00Z',
      run_started_at: '2025-03-10T07:00:30Z',
      updated_at: '2025-03-10T07:08:30Z',
      run_attempt: 1,
      jobs: [
        {
          id: 201,
          name: 'verify',
          conclusion: 'success',
          started_at: '2025-03-10T07:00:35Z',
          completed_at: '2025-03-10T07:05:00Z',
          runner_name: 'GitHub Actions 2',
          run_attempt: 1,
        },
        {
          id: 202,
          name: 'publish',
          conclusion: 'success',
          started_at: '2025-03-10T07:05:05Z',
          completed_at: '2025-03-10T07:08:25Z',
          run_attempt: 1,
        },
      ],
    },
  ],
} as const;

export function makeRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: 1,
    name: 'release',
    workflowPath: '.github/workflows/release.yml',
    headBranch: 'main',
    headSha: '0123456789abcdef',
    event: 'push',
    conclusion: 'success',
    createdAt: '2025-01-01T10:00:00Z',
    runStartedAt: '2025-01-01T10:00:30Z',
    updatedAt: '2025-01-01T10:10:00Z',
    attempt: 1,
    jobs: [],
    ...overrides,
  };
}
