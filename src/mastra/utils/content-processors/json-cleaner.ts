import { jsonrepair } from 'jsonrepair';
import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('JsonCleaner');

/**
 * Extracts JSON from various text formats intelligently
 * Strategies: wrapping quotes → markdown blocks → raw text
 */
function extractJsonFromText(text: string): string {
  const extracted = text.trim();

  // Strategy 1: Remove wrapping quotes (single or double)
  // Handles: '{"json"}' or "{"json"}" from LLM
  if (extracted.length >= 2) {
    const firstChar = extracted[0];
    const lastChar = extracted[extracted.length - 1];
    if ((firstChar === '"' || firstChar === "'") && firstChar === lastChar) {
      const inner = extracted.slice(1, -1).trim();
      // Verify it looks like JSON
      if (inner.startsWith('{') || inner.startsWith('[')) {
        return inner;
      }
    }
  }

  // Strategy 2: Extract from markdown code blocks (```json ... ```)
  const jsonBlockMatch = extracted.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }

  // Strategy 3: Extract JSON between first { and last }
  // Handles cases where LLM adds text before/after JSON
  const jsonStartIdx = extracted.indexOf('{');
  const jsonEndIdx = extracted.lastIndexOf('}');

  if (jsonStartIdx !== -1 && jsonEndIdx !== -1 && jsonEndIdx > jsonStartIdx) {
    const potentialJson = extracted.substring(jsonStartIdx, jsonEndIdx + 1);
    // Verify it's valid by checking brace balance (accounting for strings)
    let braceCount = 0;
    let isValid = true;
    let inString = false;
    let escapeNext = false;

    for (const char of potentialJson) {
      // Handle escaped characters
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      // Toggle string state
      if (char === '"') {
        inString = !inString;
        continue;
      }

      // Count braces only outside strings
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        if (braceCount < 0) {
          isValid = false;
          break;
        }
      }
    }

    if (isValid && braceCount === 0) {
      return potentialJson;
    }
  }

  // Strategy 4: Array extraction (for array responses)
  const arrayStartIdx = extracted.indexOf('[');
  const arrayEndIdx = extracted.lastIndexOf(']');

  if (arrayStartIdx !== -1 && arrayEndIdx !== -1 && arrayEndIdx > arrayStartIdx) {
    const potentialArray = extracted.substring(arrayStartIdx, arrayEndIdx + 1);
    return potentialArray;
  }

  // Fallback: return original text for jsonrepair to attempt fixing
  return extracted;
}

export function cleanResponse(text: string, sectionName: string): string {
  try {
    logger.debug('Cleaning response', { sectionName, textLength: text.length });

    // Extract JSON using intelligent strategies
    const extracted = extractJsonFromText(text);
    logger.debug('Extracted JSON content', {
      sectionName,
      originalLength: text.length,
      extractedLength: extracted.length
    });

    // Use json-repair to fix remaining JSON issues
    const clean = jsonrepair(extracted);
    logger.debug('Applied json-repair', { sectionName });

    // Validate output is valid JSON
    JSON.parse(clean);
    logger.debug('Cleaned successfully', { sectionName, cleanLength: clean.length });
    return clean;
  } catch (cleanErr) {
    const err = normalizeError(cleanErr);
    logger.error('Error cleaning response', {
      sectionName,
      error: err.message,
      stack: err.stack
    });
    logger.debug('Raw text sample', {
      sectionName,
      sample: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    });
    throw new Error(`Failed to clean ${sectionName} response: ${err.message}`);
  }
}
