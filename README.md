# Release Lens

Release Lens turns GitHub Actions history into an explicit release-health decision. It measures reliability, runtime, queue latency, and flaky recovery; evaluates those metrics against a versioned policy; and emits reports for humans, CI, or code-scanning tools.

The project is intentionally read-only. It requests workflow metadata, evaluates it locally, and never edits a repository or reruns a workflow.

## What it measures

| Metric | Meaning | Default budget |
| --- | --- | ---: |
| `successRate` | Successful terminal attempts | at least 95% |
| `durationP95Ms` | 95th-percentile workflow runtime | at most 15 minutes |
| `queueP95Ms` | 95th-percentile runner queue time | at most 2 minutes |
| `flakyJobRate` | Revisions that fail and later recover | at most 3% |

Reruns are grouped by workflow revision before metrics are calculated. That prevents a recovered retry from being counted as both an independent failure and an independent success.

## Run the CLI

Release Lens requires Node.js 20.11 or newer.

```bash
npm ci --ignore-scripts
npm run build
node dist/cli.js analyze --input workflow-runs.json --format markdown
```

Read live workflow history with a token that has `actions:read` access:

```bash
GITHUB_TOKEN=... node dist/cli.js analyze \
  --repository acme/payments \
  --branch main \
  --policy .release-lens.yml \
  --format sarif \
  --output release-health.sarif
```

Accepted report formats are terminal text, JSON, Markdown, SARIF 2.1.0, and escaped GitHub workflow annotations. Exit code `0` means the error-level budgets passed, `1` means a policy violation, and `2` means the command or input was invalid.

## Detect a regression

JSON reports are versioned artifacts and can be compared without fetching GitHub again:

```bash
node dist/cli.js compare \
  --baseline reports/main.json \
  --current reports/candidate.json \
  --tolerance 5 \
  --output reports/comparison.md
```

The comparison is directional: lower duration, queue time, and flakiness are improvements, while a lower success rate is a regression.

## Use the action

```yaml
permissions:
  actions: read
  contents: read

steps:
  - uses: actions/checkout@v4
  - uses: rezalwll/release-lens@v1
    with:
      branch: main
      policy: .release-lens.yml
      fail-on-budget: true
```

The action writes a Markdown job summary and exposes `passed` and `exit-code` outputs. Set `fail-on-budget: false` to collect a report without blocking the workflow.

## Policy example

```yaml
version: 1
minimumSampleSize: 10
includeBranches: [main]
excludeEvents: [workflow_dispatch]
rules:
  - metric: successRate
    comparison: atLeast
    threshold: 98
    severity: error
  - metric: durationP95Ms
    comparison: atMost
    threshold: 720000
    severity: warning
```

When a metric has fewer observations than `minimumSampleSize`, Release Lens emits a notice instead of making an unsupported budget claim.

## Quality gate

```bash
npm run check
npm audit --audit-level=low
```

The check runs typed ESLint, strict TypeScript, the complete Vitest suite, and the distributable build. Network responses, policy documents, datasets, and stored reports are validated at their boundaries before entering the analysis core.

## License

MIT
