#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { Command, InvalidArgumentError, Option } from 'commander';
import { analyze, type OutputFormat } from './commands/analyze.js';
import { compareResults, DEFAULT_TOLERANCE_PERCENT, renderComparisonMarkdown } from './commands/compare.js';
import { loadPolicy } from './config/load-policy.js';
import { GitHubActionsClient } from './input/github-client.js';
import { loadDatasetFile } from './input/load-file.js';
import { loadAnalysisReport } from './input/load-report.js';
import { loadDatasetStream } from './input/load-stream.js';
import { safeErrorMessage } from './security/redact.js';

interface AnalyzeOptions {
  readonly input?: string;
  readonly repository?: string;
  readonly branch: string;
  readonly format: OutputFormat;
  readonly output?: string;
  readonly policy?: string;
  readonly color: boolean;
}

interface CompareOptions {
  readonly baseline: string;
  readonly current: string;
  readonly tolerance: number;
  readonly output?: string;
}

function parseTolerance(value: string): number {
  const tolerance = Number(value);
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new InvalidArgumentError('tolerance must be a non-negative number');
  }
  return tolerance;
}

async function loadInput(options: AnalyzeOptions): Promise<Awaited<ReturnType<typeof loadDatasetFile>>> {
  if (options.repository !== undefined) {
    const token = process.env['GITHUB_TOKEN'] ?? '';
    return new GitHubActionsClient({ token }).collect(options.repository, options.branch);
  }
  if (options.input === undefined || options.input === '-') {
    return loadDatasetStream(process.stdin);
  }
  return loadDatasetFile(options.input);
}

export async function main(argv: readonly string[] = process.argv): Promise<number> {
  let exitCode = 0;
  const program = new Command()
    .name('release-lens')
    .description('Evaluate GitHub Actions release health against explicit budgets')
    .version('0.1.0');

  program.command('analyze', { isDefault: true })
    .description('analyze workflow history from a file, stdin, or GitHub')
    .option('-i, --input <path>', 'JSON dataset path; use - for stdin')
    .option('-r, --repository <owner/repo>', 'collect recent runs from GitHub')
    .option('-b, --branch <name>', 'branch to collect', 'main')
    .addOption(new Option('-f, --format <format>', 'report format')
      .choices(['text', 'json', 'markdown', 'sarif', 'github'])
      .default('text'))
    .option('-p, --policy <path>', 'explicit JSON or YAML release policy')
    .option('-o, --output <path>', 'write report to a file')
    .option('--no-color', 'disable ANSI color')
    .action(async (options: AnalyzeOptions) => {
      if (options.input !== undefined && options.repository !== undefined) {
        throw new Error('--input and --repository are mutually exclusive');
      }
      const dataset = await loadInput(options);
      const { policy } = await loadPolicy(options.policy);
      const command = analyze({ dataset, policy, format: options.format, color: options.color });
      if (options.output === undefined) process.stdout.write(`${command.output}\n`);
      else await writeFile(options.output, `${command.output}\n`, 'utf8');
      exitCode = command.exitCode;
    });

  program.command('compare')
    .description('compare two versioned analysis reports')
    .requiredOption('--baseline <path>', 'baseline JSON report')
    .requiredOption('--current <path>', 'current JSON report')
    .option(
      '-t, --tolerance <percent>',
      'allowed directional regression percentage',
      parseTolerance,
      DEFAULT_TOLERANCE_PERCENT,
    )
    .option('-o, --output <path>', 'write the Markdown comparison to a file')
    .action(async (options: CompareOptions) => {
      const [baseline, current] = await Promise.all([
        loadAnalysisReport(options.baseline),
        loadAnalysisReport(options.current),
      ]);
      const comparison = compareResults(baseline, current, options.tolerance);
      const output = renderComparisonMarkdown(comparison);
      if (options.output === undefined) process.stdout.write(`${output}\n`);
      else await writeFile(options.output, `${output}\n`, 'utf8');
      exitCode = comparison.passed ? 0 : 1;
    });

  try {
    await program.parseAsync([...argv], { from: 'node' });
    return exitCode;
  } catch (error) {
    const token = process.env['GITHUB_TOKEN'];
    process.stderr.write(`release-lens: ${safeErrorMessage(error, token === undefined ? [] : [token])}\n`);
    return 2;
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === `file://${entryPath.replaceAll('\\', '/')}`) {
  process.exitCode = await main();
}
