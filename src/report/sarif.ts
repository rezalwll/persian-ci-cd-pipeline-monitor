import type { AnalysisResult, Severity } from '../domain/result.js';

const sarifLevel: Readonly<Record<Severity, 'note' | 'warning' | 'error'>> = {
  notice: 'note',
  warning: 'warning',
  error: 'error',
};

export function toSarif(result: AnalysisResult): object {
  const rules = [...new Map(result.findings.map((finding) => [finding.ruleId, finding])).values()]
    .map((finding) => ({
      id: finding.ruleId,
      name: finding.metric,
      shortDescription: { text: `Release health budget for ${finding.metric}` },
      ...(finding.helpUri === undefined ? {} : { helpUri: finding.helpUri }),
      defaultConfiguration: { level: sarifLevel[finding.severity] },
    }));

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'release-lens',
            semanticVersion: '0.1.0',
            informationUri: 'https://github.com/rezalwll/release-lens',
            rules,
          },
        },
        automationDetails: { id: result.repository },
        results: result.findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: sarifLevel[finding.severity],
          message: { text: finding.message },
          properties: {
            metric: finding.metric,
            actual: finding.actual,
            threshold: finding.threshold,
          },
        })),
      },
    ],
  };
}

export function renderSarif(result: AnalysisResult): string {
  return JSON.stringify(toSarif(result), undefined, 2);
}
