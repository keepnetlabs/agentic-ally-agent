/**
 * Post-Rewrite Quality Check (QC)
 *
 * After all scenes are localized, runs a single AI quality check
 * on user-facing text fields. Only sends visible content (titles,
 * subtitles, descriptions, key_messages, action texts) — not the
 * full JSON. AI returns only paths that need correction.
 *
 * Cost: 1 lightweight AI call per localization (only if source ≠ target language).
 * If QC fails or finds nothing, original output is returned unchanged.
 */

import { trackedGenerateText } from '../core/tracked-generate';
import { cleanResponse } from '../content-processors/json-cleaner';
import { getLanguagePrompt } from '../language/localization-language-rules';
import { EXTRACTION_PARAMS } from '../config/llm-generation-params';
import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';
import type { LanguageModel } from '../../types/language-model';

const logger = getLogger('PostRewriteQC');

/** User-facing field keys to extract for quality check */
const USER_FACING_KEYS = new Set([
  'title', 'subtitle', 'sectionTitle', 'text',
  'description', 'tip', 'callToActionText', 'successCallToActionText',
  'statement', 'explanation', 'mobileHint',
  'feedbackCorrect', 'feedbackWrong',
  'completionTitle', 'completionSubtitle',
  'motivationalTitle', 'motivationalMessage',
  'ratingQuestion', 'topicsQuestion', 'feedbackQuestion',
  'actionsTitle', 'transcriptTitle',
  'ctaLocked', 'ctaUnlocked',
  'submitButton', 'reportButton', 'cancelButton',
]);

/** Keys to always skip (metadata, technical) */
const SKIP_KEYS = new Set([
  'scientific_basis', 'scene_type', 'iconName', 'sparkleIconName', 'sceneIconName',
  'id', 'type', 'isCorrect', 'correctAnswer', 'points', 'duration_seconds',
  'totalCount', 'maxAttempts', 'src', 'poster', 'url',
  'hasAchievementNotification', 'disableForwardSeek', 'showTranscript',
  'transcript', 'transcriptLanguage', 'transcriptTitle',
  'app', 'app_texts', 'ariaTexts',
]);

interface TextEntry {
  path: string;
  value: string;
}

/**
 * Recursively extract user-facing text values from the localized JSON.
 * Only picks fields that end users see (titles, descriptions, etc.).
 */
function extractUserFacingTexts(
  obj: unknown,
  path = '',
  results: TextEntry[] = []
): TextEntry[] {
  if (!obj || typeof obj !== 'object') return results;

  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (SKIP_KEYS.has(key)) continue;

    const currentPath = path ? `${path}.${key}` : key;

    if (typeof val === 'string' && val.trim().length > 0 && USER_FACING_KEYS.has(key)) {
      results.push({ path: currentPath, value: val });
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        if (typeof item === 'string' && val.length <= 5) {
          // key_message arrays etc.
          results.push({ path: `${currentPath}[${idx}]`, value: item });
        } else if (typeof item === 'object' && item !== null) {
          extractUserFacingTexts(item, `${currentPath}[${idx}]`, results);
        }
      });
    } else if (typeof val === 'object' && val !== null) {
      extractUserFacingTexts(val, currentPath, results);
    }
  }

  return results;
}

/**
 * Set a value in a nested object by dot-bracket path (e.g., "1.highlights[0].text").
 */
function setByPath(obj: Record<string, unknown>, path: string, value: string): void {
  // Convert bracket notation to dot notation: "key[0].sub" → ["key", "0", "sub"]
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[parts[i]];
    } else {
      return; // path doesn't exist
    }
  }

  if (current && typeof current === 'object') {
    (current as Record<string, unknown>)[parts[parts.length - 1]] = value;
  }
}

