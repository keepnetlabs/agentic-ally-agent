/**
 * Get Training Categories Tool (CS Domain)
 *
 * Fetches available training categories from GET /api/trainings/categories.
 * Returns category name (API key) and displayName (human-friendly) for agent
 * to resolve user input (e.g., "Email Security") to API names (e.g., "EmailSecurity").
 *
 * Uses module-level in-memory cache — first call hits API, subsequent calls
 * return cached data (cache lives for the process lifetime).
 *
 * Used by: Training Stats Agent (Customer Service Swarm)
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { createToolErrorResponse } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError } from '../../utils/core/error-utils';
import { CS_ERROR_MESSAGES } from '../../agents/customer-service/cs-constants';

const logger = getLogger('GetTrainingCategoriesTool');

// ============================================
// IN-MEMORY CACHE
// ============================================

interface TrainingCategory {
  name: string;
  displayName: string;
}

let categoriesCache: TrainingCategory[] | null = null;

// ============================================
// SCHEMAS
// ============================================

const inputSchema = z.object({});

const categorySchema = z.object({
  name: z.string(),
  displayName: z.string(),
});

const outputSchema = z.object({
  success: z.boolean(),
  categories: z.array(categorySchema).optional(),
  totalCount: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// ============================================
// TOOL DEFINITION
// ============================================

export const getTrainingCategoriesTool = createTool({
  id: 'get-training-categories',
  description:
    'Fetches all available training categories from the Keepnet platform. Returns category name (API key used in filters) and displayName (human-friendly label). Use this to resolve user input (e.g., "Email Security", "GDPR", "Malware") to the correct API category name (e.g., "EmailSecurity", "GDPR", "Malware") before filtering trainings by category.',
  inputSchema,
  outputSchema,
  execute: async () => {
    // Return cached if available
    if (categoriesCache) {
      logger.debug('get_training_categories_cache_hit', { count: categoriesCache.length });
      return {
        success: true,
        categories: categoriesCache,
        totalCount: categoriesCache.length,
        message: `${categoriesCache.length} categories available (cached)`,
      };
    }

    const { token, baseApiUrl } = getRequestContext();

    if (!token) {
      const errorInfo = errorService.auth(CS_ERROR_MESSAGES.TOKEN_MISSING);
      return createToolErrorResponse(errorInfo);
    }

    const apiUrl = baseApiUrl || 'https://test-api.devkeepnet.com';

    try {
      const response = await withRetry(
        async () =>
          fetch(`${apiUrl}/api/trainings/categories`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }),
        'get-training-categories'
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('get_training_categories_api_error', { status: response.status, errorText });
        const errorInfo = errorService.external(
          `Training categories API error: ${response.status} - ${errorText}`,
          { status: response.status }
        );
        return createToolErrorResponse(errorInfo);
      }

      const result = await response.json();
      const data: Array<{ name: string; displayName: string }> =
        result.data || result || [];

      // Cache the result
      categoriesCache = data.map((cat) => ({
        name: cat.name,
        displayName: cat.displayName,
      }));

      logger.debug('get_training_categories_success', { count: categoriesCache.length });

      return {
        success: true,
        categories: categoriesCache,
        totalCount: categoriesCache.length,
        message: `${categoriesCache.length} categories available`,
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('get_training_categories_error', { error: err.message, stack: err.stack });
      const errorInfo = errorService.external(CS_ERROR_MESSAGES.TRAINING_CATEGORIES_FAILED, {
        originalError: err.message,
      });
      return createToolErrorResponse(errorInfo);
    }
  },
});
