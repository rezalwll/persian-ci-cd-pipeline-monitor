# Architecture

Release Lens separates untrusted I/O from deterministic analysis. The core can evaluate a normalized dataset without a filesystem, network, terminal, or GitHub Actions runtime.

```text
GitHub API / JSON file / stdin
             │
             ▼
     boundary validation
             │ RunDataset
             ▼
 selection → rerun grouping → metrics → policy evaluation
                                      │ AnalysisResult
                                      ▼
                 text / JSON / Markdown / SARIF / annotations
```

## Boundaries

`src/input` owns external data:

- `run-schema` converts GitHub-shaped snake-case payloads into the internal domain model.
- `load-file` and `load-stream` add path, size, and parse context to failures.
- `github-client` applies authentication, URL encoding, hydration, and response schemas.
- `report-schema` validates versioned JSON artifacts before comparison.
- `retry` implements bounded backoff for transient API requests.

No downstream analysis function accepts an unvalidated API payload. Zod schemas are strict, timestamps require offsets, repository identities use `owner/name`, and report help links require HTTPS.

## Analysis pipeline

Run selection first filters branches and excluded trigger events, then establishes stable chronological order. Rerun grouping uses the tuple of workflow path and head SHA; attempts inside each group are sorted by attempt number.

The terminal attempt represents a revision for success rate, runtime, and queue latency. Flakiness uses the full attempt history. Percentiles use linear interpolation over a copied sorted array, keeping caller data immutable.

Policy evaluation is independent from rendering. It produces an `AnalysisResult` with:

- the repository and evaluated window;
- a complete metric record with units and sample counts;
- structured findings with stable rule identifiers;
- one pass/fail verdict based only on error severity.

This result is the contract shared by every reporter and by baseline comparison.

## Commands and runtimes

`analyze` orchestrates evaluation and report selection. `compare` validates two stored reports, calculates directional percentage deltas, and produces a Markdown decision table.

`src/cli.ts` owns command-line parsing, file output, and process exit conventions. `src/action.ts` adapts the same application services to GitHub Action inputs, outputs, and job summaries. Neither runtime duplicates metric logic.

## Failure and security behavior

Operational failures return exit code `2`; budget failures return `1`. Before errors reach stderr, known GitHub token forms and the caller-supplied token are replaced literally. Literal replacement avoids regular-expression interpretation of secret characters.

The file cache writes a temporary validated artifact and renames it atomically. Cache keys become opaque filenames, expired entries are ignored, and corrupt entries do not enter the analysis pipeline.

## Packaging

Tsup creates three ESM entrypoints:

- `dist/index.js` for library consumers;
- `dist/cli.js` for the package binary;
- `dist/action.js` for the Node.js action runtime.

The action bundle and its chunks are committed because GitHub executes `action.yml` directly and does not install the repository. Source maps are omitted from the published surface; declarations are emitted for library users.

## Quality strategy

Unit tests cover pure statistics, time boundaries, grouping, metrics, policy parsing, reporters, redaction, and cache behavior. Contract tests exercise the GitHub client and artifact schemas. CLI and Action tests use temporary files and injected collectors, while the integration test covers the complete dataset-to-versioned-report path.

The quality gate runs lint, strict typechecking, all tests, and a clean distributable build. Dependency auditing is a separate explicit check so advisory database failures are distinguishable from source regressions.

## Extension rules

When adding a metric:

1. extend the domain key and value unit;
2. validate it in policy and report schemas;
3. implement a pure calculation with empty and boundary tests;
4. add it to evaluation and every human/machine reporter;
5. define whether higher or lower values are beneficial for comparisons;
6. document sampling semantics and units.

Keeping these steps explicit prevents a metric from appearing in one output while being absent from policy enforcement or artifact validation.
