import {
  GitHubActionsClient,
  analyze,
  loadPolicy,
  safeErrorMessage
} from "./chunk-EQJQBG7X.js";

// src/action.ts
import { appendFile as appendFile2 } from "fs/promises";
import { pathToFileURL } from "url";

// src/report/step-summary.ts
import { appendFile } from "fs/promises";
var MAX_SUMMARY_BYTES = 1048576;
async function appendGitHubStepSummary(markdown, path = process.env["GITHUB_STEP_SUMMARY"]) {
  if (path === void 0 || path.trim().length === 0) return false;
  const content = markdown.endsWith("\n") ? markdown : `${markdown}
`;
  if (Buffer.byteLength(content, "utf8") > MAX_SUMMARY_BYTES) {
    throw new RangeError("GitHub step summary exceeds the one-megabyte safety limit");
  }
  await appendFile(path, content, "utf8");
  return true;
}

// src/action.ts
function optional(value) {
  const normalized = value?.trim();
  return normalized === void 0 || normalized.length === 0 ? void 0 : normalized;
}
function booleanInput(value, fallback) {
  const normalized = optional(value)?.toLowerCase();
  if (normalized === void 0) return fallback;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new TypeError(`Expected a boolean action input, received ${normalized}`);
}
function parseActionInputs(environment = process.env) {
  const repository = optional(environment["INPUT_REPOSITORY"]) ?? optional(environment["GITHUB_REPOSITORY"]);
  const token = optional(environment["INPUT_TOKEN"]) ?? optional(environment["GITHUB_TOKEN"]);
  if (repository === void 0 || !/^[^/]+\/[^/]+$/u.test(repository)) {
    throw new TypeError("repository must use the owner/name format");
  }
  if (token === void 0) throw new TypeError("token is required");
  const policyPath = optional(environment["INPUT_POLICY"]);
  return {
    repository,
    branch: optional(environment["INPUT_BRANCH"]) ?? "main",
    ...policyPath === void 0 ? {} : { policyPath },
    failOnBudget: booleanInput(environment["INPUT_FAIL-ON-BUDGET"], true),
    token
  };
}
async function writeOutput(name, value, path) {
  if (path === void 0 || path.trim().length === 0) return;
  await appendFile2(path, `${name}=${value}
`, "utf8");
}
async function runAction(dependencies = {}) {
  const environment = dependencies.environment ?? process.env;
  const inputs = parseActionInputs(environment);
  const collect = dependencies.collect ?? (async (repository, branch, token) => new GitHubActionsClient({ token }).collect(repository, branch));
  const [{ policy }, dataset] = await Promise.all([
    loadPolicy(inputs.policyPath),
    collect(inputs.repository, inputs.branch, inputs.token)
  ]);
  const command = analyze({ dataset, policy, format: "markdown" });
  await appendGitHubStepSummary(command.output, environment["GITHUB_STEP_SUMMARY"]);
  await Promise.all([
    writeOutput("passed", String(command.exitCode === 0), environment["GITHUB_OUTPUT"]),
    writeOutput("exit-code", String(command.exitCode), environment["GITHUB_OUTPUT"])
  ]);
  process.stdout.write(`${command.output}
`);
  return inputs.failOnBudget ? command.exitCode : 0;
}
var entryPath = process.argv[1];
if (entryPath !== void 0 && import.meta.url === pathToFileURL(entryPath).href) {
  try {
    process.exitCode = await runAction();
  } catch (error) {
    const token = process.env["INPUT_TOKEN"] ?? process.env["GITHUB_TOKEN"];
    process.stderr.write(`release-lens: ${safeErrorMessage(error, token === void 0 ? [] : [token])}
`);
    process.exitCode = 2;
  }
}

export {
  appendGitHubStepSummary,
  parseActionInputs,
  runAction
};
