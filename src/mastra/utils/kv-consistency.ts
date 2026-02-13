/**
 * KV Consistency Check Utility
 * 
 * Verifies that KV keys are available after writes to ensure eventual consistency.
 * Uses exponential backoff: 500ms → 1s → 2s
 * 
 * @module utils/kv-consistency
 */

import { CLOUDFLARE_KV } from '../constants';
import { KVService } from '../services/kv-service';
import { getLogger } from './core/logger';
import { normalizeError, logErrorInfo } from './core/error-utils';
import { errorService } from '../services/error-service';

const logger = getLogger('KVConsistency');

/**
 * Calculate exponential backoff delay: 500ms → 1s → 2s
 */
function getBackoffDelay(attempt: number): number {
    const config = CLOUDFLARE_KV.CONSISTENCY_CHECK;
    const delay = config.INITIAL_DELAY_MS * Math.pow(2, attempt);
    return Math.min(delay, config.MAX_DELAY_MS);
}

/**
 * Waits for KV keys to be available, verifying eventual consistency
 * 
 * This function polls KV storage to ensure keys are readable after write operations.
 * Uses a configurable interval (default 1 second) to avoid Cloudflare rate limiting.
 * 
 * @param resourceId - The resource ID being checked (microlearningId or phishingId)
 * @param expectedKeys - Array of KV keys that should be available
 * @param namespaceIdOverride - Optional KV namespace ID override (for phishing namespace)
 * @returns Promise that resolves when all keys are available or max wait time is reached
 * 
 * @example
 * ```typescript
 * await waitForKVConsistency('phishing-101', [
 *   'ml:phishing-101:base',
 *   'ml:phishing-101:lang:en-gb',
 *   'ml:phishing-101:inbox:it:en-gb'
 * ]);
 * 
 * // For phishing with custom namespace
 * await waitForKVConsistency('uuid-123', [...keys], 'phishing-namespace-id');
 * ```
 */
export async function waitForKVConsistency(
    resourceId: string,
    expectedKeys: string[],
    namespaceIdOverride?: string
): Promise<void> {
    // Skip if consistency check is disabled
    if (!CLOUDFLARE_KV.CONSISTENCY_CHECK.ENABLED) {
        logger.debug('KV consistency check disabled, skipping', { resourceId });
        return;
    }

    const maxWait = CLOUDFLARE_KV.CONSISTENCY_CHECK.MAX_WAIT_MS;
    const kvService = namespaceIdOverride ? new KVService(namespaceIdOverride) : new KVService();
    const startTime = Date.now();

    logger.info('Starting KV consistency check', {
        resourceId,
        keyCount: expectedKeys.length,
        maxWaitMs: maxWait,
    });

    // Max 6 attempts with exponential backoff (500ms → 1s → 2s → 2s → 2s → 2s)
    for (let attempt = 0; attempt < 6; attempt++) {
        // Check if we've exceeded max wait time
        if (Date.now() - startTime >= maxWait) {
            break;
        }

        try {
            // Check all keys in parallel
            const results = await Promise.all(
                expectedKeys.map(async (key) => {
                    const value = await kvService.get(key);
                    return { key, exists: value !== null };
                })
            );

            const allPresent = results.every((r) => r.exists);

            if (allPresent) {
                const duration = Date.now() - startTime;
                logger.info('KV consistency verified', {
                    resourceId,
                    attempt: attempt + 1,
                    durationMs: duration,
                });
                return;
            }

            // Wait with exponential backoff before next check
            if (attempt < 5) {
                const delay = getBackoffDelay(attempt);
                const elapsed = Date.now() - startTime;
                const remainingWait = maxWait - elapsed;
                const actualDelay = Math.min(delay, remainingWait);

                if (actualDelay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, actualDelay));
                }
            }
        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                step: 'kv-consistency-check',
                stack: err.stack,
                resourceId,
                attempt: attempt + 1,
            });
            logErrorInfo(logger, 'warn', 'KV consistency check error', errorInfo);

            // Wait with exponential backoff before retry
            if (attempt < 5) {
                const delay = getBackoffDelay(attempt);
                const elapsed = Date.now() - startTime;
                const remainingWait = maxWait - elapsed;
                const actualDelay = Math.min(delay, remainingWait);

                if (actualDelay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, actualDelay));
                }
            }
        }
    }

    // Max wait time reached - log warning but don't throw (graceful degradation)
    const duration = Date.now() - startTime;

    // Diagnose missing keys
    const finalChecks = await Promise.all(
        expectedKeys.map(async (key) => {
            const val = await kvService.get(key);
            return { key, exists: !!val };
        })
    );
    const missingKeys = finalChecks.filter(f => !f.exists).map(f => f.key);

    logger.warn('KV consistency check timeout', {
        resourceId,
        durationMs: duration,
        maxWaitMs: maxWait,
        keyCount: expectedKeys.length,
        missingKeys, // Show exactly what is missing
        namespaceId: (kvService as any).namespaceId || 'unknown', // Check namespace
        message: 'Continuing despite timeout - keys may not be immediately available',
    });
}

/**
 * Helper to build expected keys for a microlearning operation
 * 
 * @param microlearningId - The microlearning ID
 * @param language - Language code (optional)
 * @param department - Department name (optional)
 * @returns Array of expected KV keys
 */
export function buildExpectedKVKeys(
    microlearningId: string,
    language?: string,
    department?: string
): string[] {
    const keys: string[] = [CLOUDFLARE_KV.KEY_TEMPLATES.base(microlearningId)];

    if (language) {
        const normalizedLang = language.toLowerCase();
        keys.push(CLOUDFLARE_KV.KEY_TEMPLATES.language(microlearningId, normalizedLang));
    }

    if (department && language) {
        const normalizedLang = language.toLowerCase();
        keys.push(CLOUDFLARE_KV.KEY_TEMPLATES.inbox(microlearningId, department, normalizedLang));
    }

    return keys;
}

/**
 * Helper to build expected keys for a phishing operation
 * 
 * @param phishingId - The phishing ID
 * @param language - Language code
 * @param hasEmail - Whether email content exists (optional, default: true)
 * @param hasLandingPage - Whether landing page content exists (optional, default: true)
 * @returns Array of expected KV keys
 */
export function buildExpectedPhishingKeys(
    phishingId: string,
    language: string,
    hasEmail: boolean = true,
    hasLandingPage: boolean = true
): string[] {
    const normalizedLang = language.toLowerCase();
    const keys: string[] = [`phishing:${phishingId}:base`];

    if (hasEmail) {
        keys.push(`phishing:${phishingId}:email:${normalizedLang}`);
    }

    if (hasLandingPage) {
        keys.push(`phishing:${phishingId}:landing:${normalizedLang}`);
    }

    return keys;
}

/**
 * Helper to build expected keys for a smishing operation
 *
 * @param smishingId - The smishing ID
 * @param language - Language code
 * @param hasSms - Whether SMS content exists (optional, default: true)
 * @param hasLandingPage - Whether landing page content exists (optional, default: true)
 * @returns Array of expected KV keys
 */
export function buildExpectedSmishingKeys(
    smishingId: string,
    language: string,
    hasSms: boolean = true,
    hasLandingPage: boolean = true
): string[] {
    const normalizedLang = language.toLowerCase();
    const keys: string[] = [`smishing:${smishingId}:base`];

    if (hasSms) {
        keys.push(`smishing:${smishingId}:sms:${normalizedLang}`);
    }

    if (hasLandingPage) {
        keys.push(`smishing:${smishingId}:landing:${normalizedLang}`);
    }

    return keys;
}

