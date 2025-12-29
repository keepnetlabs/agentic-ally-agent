/**
 * KV Helper utilities for common patterns in workflows
 */

import { KVService } from '../services/kv-service';
import { getLogger } from './core/logger';
import { LANGUAGE, CLOUDFLARE_KV } from '../constants';
import { withRetry } from './core/resilience-utils';

const logger = getLogger('KVHelpers');

/**
 * Load inbox from KV with automatic fallback to en-gb
 * Reuses existing KVService instance for performance
 *
 * @param kvService - Existing KVService instance to reuse
 * @param microlearningId - Microlearning ID
 * @param department - Department name (normalized)
 * @param sourceLanguage - Source language to load
 * @returns Inbox data or null if not found
 */
export async function loadInboxWithFallback(
  kvService: KVService,
  microlearningId: string,
  department: string,
  sourceLanguage: string
): Promise<any | null> {
  const primaryKey = CLOUDFLARE_KV.KEY_TEMPLATES.inbox(microlearningId, department, sourceLanguage);
  const fallbackKey = sourceLanguage !== LANGUAGE.DEFAULT_SOURCE
    ? CLOUDFLARE_KV.KEY_TEMPLATES.inbox(microlearningId, department, LANGUAGE.DEFAULT_SOURCE)
    : undefined;

  try {
    logger.info('Loading base inbox from KV', { microlearningId, department, sourceLanguage });

    const data = await withRetry(
      () => kvService.get(primaryKey),
      `KV load inbox primary ${primaryKey}`
    );
    if (data) {
      logger.info('Found base inbox in KV', { key: primaryKey });
      return data;
    }

    // Try fallback to default source language if primary not found
    if (fallbackKey) {
      logger.info(`Primary inbox not found, trying fallback to ${LANGUAGE.DEFAULT_SOURCE}`, {
        primaryKey,
        fallbackKey
      });

      const fallbackData = await withRetry(
        () => kvService.get(fallbackKey),
        `KV load inbox fallback ${fallbackKey}`
      );
      if (fallbackData) {
        logger.info(`Found fallback inbox in ${LANGUAGE.DEFAULT_SOURCE}`, { fallbackKey });
        return fallbackData;
      }
    }

    logger.warn('Base inbox not found in KV', { primaryKey, fallbackKey });
    return null;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('KV load failed for inbox', {
      primaryKey,
      fallbackKey,
      error: err.message,
      stack: err.stack
    });
    return null;
  }
}
