// src/domain/policy.ts
var DEFAULT_MINIMUM_SAMPLE_SIZE = 5;
var DEFAULT_SUCCESS_RATE_PERCENT = 95;
var DEFAULT_DURATION_BUDGET_MINUTES = 15;
var SECONDS_PER_MINUTE = 60;
var DEFAULT_FLAKY_JOB_RATE_PERCENT = 3;
var defaultPolicy = {
  version: 1,
  minimumSampleSize: DEFAULT_MINIMUM_SAMPLE_SIZE,
  includeBranches: ["main", "master"],
  excludeEvents: ["workflow_dispatch"],
  rules: [
    {
      metric: "successRate",
      comparison: "atLeast",
      threshold: DEFAULT_SUCCESS_RATE_PERCENT,
      severity: "error"
    },
    {
      metric: "durationP95Ms",
      comparison: "atMost",
      threshold: DEFAULT_DURATION_BUDGET_MINUTES * SECONDS_PER_MINUTE * 1e3,
      severity: "warning"
    },
    {
      metric: "queueP95Ms",
      comparison: "atMost",
      threshold: 2 * SECONDS_PER_MINUTE * 1e3,
      severity: "warning"
    },
    {
      metric: "flakyJobRate",
      comparison: "atMost",
      threshold: DEFAULT_FLAKY_JOB_RATE_PERCENT,
      severity: "error"
    }
  ]
};

// src/analysis/duration.ts
function durationBetween(start, end) {
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new TypeError("Duration boundaries must be valid ISO timestamps");
  }
  if (endTime < startTime) {
    throw new RangeError("A duration cannot end before it starts");
  }
  return endTime - startTime;
}
function runDurationMs(run) {
  return durationBetween(run.runStartedAt, run.updatedAt);
}
function queueDurationMs(run) {
  return durationBetween(run.createdAt, run.runStartedAt);
}

// src/analysis/group-runs.ts
function attemptKey(run) {
  return `${run.workflowPath}:${run.headSha}`;
}
function groupRunAttempts(runs) {
  const grouped = /* @__PURE__ */ new Map();
  for (const run of runs) {
    const key = attemptKey(run);
    const attempts = grouped.get(key) ?? [];
    attempts.push(run);
    grouped.set(key, attempts);
  }
  return [...grouped.entries()].map(([key, attempts]) => ({
    key,
    workflowPath: attempts[0]?.workflowPath ?? "",
    headSha: attempts[0]?.headSha ?? "",
    attempts: [...attempts].sort((left, right) => left.attempt - right.attempt)
  })).sort((left, right) => left.key.localeCompare(right.key));
}

// src/analysis/statistics.ts
function assertFiniteSample(values) {
  if (values.length === 0) {
    throw new RangeError("A statistical sample cannot be empty");
  }
  if (values.some((value) => !Number.isFinite(value))) {
    throw new TypeError("A statistical sample must contain only finite numbers");
  }
}
function percentile(values, quantile) {
  assertFiniteSample(values);
  if (!Number.isFinite(quantile) || quantile < 0 || quantile > 1) {
    throw new RangeError("A quantile must be between zero and one");
  }
  const sorted = [...values].sort((left, right) => left - right);
  const rank = (sorted.length - 1) * quantile;
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const lower = sorted[lowerIndex] ?? 0;
  const upper = sorted[upperIndex] ?? lower;
  return lower + (upper - lower) * (rank - lowerIndex);
}

