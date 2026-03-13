/**
 * Search Trainings Tool (CS Domain)
 *
 * Searches trainings for a company via POST /api/trainings/search.
 * Uses companyResourceId as x-ir-company-id header; falls back to request context's own companyId if omitted.
 * Supports filtering by training type, search type, and free-text search.
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
import {
  CS_ERROR_MESSAGES,
  TRAINING_SEARCH,
  TRAINING_SEARCH_TYPES,
} from '../../agents/customer-service/cs-constants';

const logger = getLogger('SearchTrainingsTool');

// ============================================
// SCHEMAS
// ============================================

const inputSchema = z.object({
  companyResourceId: z
    .string()
    .optional()
    .describe(
      'The company resourceId to scope the training search (sent as x-ir-company-id header). If omitted, falls back to the requesting user\'s own company.'
    ),
  searchText: z.string().optional().describe('Free-text search across training names'),
  trainingSearchType: z
    .number()
    .optional()
    .default(TRAINING_SEARCH_TYPES.ALL)
    .describe('Search scope: 1=All, 2=MostPopular, 3=Favourites, 4=CreatedByMe'),
  trainingType: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .describe(
      'Filter by training type: null=all, "SCORM", "Learning Path", "Poster", "Infographic", "Screensaver", "Survey"'
    ),
  pageNumber: z.number().optional().default(1).describe('Page number (default: 1)'),
  pageSize: z
    .number()
    .min(1)
    .max(TRAINING_SEARCH.MAX_PAGE_SIZE)
    .optional()
    .default(TRAINING_SEARCH.DEFAULT_PAGE_SIZE)
    .describe(`Results per page (max: ${TRAINING_SEARCH.MAX_PAGE_SIZE}, default: ${TRAINING_SEARCH.DEFAULT_PAGE_SIZE})`),
  orderBy: z
    .string()
    .optional()
    .default(TRAINING_SEARCH.DEFAULT_ORDER_BY)
    .describe('Sort field (default: createTime)'),
  ascending: z.boolean().optional().default(false).describe('Sort order (default: false = newest first)'),
  languageCodes: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by language codes (e.g., ["EN-US", "TR"]). Get codes from getTrainingLanguages tool first. Uses Include operator — trainings matching ANY of the codes are returned.'
    ),
  levelIds: z
    .array(z.number())
    .optional()
    .describe(
      'Filter by training level: 1=Beginner, 2=Intermediate, 3=Advanced. Pass multiple to include any (e.g., [1,2] for Beginner+Intermediate).'
    ),
  categoryNames: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by category API names (e.g., ["EmailSecurity", "GDPR"]). Get names from getTrainingCategories tool first. Uses Include operator.'
    ),
});

const trainingSchema = z.object({
  trainingId: z.string(),
  trainingName: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  targetAudience: z.string().optional(),
  languages: z.array(z.string()).optional(),
  vendorName: z.string().optional(),
  hasQuiz: z.boolean().optional(),
  duration: z.string().optional(),
  level: z.string().optional(),
  createTime: z.string().optional(),
});

const outputSchema = z.object({
  success: z.boolean(),
  trainings: z.array(trainingSchema).optional(),
  totalCount: z.number().optional(),
  pageNumber: z.number().optional(),
  pageSize: z.number().optional(),
  totalPages: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// ============================================
// HELPER: Build training search payload
// ============================================

function buildSearchPayload(input: z.infer<typeof inputSchema>) {
  const { searchText, trainingSearchType, trainingType, pageNumber, pageSize, orderBy, ascending, languageCodes, levelIds, categoryNames } =
    input;

  // FilterGroup[0]: Structured filters (language, etc.)
  const structuredFilterItems: Array<{ FieldName: string; Operator: string; Value: string }> = [];

  if (languageCodes && languageCodes.length > 0) {
    structuredFilterItems.push({
      FieldName: 'languages',
      Operator: 'Include',
      Value: languageCodes.join(','),
    });
  }

  if (levelIds && levelIds.length > 0) {
    structuredFilterItems.push({
      FieldName: 'level',
      Operator: 'Include',
      Value: levelIds.join(','),
    });
  }

  if (categoryNames && categoryNames.length > 0) {
    structuredFilterItems.push({
      FieldName: 'category',
      Operator: 'Include',
      Value: categoryNames.join(','),
    });
  }

  // FilterGroup[1]: Free-text search (OR, Name Contains)
  const searchFilterItems = searchText
    ? [{ FieldName: 'Name', Operator: 'Contains', Value: searchText }]
    : [];

  const filterGroups: Array<{ Condition: string; FilterItems: Array<{ FieldName: string; Operator: string; Value: string }>; FilterGroups: never[] }> = [
    {
      Condition: 'Or',
      FilterItems: structuredFilterItems,
      FilterGroups: [],
    },
    {
      Condition: 'OR',
      FilterItems: searchFilterItems,
      FilterGroups: [],
    },
  ];

  return {
    pageNumber,
    pageSize,
    orderBy,
    ascending,
    filter: {
      Condition: 'AND',
      SearchInputTextValue: '',
      FilterGroups: filterGroups,
    },
    trainingSearchType: trainingSearchType ?? TRAINING_SEARCH_TYPES.ALL,
    trainingType: trainingType ?? null,
  };
}

// ============================================
// TOOL DEFINITION
// ============================================

export const searchTrainingsTool = createTool({
  id: 'search-trainings',
  description:
    'Searches trainings for a company on the Keepnet platform. If companyResourceId is provided, searches that company; otherwise falls back to the requesting user\'s own company. Supports filtering by training type, search scope, language codes, and level (1=Beginner, 2=Intermediate, 3=Advanced). Returns paginated results.',
  inputSchema,
  outputSchema,
  execute: async (inputData) => {
    const {
      companyResourceId,
      searchText,
      trainingSearchType,
      trainingType,
      pageNumber,
      pageSize,
      orderBy,
      ascending,
      languageCodes,
      levelIds,
      categoryNames,
    } = inputData;

    // 1. Get auth context
    const { token, baseApiUrl, companyId } = getRequestContext();

    if (!token) {
      const errorInfo = errorService.auth(CS_ERROR_MESSAGES.TOKEN_MISSING);
      return createToolErrorResponse(errorInfo);
    }

    // Resolve companyResourceId: explicit param > request context (own company)
    const effectiveCompanyId = companyResourceId || companyId;
    if (!effectiveCompanyId) {
      return {
        success: false,
        error: 'No company context available. Please specify a company or search for one first.',
      };
    }

    logger.debug('search_trainings_start', { effectiveCompanyId, trainingType });

    const apiUrl = baseApiUrl || 'https://test-api.devkeepnet.com';

    try {
      // 2. Build search payload
      const searchPayload = buildSearchPayload({
        companyResourceId,
        searchText,
        trainingSearchType: trainingSearchType ?? TRAINING_SEARCH_TYPES.ALL,
        trainingType: trainingType ?? null,
        pageNumber: pageNumber ?? 1,
        pageSize: pageSize ?? TRAINING_SEARCH.DEFAULT_PAGE_SIZE,
        orderBy: orderBy ?? TRAINING_SEARCH.DEFAULT_ORDER_BY,
        ascending: ascending ?? false,
        languageCodes,
        levelIds,
        categoryNames,
      });

      logger.info('search_trainings_payload', { searchPayload });

      // 3. Call API with x-ir-company-id header
      const response = await withRetry(
        async () =>
          fetch(`${apiUrl}/api/trainings/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-ir-company-id': effectiveCompanyId,
            },
            body: JSON.stringify(searchPayload),
          }),
        'search-trainings'
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('search_trainings_api_error', { status: response.status, errorText });
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
        };
      }

      // 4. Parse response
      const result = await response.json();
      const data = result.data || result;
      const trainings = data.results || [];
      const totalCount = data.totalNumberOfRecords ?? data.totalCount ?? trainings.length;
      const totalPages =
        data.totalNumberOfPages ?? Math.ceil(totalCount / (pageSize ?? TRAINING_SEARCH.DEFAULT_PAGE_SIZE));

      logger.debug('search_trainings_success', { totalCount, returnedCount: trainings.length });

      return {
        success: true,
        trainings: trainings.map((t: Record<string, unknown>) => ({
          trainingId: t.trainingId as string,
          trainingName: t.trainingName as string,
          description: t.description as string | undefined,
          category: t.category as string | undefined,
          type: t.type as string | undefined,
          targetAudience: t.targetAudience as string | undefined,
          languages: t.languages as string[] | undefined,
          vendorName: t.vendorName as string | undefined,
          hasQuiz: t.hasQuiz as boolean | undefined,
          duration: t.duration as string | undefined,
          level: t.level as string | undefined,
          createTime: t.createTime as string | undefined,
        })),
        totalCount,
        pageNumber: data.pageNumber || pageNumber || 1,
        pageSize: data.pageSize || pageSize || TRAINING_SEARCH.DEFAULT_PAGE_SIZE,
        totalPages,
        message: `Found ${totalCount} trainings (showing page ${data.pageNumber || pageNumber || 1} of ${totalPages})`,
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('search_trainings_error', { error: err.message, stack: err.stack });
      const errorInfo = errorService.external(CS_ERROR_MESSAGES.TRAINING_SEARCH_FAILED, {
        originalError: err.message,
      });
      return createToolErrorResponse(errorInfo);
    }
  },
});
