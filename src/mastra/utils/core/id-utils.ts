// src/mastra/utils/core/id-utils.ts
// Centralized ID validation/normalization helpers (token-efficient + consistent across tools)

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