/**
 * Run post-rewrite quality check on the combined localized output.
 *
 * Extracts user-facing texts, sends them to AI for review,
 * and patches any corrections back into the output.
 *
 * @param combinedResult - The full localized JSON (all scenes combined)
 * @param sourceLanguage - Source language code (e.g., "en-gb")
 * @param targetLanguage - Target language code (e.g., "da")
 * @param model - AI model to use for QC
 * @returns Patched result (or original if QC finds nothing / fails)
 */
export async function runPostRewriteQC(
  combinedResult: Record<string, unknown>,
  sourceLanguage: string,
  targetLanguage: string,
  model: LanguageModel
): Promise<Record<string, unknown>> {
  // Skip same-language pairs
  const sourceBase = sourceLanguage.split('-')[0].toLowerCase();
  const targetBase = targetLanguage.split('-')[0].toLowerCase();
  if (sourceBase === targetBase) return combinedResult;

  // Extract user-facing texts
  const entries = extractUserFacingTexts(combinedResult);
  if (entries.length === 0) return combinedResult;

  logger.debug('Running post-rewrite QC', {
    targetLanguage,
    fieldsToCheck: entries.length,
  });

  // Build compact review list (index: value)
  const reviewList = entries
    .map((e, i) => `${i}: "${e.value}"`)
    .join('\n');

  const languageRules = getLanguagePrompt(targetLanguage);

  const prompt = `You are a ${targetLanguage} localization QA reviewer for cybersecurity training content.

Review each numbered text below. These should ALL be in natural ${targetLanguage}.

${languageRules}

CHECK EACH LINE FOR:
1. Untranslated English words/phrases that should be in ${targetLanguage}
2. Words from neighboring/related languages (not ${targetLanguage})
3. Quoted English text inside scenarios (e.g., email subjects, button labels, error messages) — these must ALSO be in ${targetLanguage} because the learner sees them in the training UI

FOR EACH LINE:
- If the text is correct ${targetLanguage} (including accepted loanwords) → skip it
- If it contains words that should be translated → return the index and FULL corrected text

Return ONLY a JSON object with corrections. Keys = index numbers (as strings), values = corrected text.
If EVERYTHING is correct, return empty object: {}

TEXTS TO REVIEW:
${reviewList}

Output (JSON only):`;

  try {
    const response = await trackedGenerateText('post-rewrite-qc', {
      model,
      messages: [
        {
          role: 'system',
          content: `You review ${targetLanguage} localization quality. Return ONLY valid JSON. Empty {} means all OK.`,
        },
        { role: 'user', content: prompt },
      ],
      ...EXTRACTION_PARAMS,
    });

    const cleaned = cleanResponse(response.text, 'post-rewrite-qc');
    const corrections = JSON.parse(cleaned) as Record<string, string>;

    // Count actual corrections (ignore empty/OK responses)
    const correctionEntries = Object.entries(corrections).filter(
      ([, val]) => val && val !== 'OK' && val !== 'ok'
    );

    if (correctionEntries.length === 0) {
      logger.debug('Post-rewrite QC passed — no corrections needed', { targetLanguage });
      return combinedResult;
    }

    // Apply corrections
    const patched = JSON.parse(JSON.stringify(combinedResult)) as Record<string, unknown>;
    let appliedCount = 0;

    for (const [indexStr, correctedValue] of correctionEntries) {
      const idx = parseInt(indexStr, 10);
      if (isNaN(idx) || idx >= entries.length) continue;

      const entry = entries[idx];
      setByPath(patched, entry.path, correctedValue);
      appliedCount++;

      logger.debug('QC correction applied', {
        path: entry.path,
        original: entry.value.substring(0, 50),
        corrected: correctedValue.substring(0, 50),
      });
    }

    logger.info('Post-rewrite QC corrections applied', {
      targetLanguage,
      totalChecked: entries.length,
      corrected: appliedCount,
    });

    return patched;
  } catch (error) {
    // QC failed — not critical, return original
    const err = normalizeError(error);
    logger.warn('Post-rewrite QC failed, returning original', { error: err.message });
    return combinedResult;
  }
}
