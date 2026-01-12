import { v4 as uuidv4 } from 'uuid';

/**
 * Conservative "safe id" format used for platform resource IDs and internal artifact IDs.
 * - Alphanumeric + underscore + hyphen
 * - Minimum length: 3
 */
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{3,}$/;

/**
 * Returns true if the value looks like a safe platform/artifact identifier.
 * Intentionally rejects common placeholder patterns like "[USER-...]" to avoid assignment failures.
 */
export function isSafeId(value: string): boolean {
    const v = String(value ?? '').trim();
    if (v === '') return false;
    if (v.includes('[USER-')) return false;
    return SAFE_ID_REGEX.test(v);
}

/**
 * Normalizes an arbitrary value into a safe ID string (or undefined if invalid).
 * Useful when building deterministic [ARTIFACT_IDS] blocks.
 */
export function normalizeSafeId(value: unknown): string | undefined {
    const v = String(value ?? '').trim();
    if (!v) return undefined;
    if (!isSafeId(v)) return undefined;
    return v;
}

/**
 * Generates a unique, collision-safe resource identifier.
 * Uses robust UUID v4 standard.
 * @returns string UUID
 */
export function generateUniqueId(): string {
    return uuidv4();
}

/**
 * Generates a URL-friendly, collision-safe ID based on a text slug.
 * Format: "slug-text-uuidsegment"
 * Useful for microlearning IDs, file paths, etc.
 * @param text The text to slugify (e.g. topic title)
 * @returns string
 */
export function generateSlugId(text: string): string {
    const slug = text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')         // Spaces to hyphens
        .replace(/-+/g, '-')          // Collapse hyphens
        .substring(0, 50);            // Truncate to avoid too long IDs

    // Append 8-char random suffix from UUID for entropy (sufficient for this context)
    const uniqueSuffix = uuidv4().split('-')[0]; // First segment (8 chars)

    return `${slug}-${uniqueSuffix}`;
}


