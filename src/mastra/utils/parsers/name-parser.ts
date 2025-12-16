// src/mastra/utils/name-parser.ts
// Robust name parsing utility for handling various name formats

export interface ParsedName {
  firstName: string;
  lastName?: string;
  fullName: string;
}

/**
 * Parse a full name into firstName and lastName components
 * Handles various edge cases and international name formats
 *
 * @param input - Full name string or explicit firstName/lastName
 * @returns ParsedName object with firstName, lastName, and fullName
 *
 * @example
 * parseName("John Doe") // { firstName: "John", lastName: "Doe", fullName: "John Doe" }
 * parseName("Madonna") // { firstName: "Madonna", lastName: undefined, fullName: "Madonna" }
 * parseName("Jean-Claude Van Damme") // { firstName: "Jean-Claude", lastName: "Van Damme", fullName: "..." }
 */
export function parseName(
  input: string | { firstName: string; lastName?: string }
): ParsedName {
  // Case 1: Already parsed (object input)
  if (typeof input === 'object') {
    const { firstName, lastName } = input;
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
    return { firstName, lastName, fullName };
  }

  // Case 2: String input - need to parse
  const trimmed = input.trim();

  // Empty string guard
  if (!trimmed) {
    throw new Error('Name cannot be empty');
  }

  // Single name (e.g., "Madonna", "Cher")
  if (!trimmed.includes(' ')) {
    return { firstName: trimmed, lastName: undefined, fullName: trimmed };
  }

  // Multiple words - need to determine firstName/lastName boundary
  const parts = trimmed.split(/\s+/);

  // Strategy: First word = firstName, rest = lastName
  // This handles most international names correctly:
  // - "John Doe" → firstName: "John", lastName: "Doe"
  // - "Ali Veli Mehmet" → firstName: "Ali", lastName: "Veli Mehmet"
  // - "Jean-Claude Van Damme" → firstName: "Jean-Claude", lastName: "Van Damme"
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');

  return {
    firstName,
    lastName,
    fullName: trimmed,
  };
}

/**
 * Validate if a name string is valid
 * @param name - Name to validate
 * @returns true if valid, false otherwise
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;

  // Check for invalid characters (numbers, special chars except hyphens and apostrophes)
  const invalidChars = /[0-9!@#$%^&*()_+=\[\]{};:"\\|,.<>?/]/;
  if (invalidChars.test(trimmed)) return false;

  return true;
}

/**
 * Normalize name format (title case, trim whitespace)
 * @param name - Name to normalize
 * @returns Normalized name
 *
 * @example
 * normalizeName("john DOE") // "John Doe"
 * normalizeName("  ali   veli  ") // "Ali Veli"
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      // Handle hyphenated names (Jean-Claude)
      return word
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('-');
    })
    .join(' ');
}
