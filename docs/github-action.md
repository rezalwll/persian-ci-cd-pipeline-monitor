# GitHub Action integration

Release Lens can run as a JavaScript action in the repository being evaluated. The checked-in bundle targets the Node.js 20 action runtime, so consumer workflows do not install dependencies or execute package lifecycle scripts.

## Minimal gate

```yaml
name: Release health

on:
  workflow_dispatch:
  pull_request:
    branches: [main]

permissions:
  actions: read
  contents: read

jobs:
  release-health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - id: lens
        uses: rezalwll/release-lens@v1
        with:
          branch: main
          policy: .release-lens.yml

      - if: always()
        run: echo "passed=${{ steps.lens.outputs.passed }}"
```

The checkout step is required only when the policy is stored in the caller repository. Live run data comes from the GitHub Actions API.

## Inputs

| Input | Required | Default | Notes |
| --- | --- | --- | --- |
| `token` | no | `${{ github.token }}` | Needs read access to Actions metadata |
| `repository` | no | `${{ github.repository }}` | Must use `owner/name` form |
| `branch` | no | `main` | Limits API collection to one branch |
| `policy` | no | discovered policy/defaults | Relative paths use the workspace |
| `fail-on-budget` | no | `true` | Set to `false` for advisory reporting |

Boolean inputs accept only `true` or `false`. Invalid values and malformed repository names fail with exit code `2` instead of silently changing behavior.

## Outputs and summary

The action appends one bounded Markdown block to `$GITHUB_STEP_SUMMARY` and writes two single-line outputs:

- `passed` is `true` when no error-level finding exists.
- `exit-code` is the underlying policy result (`0` or `1`).

The summary writer refuses content above one megabyte, appends a final newline, and is a no-op outside GitHub Actions. This keeps local library use independent from CI environment variables.

## Advisory rollout

Start with a nonblocking observation job:

```yaml
- id: lens
  uses: rezalwll/release-lens@v1
  with:
    policy: .release-lens.yml
    fail-on-budget: false

- if: steps.lens.outputs.passed != 'true'
  run: echo "Release budgets need attention" >&2
```

Once the sampling window is representative and the thresholds reflect the service, remove `fail-on-budget: false`. The same policy then becomes an enforceable gate without changing its measurement semantics.

## Reusable workflow

The repository also includes `.github/workflows/release-lens.yml` for organizations that prefer a centrally called workflow. The JavaScript action is faster for individual jobs; the reusable workflow additionally owns artifact upload and enforcement steps.

## Security model

- The default token remains in process memory and is never written to a report.
- Error messages redact the active token plus known GitHub token formats.
- Repository and branch values are encoded before entering API URLs.
- API payloads, local datasets, policies, and cached reports are schema-validated.
- The action requires no write permission and does not execute data from analyzed workflows.

For private repositories, grant the narrowest token that can read workflow runs. Do not use a personal access token when the scoped workflow token is sufficient.
