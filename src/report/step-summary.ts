import { appendFile } from 'node:fs/promises';

const MAX_SUMMARY_BYTES = 1_048_576;

export async function appendGitHubStepSummary(
  markdown: string,
  path = process.env['GITHUB_STEP_SUMMARY'],
): Promise<boolean> {
  if (path === undefined || path.trim().length === 0) return false;

  const content = markdown.endsWith('\n') ? markdown : `${markdown}\n`;
  if (Buffer.byteLength(content, 'utf8') > MAX_SUMMARY_BYTES) {
    throw new RangeError('GitHub step summary exceeds the one-megabyte safety limit');
  }

  await appendFile(path, content, 'utf8');
  return true;
}
