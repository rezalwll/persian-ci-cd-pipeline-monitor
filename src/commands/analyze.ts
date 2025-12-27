import { defaultPolicy, type ReleasePolicy } from '../domain/policy.js';
import { evaluateDataset } from '../analysis/evaluate.js';
import type { RunDataset } from '../domain/run.js';
import { renderGitHubAnnotations } from '../report/github.js';
import { renderJson } from '../report/json.js';
import { renderMarkdown } from '../report/markdown.js';
import { renderSarif } from '../report/sarif.js';
import { renderText } from '../report/text.js';

export type OutputFormat = 'text' | 'json' | 'markdown' | 'sarif' | 'github';

export interface AnalyzeRequest {
  readonly dataset: RunDataset;
  readonly policy?: ReleasePolicy;
  readonly format?: OutputFormat;
  readonly color?: boolean;
}

export interface CommandResult {
  readonly output: string;
  readonly exitCode: 0 | 1;
}

export function analyze(request: AnalyzeRequest): CommandResult {
  const result = evaluateDataset(request.dataset, request.policy ?? defaultPolicy);
  const format = request.format ?? 'text';
  const output = (() => {
    switch (format) {
      case 'text': return renderText(result, request.color ?? false);
      case 'json': return renderJson(result);
      case 'markdown': return renderMarkdown(result);
      case 'sarif': return renderSarif(result);
      case 'github': return renderGitHubAnnotations(result);
    }
  })();

  return { output, exitCode: result.passed ? 0 : 1 };
}
