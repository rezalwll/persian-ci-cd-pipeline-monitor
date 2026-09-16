import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { analyze } from './commands/analyze.js';
import { loadPolicy } from './config/load-policy.js';
import type { RunDataset } from './domain/run.js';
import { GitHubActionsClient } from './input/github-client.js';
import { appendGitHubStepSummary } from './report/step-summary.js';
import { safeErrorMessage } from './security/redact.js';

export interface ActionInputs {
  readonly repository: string;
  readonly branch: string;
  readonly policyPath?: string;
  readonly failOnBudget: boolean;
  readonly token: string;
}

export interface ActionDependencies {
  readonly collect?: (repository: string, branch: string, token: string) => Promise<RunDataset>;
  readonly environment?: NodeJS.ProcessEnv;
}

function optional(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function booleanInput(value: string | undefined, fallback: boolean): boolean {
  const normalized = optional(value)?.toLowerCase();
  if (normalized === undefined) return fallback;
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new TypeError(`Expected a boolean action input, received ${normalized}`);
}

export function parseActionInputs(environment: NodeJS.ProcessEnv = process.env): ActionInputs {
  const repository = optional(environment['INPUT_REPOSITORY'])
    ?? optional(environment['GITHUB_REPOSITORY']);
  const token = optional(environment['INPUT_TOKEN'])
    ?? optional(environment['GITHUB_TOKEN']);
  if (repository === undefined || !/^[^/]+\/[^/]+$/u.test(repository)) {
    throw new TypeError('repository must use the owner/name format');
  }
  if (token === undefined) throw new TypeError('token is required');

  const policyPath = optional(environment['INPUT_POLICY']);
  return {
    repository,
    branch: optional(environment['INPUT_BRANCH']) ?? 'main',
    ...(policyPath === undefined ? {} : { policyPath }),
    failOnBudget: booleanInput(environment['INPUT_FAIL-ON-BUDGET'], true),
    token,
  };
}

async function writeOutput(name: string, value: string, path: string | undefined): Promise<void> {
  if (path === undefined || path.trim().length === 0) return;
  await appendFile(path, `${name}=${value}\n`, 'utf8');
}

export async function runAction(dependencies: ActionDependencies = {}): Promise<number> {
  const environment = dependencies.environment ?? process.env;
  const inputs = parseActionInputs(environment);
  const collect = dependencies.collect ?? (async (repository, branch, token) => (
    new GitHubActionsClient({ token }).collect(repository, branch)
  ));
  const [{ policy }, dataset] = await Promise.all([
    loadPolicy(inputs.policyPath),
    collect(inputs.repository, inputs.branch, inputs.token),
  ]);
  const command = analyze({ dataset, policy, format: 'markdown' });
  await appendGitHubStepSummary(command.output, environment['GITHUB_STEP_SUMMARY']);
  await Promise.all([
    writeOutput('passed', String(command.exitCode === 0), environment['GITHUB_OUTPUT']),
    writeOutput('exit-code', String(command.exitCode), environment['GITHUB_OUTPUT']),
  ]);
  process.stdout.write(`${command.output}\n`);
  return inputs.failOnBudget ? command.exitCode : 0;
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  try {
    process.exitCode = await runAction();
  } catch (error) {
    const token = process.env['INPUT_TOKEN'] ?? process.env['GITHUB_TOKEN'];
    process.stderr.write(`release-lens: ${safeErrorMessage(error, token === undefined ? [] : [token])}\n`);
    process.exitCode = 2;
  }
}
