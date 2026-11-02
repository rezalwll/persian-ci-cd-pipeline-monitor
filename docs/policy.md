# Policy reference

A Release Lens policy is a strict JSON or YAML document. Unknown fields are rejected so a misspelled budget cannot silently fall back to a default.

## Discovery order

Pass `--policy <path>` when a workflow needs an explicit contract. Without that option, the CLI checks the working directory in this order:

1. `.release-lens.yml`
2. `.release-lens.yaml`
3. `.release-lens.json`
4. `release-lens.config.yml`
5. `release-lens.config.yaml`
6. `release-lens.config.json`

If none exists, the built-in policy is used. Relative explicit paths are resolved from the current working directory.

## Top-level fields

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `version` | literal `1` | `1` | Selects the policy contract |
| `minimumSampleSize` | positive integer | `5` | Avoids conclusions from a tiny sample |
| `includeBranches` | string array | `main`, `master` | Keeps runs from selected branches |
| `excludeEvents` | string array | `workflow_dispatch` | Removes nonrepresentative trigger types |
| `rules` | nonempty rule array | built-in budgets | Maps metrics to thresholds and severity |

Every rule has four required fields:

```yaml
metric: queueP95Ms
comparison: atMost
threshold: 90000
severity: warning
```

- `metric` is one of `successRate`, `durationP95Ms`, `queueP95Ms`, or `flakyJobRate`.
- `comparison` is `atLeast` or `atMost`.
- `threshold` is a finite, nonnegative number. Time metrics use milliseconds; rate metrics use percentages from 0 to 100.
- `severity` is `notice`, `warning`, or `error`. Only error findings make the policy exit with code `1`.

## Sample-size behavior

Each metric reports its own sample count. When that count is below `minimumSampleSize`, Release Lens emits a `sample.<metric>` notice and does not evaluate that metric's threshold. This is deliberate: an absent or undersized dataset is not treated as evidence that a release is healthy.

## Filtering and reruns

Runs are sorted chronologically after branch and event filtering. Attempts that share a workflow path and head SHA form one revision group. Success rate and latency use the terminal attempt in each group. Flakiness uses the whole group and records a recovery only when an earlier failure or timeout is followed by a successful terminal attempt.

## Recommended profiles

For a busy production service, start with a larger sample and strict error budgets:

```yaml
version: 1
minimumSampleSize: 30
includeBranches: [main]
excludeEvents: [workflow_dispatch, schedule]
rules:
  - metric: successRate
    comparison: atLeast
    threshold: 98
    severity: error
  - metric: durationP95Ms
    comparison: atMost
    threshold: 600000
    severity: warning
  - metric: queueP95Ms
    comparison: atMost
    threshold: 120000
    severity: warning
  - metric: flakyJobRate
    comparison: atMost
    threshold: 2
    severity: error
```

For a new repository, keep the same target values but lower `minimumSampleSize` only when the team understands the increased uncertainty. A warning budget is useful during observation; promote it to an error once it is ready to block releases.

## Versioning

Policy version `1` is parsed strictly and is independent from the package version. A future incompatible policy shape will receive a new integer version instead of changing version `1` in place.
