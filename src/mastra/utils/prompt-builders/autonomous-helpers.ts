// src/mastra/utils/prompt-builders/autonomous-helpers.ts
/**
 * Shared helper functions and constants for autonomous prompts
 * Centralizes common logic to follow DRY principle
 */

/**
 * Helper: Get language or default to en-gb
 */
export function getLanguageOrDefault(language?: string): string {
  return language || 'en-gb';
}

/**
 * Helper: Build language requirement block (DRY)
 */
export function buildLanguageRequirementBlock(toolName: string, language?: string): string {
  const lang = getLanguageOrDefault(language);
  return `**🔴 CRITICAL: LANGUAGE REQUIREMENT**
- ALL content MUST be generated in: **${lang}** (BCP-47 code)
- This is NOT optional - user expects content in this language
- When calling ${toolName}, INCLUDE THIS LANGUAGE in your instructions`;
}

/**
 * Example IDs for clarity in prompts (constants for consistency)
 */
export const EXAMPLE_IDS = {
  phishing: {
    generated: 'yl2JfA4r5yYl',
    resource: 'scenario-abc-123456',
  },
  training: {
    generated: 'ml-generate-xyz123',
    resource: 'resource-train-789xyz',
  },
} as const;