// src/analysis/metrics.ts
var P95_QUANTILE = 0.95;
function percent(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator * 100;
}
function terminalRuns(runs) {
  return groupRunAttempts(runs).flatMap((group) => group.attempts.at(-1) ?? []);
}
function calculateSuccessRate(runs) {
  const terminal = terminalRuns(runs);
  const successful = terminal.filter((run) => run.conclusion === "success").length;
  return {
    key: "successRate",
    value: percent(successful, terminal.length),
    unit: "percent",
    sampleSize: terminal.length
  };
}
function calculateDurationP95(runs) {
  const durations = terminalRuns(runs).map(runDurationMs);
  return {
    key: "durationP95Ms",
    value: durations.length === 0 ? 0 : percentile(durations, P95_QUANTILE),
    unit: "milliseconds",
    sampleSize: durations.length
  };
}
function calculateFlakyJobRate(runs) {
  const groups = groupRunAttempts(runs);
  const flakyGroups = groups.filter((group) => {
    const terminal = group.attempts.at(-1);
    const priorAttempts = group.attempts.slice(0, -1);
    return terminal?.conclusion === "success" && priorAttempts.some((attempt) => attempt.conclusion === "failure" || attempt.conclusion === "timed_out");
  });
  return {
    key: "flakyJobRate",
    value: percent(flakyGroups.length, groups.length),
    unit: "percent",
    sampleSize: groups.length
  };
}
function calculateQueueP95(runs) {
  const queueTimes = terminalRuns(runs).map(queueDurationMs);
  return {
    key: "queueP95Ms",
    value: queueTimes.length === 0 ? 0 : percentile(queueTimes, P95_QUANTILE),
    unit: "milliseconds",
    sampleSize: queueTimes.length
  };
}

// src/analysis/select-runs.ts
function selectRuns(runs, policy) {
  const branches = new Set(policy.includeBranches);
  const excludedEvents = new Set(policy.excludeEvents);
  return runs.filter((run) => branches.has(run.headBranch)).filter((run) => !excludedEvents.has(run.event)).toSorted((left, right) => {
    const chronological = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return chronological === 0 ? left.id - right.id : chronological;
  });
}

// src/analysis/evaluate.ts
function violates(rule, metric) {
  return rule.comparison === "atLeast" ? metric.value < rule.threshold : metric.value > rule.threshold;
}
function findingFor(rule, metric, minimumSampleSize) {
  if (metric.sampleSize < minimumSampleSize) {
    return {
      ruleId: `sample.${rule.metric}`,
      metric: rule.metric,
      severity: "notice",
      message: `${rule.metric} needs ${minimumSampleSize} observations; received ${metric.sampleSize}`,
      actual: metric.sampleSize,
      threshold: minimumSampleSize,
      helpUri: "https://github.com/rezalwll/release-lens#sample-size"
    };
  }
  if (!violates(rule, metric)) {
    return void 0;
  }
  const direction = rule.comparison === "atLeast" ? "at least" : "at most";
  return {
    ruleId: `budget.${rule.metric}`,
    metric: rule.metric,
    severity: rule.severity,
    message: `${rule.metric} is ${metric.value}; expected ${direction} ${rule.threshold}`,
    actual: metric.value,
    threshold: rule.threshold,
    helpUri: `https://github.com/rezalwll/release-lens#${rule.metric.toLowerCase()}`
  };
}
function analysisWindow(runs, fallback) {
  return {
    from: runs[0]?.createdAt ?? fallback,
    to: runs.at(-1)?.updatedAt ?? fallback
  };
}
function evaluateDataset(dataset, policy = defaultPolicy) {
  const runs = selectRuns(dataset.runs, policy);
  const metrics = {
    successRate: calculateSuccessRate(runs),
    durationP95Ms: calculateDurationP95(runs),
    queueP95Ms: calculateQueueP95(runs),
    flakyJobRate: calculateFlakyJobRate(runs)
  };
  const findings = policy.rules.flatMap((rule) => {
    const finding = findingFor(rule, metrics[rule.metric], policy.minimumSampleSize);
    return finding === void 0 ? [] : [finding];
  });
  return {
    repository: dataset.repository,
    evaluatedAt: dataset.generatedAt,
    window: analysisWindow(runs, dataset.generatedAt),
    metrics,
    findings,
    passed: !findings.some((finding) => finding.severity === "error")
  };
}

// src/report/github.ts
var commandFor = {
  notice: "notice",
  warning: "warning",
  error: "error"
};
function escapeData(value) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}
function escapeProperty(value) {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}
function renderGitHubAnnotations(result) {
  return result.findings.map((finding) => {
    const command = commandFor[finding.severity];
    const title = escapeProperty(`Release Lens: ${finding.ruleId}`);
    return `::${command} title=${title}::${escapeData(finding.message)}`;
  }).join("\n");
}

// src/report/json.ts
function toJsonReport(result) {
  return {
    schemaVersion: 1,
    generatedBy: "release-lens",
    result
  };
}
function renderJson(result, pretty = true) {
  return JSON.stringify(toJsonReport(result), void 0, pretty ? 2 : void 0);
}

