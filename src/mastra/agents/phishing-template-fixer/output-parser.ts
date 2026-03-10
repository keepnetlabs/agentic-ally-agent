/**
 * Phishing Template Fixer — Output Parser & Validator
 *
 * Parses the raw LLM response using the project's existing JSON cleaner,
 * then validates against the Zod schema. Handles common LLM output quirks:
 *   - Markdown code blocks (```json ... ```)
 *   - Leading/trailing text around JSON
 *   - Malformed JSON (via jsonrepair)
 *   - Schema validation with actionable error messages
 *
 * Two distinct flows:
 *   - email_template: Full output (fixed_html, change_log, tags, difficulty, from_address, from_name, subject)
 *   - landing_page:   Classification only (tags, difficulty, domain, change_log)
 */

import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import {
  EmailTemplateFixerOutputSchema,
  LandingPageClassifierOutputSchema,
  type PhishingTemplateFixerOutput,
  type LandingPageClassifierOutput,
  type PhishingTemplateFixerType,
} from './types';

// ============================================
// RESULT TYPES
// ============================================

export type EmailParseResult =
  | { success: true; data: PhishingTemplateFixerOutput }
  | { success: false; error: string; raw: string };

export type LandingPageParseResult =
  | { success: true; data: LandingPageClassifierOutput }
  | { success: false; error: string; raw: string };

export type ParseResult = EmailParseResult | LandingPageParseResult;

// ============================================
// PUBLIC API
// ============================================

/**
 * Parses and validates the raw LLM output for email templates.
 * Returns full output: fixed_html, change_log, tags, difficulty, from_address.
 */
export function parseEmailTemplateOutput(raw: string): EmailParseResult {
  return parseAndValidate(raw, EmailTemplateFixerOutputSchema);
}

/**
 * Parses and validates the raw LLM output for landing page classification.
 * Returns classification only: tags, difficulty, domain.
 */
export function parseLandingPageOutput(raw: string): LandingPageParseResult {
  return parseAndValidate(raw, LandingPageClassifierOutputSchema);
}

/**
 * Legacy unified parser — routes to the correct parser based on type.
 * Kept for backward compatibility with existing route code.
 */
export function parsePhishingTemplateFixerOutput(
  raw: string,
  type: PhishingTemplateFixerType
): ParseResult {
  return type === 'email_template'
    ? parseEmailTemplateOutput(raw)
    : parseLandingPageOutput(raw);
}

// ============================================
// INTERNAL
// ============================================

function parseAndValidate<T>(raw: string, schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ path: (string | number)[]; message: string }> } } }): { success: true; data: T } | { success: false; error: string; raw: string } {
  if (!raw || !raw.trim()) {
    return { success: false, error: 'Empty response from LLM', raw: raw || '' };
  }

  // Step 1: Clean and extract JSON using project's existing utility
  let cleaned: string;
  try {
    cleaned = cleanResponse(raw, 'phishing-template-fixer');
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'JSON extraction failed',
      raw: raw.slice(0, 500),
    };
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      success: false,
      error: 'JSON.parse failed after cleaning',
      raw: cleaned.slice(0, 500),
    };
  }

  // Step 3: Validate against Zod schema
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    return {
      success: false,
      error: `Schema validation failed: ${issues}`,
      raw: cleaned.slice(0, 500),
    };
  }

  return { success: true, data: result.data };
}
