#!/usr/bin/env node
import {
  DEFAULT_TOLERANCE_PERCENT,
  compareResults,
  renderComparisonMarkdown
} from "./chunk-KP7P7JKG.js";
import {
  GitHubActionsClient,
  analyze,
  loadPolicy,
  parseRunDataset,
  safeErrorMessage
} from "./chunk-EQJQBG7X.js";

// src/cli.ts
import { writeFile } from "fs/promises";
import { Command, InvalidArgumentError, Option } from "commander";

// src/input/load-file.ts
import { readFile } from "fs/promises";
import { resolve } from "path";
async function loadDatasetFile(path) {
  const absolutePath = resolve(path);
  let source;
  try {
    source = await readFile(absolutePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read workflow dataset at ${absolutePath}: ${message}`, { cause: error });
  }
  try {
    return parseRunDataset(JSON.parse(source));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid workflow dataset at ${absolutePath}: ${message}`, { cause: error });
  }
}

// src/input/load-report.ts
import { readFile as readFile2 } from "fs/promises";
import { resolve as resolve2 } from "path";

// src/input/report-schema.ts
import { z } from "zod";
var metricKeys = [
  "successRate",
  "durationP95Ms",
  "queueP95Ms",
  "flakyJobRate"
];
var metricSchema = z.object({
  key: z.enum(metricKeys),
  value: z.number().finite().nonnegative(),
  unit: z.enum(["percent", "milliseconds"]),
  sampleSize: z.number().int().nonnegative()
}).strict();
var findingSchema = z.object({
  ruleId: z.string().min(1),
  metric: z.enum(metricKeys),
  severity: z.enum(["notice", "warning", "error"]),
  message: z.string().min(1),
  actual: z.number().finite(),
  threshold: z.number().finite(),
  helpUri: z.string().url().refine((value) => value.startsWith("https://"), {
    message: "Help links must use HTTPS"
  }).optional()
}).strict();
var resultSchema = z.object({
  repository: z.string().regex(/^[^/]+\/[^/]+$/u),
  evaluatedAt: z.string().datetime({ offset: true }),
  window: z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true })
  }).strict(),
  metrics: z.object({
    successRate: metricSchema,
    durationP95Ms: metricSchema,
    queueP95Ms: metricSchema,
    flakyJobRate: metricSchema
  }).strict(),
  findings: z.array(findingSchema),
  passed: z.boolean()
}).strict();
var reportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedBy: z.literal("release-lens"),
  result: resultSchema
}).strict();
function parseJsonReport(input) {
  const report = reportSchema.parse(input);
  for (const key of metricKeys) {
    if (report.result.metrics[key].key !== key) {
      throw new Error(`Metric slot ${key} contains ${report.result.metrics[key].key}`);
    }
  }
  return report.result;
}

// src/input/load-report.ts
async function loadAnalysisReport(path) {
  const absolutePath = resolve2(path);
  let source;
  try {
    source = await readFile2(absolutePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read analysis report at ${absolutePath}: ${message}`, { cause: error });
  }
  try {
    return parseJsonReport(JSON.parse(source));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid analysis report at ${absolutePath}: ${message}`, { cause: error });
  }
}

// src/input/load-stream.ts
var DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
async function loadDatasetStream(stream, maxBytes = DEFAULT_MAX_BYTES) {
  const decoder = new TextDecoder();
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    const encoded = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    bytes += encoded.byteLength;
    if (bytes > maxBytes) {
      throw new RangeError(`Standard input exceeds the ${maxBytes} byte limit`);
    }
    chunks.push(typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true }));
  }
  chunks.push(decoder.decode());
  const source = chunks.join("").trim();
  if (source.length === 0) {
    throw new Error("Standard input did not contain a workflow dataset");
  }
  return parseRunDataset(JSON.parse(source));
}

// src/cli.ts
function parseTolerance(value) {
  const tolerance = Number(value);
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new InvalidArgumentError("tolerance must be a non-negative number");
  }
  return tolerance;
}
async function loadInput(options) {
  if (options.repository !== void 0) {
    const token = process.env["GITHUB_TOKEN"] ?? "";
    return new GitHubActionsClient({ token }).collect(options.repository, options.branch);
  }
  if (options.input === void 0 || options.input === "-") {
    return loadDatasetStream(process.stdin);
  }
  return loadDatasetFile(options.input);
}
async function main(argv = process.argv) {
  let exitCode = 0;
  const program = new Command().name("release-lens").description("Evaluate GitHub Actions release health against explicit budgets").version("0.1.0");
  program.command("analyze", { isDefault: true }).description("analyze workflow history from a file, stdin, or GitHub").option("-i, --input <path>", "JSON dataset path; use - for stdin").option("-r, --repository <owner/repo>", "collect recent runs from GitHub").option("-b, --branch <name>", "branch to collect", "main").addOption(new Option("-f, --format <format>", "report format").choices(["text", "json", "markdown", "sarif", "github"]).default("text")).option("-p, --policy <path>", "explicit JSON or YAML release policy").option("-o, --output <path>", "write report to a file").option("--no-color", "disable ANSI color").action(async (options) => {
    if (options.input !== void 0 && options.repository !== void 0) {
      throw new Error("--input and --repository are mutually exclusive");
    }
    const dataset = await loadInput(options);
    const { policy } = await loadPolicy(options.policy);
    const command = analyze({ dataset, policy, format: options.format, color: options.color });
    if (options.output === void 0) process.stdout.write(`${command.output}
`);
    else await writeFile(options.output, `${command.output}
`, "utf8");
    exitCode = command.exitCode;
  });
  program.command("compare").description("compare two versioned analysis reports").requiredOption("--baseline <path>", "baseline JSON report").requiredOption("--current <path>", "current JSON report").option(
    "-t, --tolerance <percent>",
    "allowed directional regression percentage",
    parseTolerance,
    DEFAULT_TOLERANCE_PERCENT
  ).option("-o, --output <path>", "write the Markdown comparison to a file").action(async (options) => {
    const [baseline, current] = await Promise.all([
      loadAnalysisReport(options.baseline),
      loadAnalysisReport(options.current)
    ]);
    const comparison = compareResults(baseline, current, options.tolerance);
    const output = renderComparisonMarkdown(comparison);
    if (options.output === void 0) process.stdout.write(`${output}
`);
    else await writeFile(options.output, `${output}
`, "utf8");
    exitCode = comparison.passed ? 0 : 1;
  });
  try {
    await program.parseAsync([...argv], { from: "node" });
    return exitCode;
  } catch (error) {
    const token = process.env["GITHUB_TOKEN"];
    process.stderr.write(`release-lens: ${safeErrorMessage(error, token === void 0 ? [] : [token])}
`);
    return 2;
  }
}
var entryPath = process.argv[1];
if (entryPath !== void 0 && import.meta.url === `file://${entryPath.replaceAll("\\", "/")}`) {
  process.exitCode = await main();
}
export {
  main
};