// src/report/markdown.ts
function formatValue(metric) {
  return metric.unit === "percent" ? `${metric.value.toFixed(1)}%` : `${Math.round(metric.value)} ms`;
}
function escapeCell(value) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
function renderMarkdown(result) {
  const icon = result.passed ? "\u2705" : "\u274C";
  const metricRows = Object.values(result.metrics).map(
    (metric) => `| ${metric.key} | ${formatValue(metric)} | ${metric.sampleSize} |`
  );
  const findingRows = result.findings.length === 0 ? ["| \u2014 | notice | No policy findings |"] : result.findings.map(
    (finding) => `| \`${finding.ruleId}\` | ${finding.severity} | ${escapeCell(finding.message)} |`
  );
  return [
    `## ${icon} Release Lens: ${result.repository}`,
    "",
    `**Window:** ${result.window.from} \u2192 ${result.window.to}`,
    "",
    "| Metric | Value | Samples |",
    "| --- | ---: | ---: |",
    ...metricRows,
    "",
    "| Rule | Severity | Finding |",
    "| --- | --- | --- |",
    ...findingRows,
    "",
    `**Verdict:** ${result.passed ? "PASS" : "FAIL"}`
  ].join("\n");
}

// src/report/sarif.ts
var sarifLevel = {
  notice: "note",
  warning: "warning",
  error: "error"
};
function toSarif(result) {
  const rules = [...new Map(result.findings.map((finding) => [finding.ruleId, finding])).values()].map((finding) => ({
    id: finding.ruleId,
    name: finding.metric,
    shortDescription: { text: `Release health budget for ${finding.metric}` },
    ...finding.helpUri === void 0 ? {} : { helpUri: finding.helpUri },
    defaultConfiguration: { level: sarifLevel[finding.severity] }
  }));
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "release-lens",
            semanticVersion: "0.1.0",
            informationUri: "https://github.com/rezalwll/release-lens",
            rules
          }
        },
        automationDetails: { id: result.repository },
        results: result.findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: sarifLevel[finding.severity],
          message: { text: finding.message },
          properties: {
            metric: finding.metric,
            actual: finding.actual,
            threshold: finding.threshold
          }
        }))
      }
    ]
  };
}
function renderSarif(result) {
  return JSON.stringify(toSarif(result), void 0, 2);
}

// src/report/text.ts
import pc from "picocolors";
var severityLabel = {
  notice: "NOTICE",
  warning: "WARN",
  error: "ERROR"
};
var MILLISECONDS_PER_MINUTE = 6e4;
var METRIC_LABEL_WIDTH = 18;
var METRIC_VALUE_WIDTH = 8;
function formatValue2(metric) {
  if (metric.unit === "percent") {
    return `${metric.value.toFixed(1)}%`;
  }
  return metric.value >= MILLISECONDS_PER_MINUTE ? `${(metric.value / MILLISECONDS_PER_MINUTE).toFixed(1)}m` : `${Math.round(metric.value / 1e3)}s`;
}
function colorSeverity(severity, value, color) {
  if (!color) return value;
  if (severity === "error") return pc.red(value);
  if (severity === "warning") return pc.yellow(value);
  return pc.cyan(value);
}
function renderText(result, color = false) {
  const metricLines = Object.values(result.metrics).map(
    (metric) => `  ${metric.key.padEnd(METRIC_LABEL_WIDTH)} ${formatValue2(metric).padStart(METRIC_VALUE_WIDTH)}  n=${metric.sampleSize}`
  );
  const findingLines = result.findings.length === 0 ? ["  No policy findings."] : result.findings.map((finding) => colorSeverity(
    finding.severity,
    `  [${severityLabel[finding.severity]}] ${finding.message}`,
    color
  ));
  const plainVerdict = result.passed ? "PASS" : "FAIL";
  const verdict = color ? result.passed ? pc.green(plainVerdict) : pc.red(plainVerdict) : plainVerdict;
  return [
    `Release Lens \xB7 ${result.repository}`,
    `Window: ${result.window.from} \u2192 ${result.window.to}`,
    "",
    ...metricLines,
    "",
    ...findingLines,
    "",
    `Verdict: ${verdict}`
  ].join("\n");
}

