/**
 * Text Utilities
 *
 * Shared helpers for safe text shaping before sending to models or prompts.
 * Keep this dependency-free to avoid circular imports in core modules.
 */

/**
 * Truncate text to a maximum character count, with a standardized notice suffix.
 * - Trims whitespace
 * - Preserves the beginning of the text (most important for context)
 */
export function truncateText(input: string, maxChars: number, label: string = 'text'): string {
  const trimmed = input.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars).trim()}\n\n[TRUNCATED: ${label} exceeded ${maxChars} characters]`;
}
