/**
 * Language validation utilities for production-grade input validation
 */

import { z } from 'zod';

/**
 * BCP-47 language code pattern (e.g., en, en-US, zh-CN, pt-BR)
 * Supports:
 * - Primary language: 2-3 lowercase letters (en, pt, chi)
 * - Optional region: 2 uppercase letters or 3 digits (US, BR, 001)
 */
const BCP47_PATTERN = /^[a-z]{2,3}(-[A-Z]{2}|-[0-9]{3})?$/;

/**
 * Relaxed pattern for normalization (accepts various cases)
 * Will be normalized to proper BCP-47 format
 */
const BCP47_RELAXED_PATTERN = /^[a-z]{2,3}(-[a-z0-9]{2,3})?$/i;

/**
 * Common language codes for better error messages
 */
const COMMON_LANGUAGE_CODES = [
  'en-US', 'en-GB', 'tr-TR', 'de-DE', 'fr-FR', 'es-ES', 'it-IT',
  'pt-BR', 'pt-PT', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'ar-SA',
  'ru-RU', 'hi-IN', 'vi-VN', 'th-TH', 'pl-PL', 'nl-NL', 'sv-SE'
];

/**
 * Normalize language code to BCP-47 format
 * Examples:
 * - "en-us" → "en-US"
 * - "TR-tr" → "tr-TR"
 * - "zh-cn" → "zh-CN"
 */
export function normalizeBCP47(code: string): string {
  const trimmed = code.trim();

  // Split on hyphen
  const parts = trimmed.split('-');

  if (parts.length === 1) {
    // Primary language only: lowercase
    return parts[0].toLowerCase();
  }

  if (parts.length === 2) {
    // Language-Region: language lowercase, region uppercase
    const language = parts[0].toLowerCase();
    const region = parts[1].toUpperCase();
    return `${language}-${region}`;
  }

  // Invalid format
  return trimmed;
}

/**
 * Zod schema for BCP-47 language code with production-grade validation
 */
export const LanguageCodeSchema = z
  .string()
  .trim()
  .min(2, 'Language code must be at least 2 characters')
  .max(10, 'Language code must be at most 10 characters')
  .refine(
    (code) => BCP47_RELAXED_PATTERN.test(code),
    {
      message: `Invalid language code format. Must be BCP-47 (e.g., ${COMMON_LANGUAGE_CODES.slice(0, 5).join(', ')})`
    }
  )
  .transform(normalizeBCP47)
  .refine(
    (code) => BCP47_PATTERN.test(code),
    {
      message: 'Language code must follow BCP-47 format after normalization'
    }
  );

/**
 * Zod schema for language codes that must differ (source vs target)
 * Usage: z.object({ source: LanguageCodeSchema, target: LanguageCodeSchemaDifferent('source') })
 */
export function createDifferentLanguageSchema(_otherFieldName: string) {
  return z
    .string()
    .trim()
    .min(2, 'Language code must be at least 2 characters')
    .max(10, 'Language code must be at most 10 characters')
    .refine(
      (code) => BCP47_RELAXED_PATTERN.test(code),
      {
        message: `Invalid language code format. Must be BCP-47 (e.g., ${COMMON_LANGUAGE_CODES.slice(0, 5).join(', ')})`
      }
    )
    .transform(normalizeBCP47);
}

/**
 * Validate that two language codes are different (for refinement)
 */
export function validateLanguagesDifferent(
  source: string,
  target: string
): boolean {
  const normalizedSource = normalizeBCP47(source);
  const normalizedTarget = normalizeBCP47(target);
  return normalizedSource.toLowerCase() !== normalizedTarget.toLowerCase();
}