// src/commands/analyze.ts
function analyze(request) {
  const result = evaluateDataset(request.dataset, request.policy ?? defaultPolicy);
  const format = request.format ?? "text";
  const output = (() => {
    switch (format) {
      case "text":
        return renderText(result, request.color ?? false);
      case "json":
        return renderJson(result);
      case "markdown":
        return renderMarkdown(result);
      case "sarif":
        return renderSarif(result);
      case "github":
        return renderGitHubAnnotations(result);
    }
  })();
  return { output, exitCode: result.passed ? 0 : 1 };
}

// src/config/parse-policy.ts
import { extname } from "path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
var metricSchema = z.enum([
  "successRate",
  "durationP95Ms",
  "queueP95Ms",
  "flakyJobRate"
]);
var ruleSchema = z.object({
  metric: metricSchema,
  comparison: z.enum(["atLeast", "atMost"]),
  threshold: z.number().finite().nonnegative(),
  severity: z.enum(["notice", "warning", "error"])
}).strict();
var policySchema = z.object({
  version: z.literal(1).default(1),
  minimumSampleSize: z.number().int().positive().default(defaultPolicy.minimumSampleSize),
  includeBranches: z.array(z.string().min(1)).default([...defaultPolicy.includeBranches]),
  excludeEvents: z.array(z.string().min(1)).default([...defaultPolicy.excludeEvents]),
  rules: z.array(ruleSchema).min(1).default([...defaultPolicy.rules])
}).strict();
function parseDocument(source, filename) {
  const extension = extname(filename).toLowerCase();
  if (extension === ".yaml" || extension === ".yml") {
    return parseYaml(source);
  }
  return JSON.parse(source);
}
function parsePolicy(source, filename = "release-lens.config.json") {
  const document = parseDocument(source, filename);
  return policySchema.parse(document);
}

