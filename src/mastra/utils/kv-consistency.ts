/**
 * KV Consistency Check Utility
 * 
 * Verifies that KV keys are available after writes to ensure eventual consistency.
 * Uses intelligent polling with configurable intervals to avoid Cloudflare rate limits.
 * 
 * @module utils/kv-consistency
 */

import { CLOUDFLARE_KV } from '../constants';
import { KVService } from '../services/kv-service';
import { getLogger } from './core/logger';

const logger = getLogger('KVConsistency');

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
    const checkInterval = CLOUDFLARE_KV.CONSISTENCY_CHECK.CHECK_INTERVAL_MS;
    const maxChecks = Math.ceil(maxWait / checkInterval);

    logger.info('Starting KV consistency check', {
        resourceId,
        keyCount: expectedKeys.length,
        maxWaitMs: maxWait,
        checkIntervalMs: checkInterval,
        maxChecks,
        namespaceIdOverride: namespaceIdOverride || 'default',
    });

    const kvService = namespaceIdOverride ? new KVService(namespaceIdOverride) : new KVService();
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxChecks; attempt++) {
        try {
            // Check all keys in parallel for efficiency
            const results = await Promise.all(
                expectedKeys.map(async (key) => {
                    const value = await kvService.get(key);
                    return { key, exists: value !== null };
                })
            );

            const allPresent = results.every((r) => r.exists);
            const missingKeys = results.filter((r) => !r.exists).map((r) => r.key);

            if (allPresent) {
                const duration = Date.now() - startTime;
                logger.info('KV consistency verified', {
                    resourceId,
                    attempt: attempt + 1,
                    durationMs: duration,
                    keyCount: expectedKeys.length,
                });
                return;
            }

            // Some keys still missing - log and continue
            if (attempt < maxChecks - 1) {
                logger.debug('KV consistency check in progress', {
                    resourceId,
                    attempt: attempt + 1,
                    maxChecks,
                    missingKeys,
                });
            }

            // Wait before next check (unless this was the last attempt)
            if (attempt < maxChecks - 1) {
                await new Promise((resolve) => setTimeout(resolve, checkInterval));
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.warn('KV consistency check error', {
                resourceId,
                attempt: attempt + 1,
                error: err.message,
            });

            // On error, wait before retrying (unless this was the last attempt)
            if (attempt < maxChecks - 1) {
                await new Promise((resolve) => setTimeout(resolve, checkInterval));
            }
        }
    }

    // Max wait time reached - log warning but don't throw (graceful degradation)
    const duration = Date.now() - startTime;
    logger.warn('KV consistency check timeout', {
        resourceId,
        durationMs: duration,
        maxWaitMs: maxWait,
        keyCount: expectedKeys.length,
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
        keys.push(CLOUDFLARE_KV.KEY_TEMPLATES.language(microlearningId, language));
    }

    if (department && language) {
        keys.push(CLOUDFLARE_KV.KEY_TEMPLATES.inbox(microlearningId, department, language));
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

