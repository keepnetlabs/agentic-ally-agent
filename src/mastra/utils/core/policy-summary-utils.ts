import { truncateText } from './text-utils';

export const POLICY_SUMMARY_TIMEOUT_MS = 60000;
export const MAX_POLICY_INPUT_CHARS = 24000;

export interface PolicyFallbackOptions {
  maxExcerptSections?: number;
  excerptMaxChars?: number;
}

/**
 * Fallback summary used when AI summarization fails.
 * Produces an excerpt-based plain text summary that is safe and bounded.
 */
export function buildHeuristicPolicySummary(
  fullPolicy: string,
  options: PolicyFallbackOptions = {}
): string {
  const cleaned = fullPolicy.trim();
  if (cleaned.length === 0) {
    return '';
  }

  const maxExcerptSections = options.maxExcerptSections ?? 5;
  const excerptMaxChars = options.excerptMaxChars ?? 1200;

  const chunks = cleaned.split(/\n\s*---\s*\n/g).filter((c) => c.trim().length > 0);
  const topChunks = chunks
    .slice(0, maxExcerptSections)
    .map((c) => truncateText(c, excerptMaxChars, 'policy section excerpt'));

  return [
    'COMPANY POLICY SUMMARY (fallback, heuristic)',
    '',
    'Note: Automated summarization was unavailable. The text below is an excerpt-based fallback for context only.',
    '',
    ...topChunks.map((c, i) => `SECTION ${i + 1} EXCERPT:\n${c}`),
  ].join('\n');
}


