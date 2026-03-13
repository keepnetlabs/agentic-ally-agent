/**
 * Email Merge Tag Normalizer
 *
 * Fixes typos in Keepnet merge tags using Levenshtein distance fuzzy matching.
 * Catches both user typos ({PHISHINggg}) and AI hallucinations ({PHISHING_URL}).
 *
 * Runs as a post-processor after AI output — deterministic, no false positives
 * thanks to conservative distance threshold (max 40% of tag length).
 */

const VALID_MERGE_TAGS = [
  '{FULLNAME}',
  '{FIRSTNAME}',
  '{LASTNAME}',
  '{EMAIL}',
  '{PHISHINGURL}',
  '{FROMNAME}',
  '{FROMEMAIL}',
  '{SUBJECT}',
  '{DATEEMAILSENT}',
  '{COMPANYLOGO}',
  '{COMPANYNAME}',
  '{DATE_SENT}',
  '{CURRENT_DATE}',
  '{CURRENT_DATE_PLUS_10_DAYS}',
  '{CURRENT_DATE_MINUS_10_DAYS}',
  '{RANDOM_NUMBER_1_DIGIT}',
  '{RANDOM_NUMBER_2_DIGITS}',
  '{RANDOM_NUMBER_3_DIGITS}',
  // Landing page specific
  '{USERLANGUAGE}',
  '{USERDEPARTMENT}',
] as const;

const VALID_TAG_SET = new Set<string>(VALID_MERGE_TAGS);

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function findClosestTag(input: string): string | undefined {
  // Already valid — no fix needed
  if (VALID_TAG_SET.has(input)) return undefined;

  const upper = input.toUpperCase();

  // Exact match after uppercasing (e.g. {phishingurl} → {PHISHINGURL})
  if (VALID_TAG_SET.has(upper)) return upper;

  let bestTag: string | undefined;
  let bestDist = Infinity;

  for (const tag of VALID_MERGE_TAGS) {
    const dist = levenshtein(upper, tag);
    if (dist < bestDist) {
      bestDist = dist;
      bestTag = tag;
    }
  }

  if (!bestTag) return undefined;

  // Conservative threshold: max 40% of the tag length to avoid false positives
  // e.g. {PHISHINGURL} (13 chars) → max distance 5
  // e.g. {EMAIL} (7 chars) → max distance 2
  const maxAllowed = Math.floor(bestTag.length * 0.4);
  return bestDist <= maxAllowed ? bestTag : undefined;
}

/**
 * Finds all `{...}` tokens in HTML and fixes typos by fuzzy-matching
 * against the known Keepnet merge tag list.
 *
 * Returns the corrected HTML and a list of corrections made.
 */
export function normalizeEmailMergeTags(html: string): {
  html: string;
  corrections: Array<{ from: string; to: string }>;
} {
  if (!html || typeof html !== 'string') return { html, corrections: [] };

  const corrections: Array<{ from: string; to: string }> = [];

  // Pass 0: Fix duplicate braces — {PHISHINGURL}} → {PHISHINGURL}, {{FIRSTNAME} → {FIRSTNAME}
  let result = html.replace(/\{\{([A-Za-z0-9_]+)\}\}|\{\{([A-Za-z0-9_]+)\}|\{([A-Za-z0-9_]+)\}\}/g, (match, both, leading, trailing) => {
    const inner = both ?? leading ?? trailing;
    const normalized = `{${inner}}`;
    if (VALID_TAG_SET.has(normalized) || VALID_TAG_SET.has(normalized.toUpperCase())) {
      corrections.push({ from: match, to: normalized.toUpperCase() });
      return normalized.toUpperCase();
    }
    return match;
  });

  // Pass 1: Match properly closed {WORD} patterns
  result = result.replace(/\{([A-Za-z0-9_]+)\}/g, (match) => {
    if (VALID_TAG_SET.has(match)) return match;

    const closest = findClosestTag(match);
    if (closest) {
      corrections.push({ from: match, to: closest });
      return closest;
    }

    return match;
  });

  // Pass 2: Match unclosed {WORD patterns (missing closing brace)
  // Only fix if the token fuzzy-matches a known tag — avoids touching CSS/VML braces
  result = result.replace(/\{([A-Za-z0-9_]{4,})(?=[^}A-Za-z0-9_]|$)/g, (match, inner) => {
    const candidate = `{${inner}}`;
    if (VALID_TAG_SET.has(candidate.toUpperCase())) {
      corrections.push({ from: match, to: candidate.toUpperCase() });
      return candidate.toUpperCase();
    }

    const closest = findClosestTag(candidate);
    if (closest) {
      corrections.push({ from: match, to: closest });
      return closest;
    }

    return match;
  });

  return { html: result, corrections };
}