// src/config/load-policy.ts
import { readFile } from "fs/promises";
import { isAbsolute, join, resolve } from "path";
var CANDIDATES = [
  ".release-lens.yml",
  ".release-lens.yaml",
  ".release-lens.json",
  "release-lens.config.yml",
  "release-lens.config.yaml",
  "release-lens.config.json"
];
async function readable(path) {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}
async function loadPolicy(explicitPath, cwd = process.cwd()) {
  const path = explicitPath === void 0 ? (await Promise.all(CANDIDATES.map(async (name) => {
    const candidate = join(cwd, name);
    return await readable(candidate) ? candidate : null;
  }))).find((candidate) => candidate !== null) ?? null : isAbsolute(explicitPath) ? explicitPath : resolve(cwd, explicitPath);
  if (path === null) return { policy: defaultPolicy, path: null };
  try {
    const source = await readFile(path, "utf8");
    return { policy: parsePolicy(source, path), path };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to load release policy at ${path}: ${message}`, { cause: error });
  }
}

// src/input/github-client.ts
import { z as z3 } from "zod";

// src/input/run-schema.ts
import { z as z2 } from "zod";
var conclusionSchema = z2.enum([
  "success",
  "failure",
  "cancelled",
  "timed_out",
  "skipped",
  "neutral",
  "action_required"
]);
var MINIMUM_SHORT_SHA_LENGTH = 7;
var jobSchema = z2.object({
  id: z2.number().int().positive(),
  name: z2.string().min(1),
  conclusion: conclusionSchema.exclude(["action_required"]),
  started_at: z2.string().datetime({ offset: true }),
  completed_at: z2.string().datetime({ offset: true }),
  runner_name: z2.string().min(1).optional(),
  run_attempt: z2.number().int().positive().optional()
}).strict();
var runSchema = z2.object({
  id: z2.number().int().positive(),
  name: z2.string().min(1),
  path: z2.string().min(1),
  head_branch: z2.string().min(1),
  head_sha: z2.string().min(MINIMUM_SHORT_SHA_LENGTH),
  event: z2.string().min(1),
  conclusion: conclusionSchema,
  created_at: z2.string().datetime({ offset: true }),
  run_started_at: z2.string().datetime({ offset: true }),
  updated_at: z2.string().datetime({ offset: true }),
  run_attempt: z2.number().int().positive(),
  jobs: z2.array(jobSchema)
}).strict();
var datasetSchema = z2.object({
  repository: z2.string().regex(/^[^/]+\/[^/]+$/u),
  generated_at: z2.string().datetime({ offset: true }),
  runs: z2.array(runSchema)
}).strict();
function parseRunDataset(input) {
  const data = datasetSchema.parse(input);
  return {
    repository: data.repository,
    generatedAt: data.generated_at,
    runs: data.runs.map((run) => ({
      id: run.id,
      name: run.name,
      workflowPath: run.path,
      headBranch: run.head_branch,
      headSha: run.head_sha,
      event: run.event,
      conclusion: run.conclusion,
      createdAt: run.created_at,
      runStartedAt: run.run_started_at,
      updatedAt: run.updated_at,
      attempt: run.run_attempt,
      jobs: run.jobs.map((job) => ({
        id: job.id,
        name: job.name,
        conclusion: job.conclusion,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        ...job.runner_name === void 0 ? {} : { runnerName: job.runner_name },
        ...job.run_attempt === void 0 ? {} : { attempt: job.run_attempt }
      }))
    }))
  };
}

// src/input/github-client.ts
var jobSchema2 = z3.object({
  id: z3.number(),
  name: z3.string(),
  conclusion: z3.string(),
  started_at: z3.string(),
  completed_at: z3.string(),
  runner_name: z3.string().nullable().optional(),
  run_attempt: z3.number().optional()
});
var runSchema2 = z3.object({
  id: z3.number(),
  name: z3.string(),
  path: z3.string(),
  head_branch: z3.string(),
  head_sha: z3.string(),
  event: z3.string(),
  conclusion: z3.string(),
  created_at: z3.string(),
  run_started_at: z3.string(),
  updated_at: z3.string(),
  run_attempt: z3.number()
});
var runPageSchema = z3.object({ workflow_runs: z3.array(runSchema2) });
var jobPageSchema = z3.object({ jobs: z3.array(jobSchema2) });
var GitHubActionsClient = class {
  #fetch;
  #apiUrl;
  #now;
  #headers;
  constructor(options) {
    if (options.token.trim().length === 0) throw new Error("A GitHub token is required");
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#apiUrl = (options.apiUrl ?? "https://api.github.com").replace(/\/$/u, "");
    this.#now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.#headers = {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${options.token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "release-lens/0.1.0"
    };
  }
  async #json(path) {
    const response = await this.#fetch(`${this.#apiUrl}${path}`, { headers: this.#headers });
    if (!response.ok) {
      const requestId = response.headers.get("x-github-request-id");
      throw new Error(`GitHub API returned ${response.status}${requestId === null ? "" : ` (${requestId})`}`);
    }
    const body = await response.json();
    return body;
  }
  async collect(repository, branch = "main", limit = 100) {
    const encodedRepository = repository.split("/").map(encodeURIComponent).join("/");
    const runs = runPageSchema.parse(await this.#json(
      `/repos/${encodedRepository}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=${String(Math.min(limit, 100))}`
    )).workflow_runs.slice(0, limit);
    const hydrated = await Promise.all(runs.map(async (run) => {
      const jobs = jobPageSchema.parse(await this.#json(
        `/repos/${encodedRepository}/actions/runs/${String(run.id)}/jobs?per_page=100`
      )).jobs;
      return {
        ...run,
        jobs: jobs.map((job) => ({
          ...job,
          ...job.runner_name === null ? { runner_name: void 0 } : {}
        }))
      };
    }));
    return parseRunDataset({
      repository,
      generated_at: this.#now().toISOString(),
      runs: hydrated
    });
  }
};

// src/security/redact.ts
var TOKEN_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/gu,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/gu,
  /\bBearer\s+[A-Za-z0-9._~-]{12,}\b/giu
];
var MINIMUM_SECRET_LENGTH = 5;
function redactText(source, secrets = []) {
  let redacted = source;
  for (const pattern of TOKEN_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  for (const secret of [...secrets].filter((value) => value.length >= MINIMUM_SECRET_LENGTH).toSorted(
    (left, right) => right.length - left.length
  )) {
    redacted = redacted.replaceAll(secret, "[REDACTED]");
  }
  return redacted;
}
function safeErrorMessage(error, secrets = []) {
  const message = error instanceof Error ? error.message : String(error);
  return redactText(message, secrets);
}

export {
  evaluateDataset,
  analyze,
  parsePolicy,
  loadPolicy,
  parseRunDataset,
  GitHubActionsClient,
  safeErrorMessage
};
