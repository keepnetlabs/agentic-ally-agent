/**
 * Get Training Languages Tool (CS Domain)
 *
 * Fetches available training languages from GET /api/trainings/languages.
 * Returns language name, code, and native name for agent to resolve
 * user's natural language input (e.g., "English") to API codes (e.g., "EN-US").
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

const logger = getLogger('GetTrainingLanguagesTool');

// ============================================
// IN-MEMORY CACHE
// ============================================

interface TrainingLanguage {
  name: string;
  code: string;
  nativeLanguageName: string;
}

let languagesCache: TrainingLanguage[] | null = null;

// ============================================
// SCHEMAS
// ============================================

const inputSchema = z.object({});

const languageSchema = z.object({
  name: z.string(),
  code: z.string(),
  nativeLanguageName: z.string(),
});

const outputSchema = z.object({
  success: z.boolean(),
  languages: z.array(languageSchema).optional(),
  totalCount: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// ============================================
// TOOL DEFINITION
// ============================================

export const getTrainingLanguagesTool = createTool({
  id: 'get-training-languages',
  description:
    'Fetches all available training languages from the Keepnet platform. Returns language name, code, and native name. Use this to resolve natural language input (e.g., "English", "Turkish", "Almanca") to the correct API language code (e.g., "EN-US", "TR", "DE") before filtering trainings by language.',
  inputSchema,
  outputSchema,
  execute: async () => {
    // Return cached if available
    if (languagesCache) {
      logger.debug('get_training_languages_cache_hit', { count: languagesCache.length });
      return {
        success: true,
        languages: languagesCache,
        totalCount: languagesCache.length,
        message: `${languagesCache.length} languages available (cached)`,
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
          fetch(`${apiUrl}/api/trainings/languages`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }),
        'get-training-languages'
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('get_training_languages_api_error', { status: response.status, errorText });
        const errorInfo = errorService.external(
          `Training languages API error: ${response.status} - ${errorText}`,
          { status: response.status }
        );
        return createToolErrorResponse(errorInfo);
      }

      const result = await response.json();
      const data: Array<{ name: string; code: string; nativeLanguageName: string }> =
        result.data || result || [];

      // Cache the result
      languagesCache = data.map((lang) => ({
        name: lang.name,
        code: lang.code,
        nativeLanguageName: lang.nativeLanguageName,
      }));

      logger.debug('get_training_languages_success', { count: languagesCache.length });

      return {
        success: true,
        languages: languagesCache,
        totalCount: languagesCache.length,
        message: `${languagesCache.length} languages available`,
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('get_training_languages_error', { error: err.message, stack: err.stack });
      const errorInfo = errorService.external(CS_ERROR_MESSAGES.TRAINING_LANGUAGES_FAILED, {
        originalError: err.message,
      });
      return createToolErrorResponse(errorInfo);
    }
  },
});
