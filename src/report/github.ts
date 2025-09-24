import type { AnalysisResult, Severity } from '../domain/result.js';

const commandFor: Readonly<Record<Severity, 'notice' | 'warning' | 'error'>> = {
  notice: 'notice',
  warning: 'warning',
  error: 'error',
};

function escapeData(value: string): string {
  return value
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');
}

function escapeProperty(value: string): string {
  return escapeData(value)
    .replaceAll(':', '%3A')
    .replaceAll(',', '%2C');
}

export function renderGitHubAnnotations(result: AnalysisResult): string {
  return result.findings.map((finding) => {
    const command = commandFor[finding.severity];
    const title = escapeProperty(`Release Lens: ${finding.ruleId}`);
    return `::${command} title=${title}::${escapeData(finding.message)}`;
  }).join('\n');
}
