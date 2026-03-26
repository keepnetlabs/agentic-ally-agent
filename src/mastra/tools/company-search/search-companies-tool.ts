/**
 * Search Companies Tool
 *
 * Searches companies on the Keepnet platform via POST /api/companies/search.
 * Supports structured filters (field/operator/value) and free-text search.
 *
 * Used by: Company Search Agent, Training Stats Agent (shared tool)
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { createToolErrorResponse } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError } from '../../utils/core/error-utils';
import { COMPANY_SEARCH, CS_ERROR_MESSAGES } from '../../agents/customer-service/cs-constants';
import { resolveLookupFilters } from './get-lookup-data-tool';

const logger = getLogger('SearchCompaniesTool');

// ============================================
// SCHEMAS
// ============================================

const filterItemSchema = z.object({
  fieldName: z
    .string()
    .describe(
      'API field name: CompanyName, IndustryResourceId, LicenseTypeResourceId, MonthlyActiveUser, LicenseEndDate, CreateTime, TargetUserCount, ResellerName, LicenceExpired'
    ),
  operator: z.string().describe('Operator: =, !=, Contains, Include, >, <, >=, <='),
  value: z.string().describe('Filter value as string'),
});

const inputSchema = z.object({
  searchText: z.string().optional().describe('Free-text search across company names'),
  filters: z
    .array(filterItemSchema)
    .optional()
    .describe('Structured filter items for the API'),
  filterCondition: z
    .enum(['AND', 'OR'])
    .optional()
    .default('AND')
    .describe('How to combine filters (default: AND)'),
  pageNumber: z.number().optional().default(1).describe('Page number (default: 1)'),
  pageSize: z
    .number()
    .min(1)
    .max(COMPANY_SEARCH.MAX_PAGE_SIZE)
    .optional()
    .default(COMPANY_SEARCH.DEFAULT_PAGE_SIZE)
    .describe(`Results per page (max: ${COMPANY_SEARCH.MAX_PAGE_SIZE}, default: ${COMPANY_SEARCH.DEFAULT_PAGE_SIZE})`),
  orderBy: z
    .string()
    .optional()
    .default(COMPANY_SEARCH.DEFAULT_ORDER_BY)
    .describe('Sort field (default: CreateTime)'),
  ascending: z.boolean().optional().default(false).describe('Sort order (default: false = newest first)'),
});

const companySchema = z.object({
  companyName: z.string(),
  companyResourceId: z.string(),
  industryName: z.string().optional(),
  licenseTypeName: z.string().optional(),
  resellerName: z.string().optional(),
  numberOfUsers: z.string().optional(),
  targetUserCount: z.number().optional(),
  monthlyActiveUserCount: z.number().optional(),
  deletedTargetUserCount: z.number().optional(),
  inactiveTargetUserCount: z.number().optional(),
  licenceExpired: z.boolean().optional(),
  licenseEndDate: z.string().optional(),
  createTime: z.string().optional(),
});

const outputSchema = z.object({
  success: z.boolean(),
  companies: z.array(companySchema).optional(),
  totalCount: z.number().optional(),
  pageNumber: z.number().optional(),
  pageSize: z.number().optional(),
  totalPages: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// ============================================
// HELPER: Build KeepnetLabs filter payload
// ============================================

interface FilterItem {
  FieldName: string;
  Operator: string;
  Value: string;
}

function buildSearchPayload(input: z.infer<typeof inputSchema>) {
  const { searchText, filters, filterCondition, pageNumber, pageSize, orderBy, ascending } = input;

  // FilterGroup[0]: Structured filters (AND condition by default)
  const structuredFilterItems: FilterItem[] = (filters || []).map(f => ({
    FieldName: f.fieldName,
    Operator: f.operator,
    Value: f.value,
  }));

  // FilterGroup[1]: Free-text search (OR, Name Contains)
  const searchFilterItems: FilterItem[] = searchText
    ? [{ FieldName: 'Name', Operator: 'Contains', Value: searchText }]
    : [];

  // Only include FilterGroups that have actual FilterItems
  const filterGroups: Array<{ Condition: 'AND' | 'OR'; FilterItems: FilterItem[]; FilterGroups: never[] }> = [];

  if (structuredFilterItems.length > 0) {
    filterGroups.push({
      Condition: (filterCondition || 'AND') as 'AND' | 'OR',
      FilterItems: structuredFilterItems,
      FilterGroups: [],
    });
  }

  if (searchFilterItems.length > 0) {
    filterGroups.push({
      Condition: 'OR' as const,
      FilterItems: searchFilterItems,
      FilterGroups: [],
    });
  }

  return {
    pageNumber,
    pageSize,
    orderBy,
    ascending,
    filter: {
      Condition: 'AND' as const,
      SearchInputTextValue: '',
      FilterGroups: filterGroups,
    },
    isClustered: false,
    isTargetUserCountExceededLimit: false,
  };
}

// ============================================
// TOOL DEFINITION
// ============================================

export const searchCompaniesTool = createTool({
  id: 'search-companies',
  description:
    'Searches companies on the Keepnet platform. Supports filters by company name, industry, license type, user count, dates, and more. Returns paginated results.',
  inputSchema,
  outputSchema,
  execute: async (inputData) => {
    const { searchText, filters, filterCondition, pageNumber, pageSize, orderBy, ascending } = inputData;

    logger.debug('search_companies_start', { filterCount: filters?.length || 0 });

    // 1. Get auth context
    const { token, baseApiUrl } = getRequestContext();

    if (!token) {
      const errorInfo = errorService.auth(CS_ERROR_MESSAGES.TOKEN_MISSING);
      return createToolErrorResponse(errorInfo);
    }

    const apiUrl = baseApiUrl || 'https://test-api.devkeepnet.com';

    try {
      // 2. Auto-resolve Industry/License text names to resourceIds
      if (filters && filters.length > 0) {
        await resolveLookupFilters(filters, token, apiUrl);
      }

      // 3. Build search payload
      const searchPayload = buildSearchPayload({
        searchText,
        filters,
        filterCondition: filterCondition || 'AND',
        pageNumber: pageNumber || 1,
        pageSize: pageSize || COMPANY_SEARCH.DEFAULT_PAGE_SIZE,
        orderBy: orderBy || COMPANY_SEARCH.DEFAULT_ORDER_BY,
        ascending: ascending ?? false,
      });

      logger.info('search_companies_payload', { searchPayload });
      
      // 3. Call API
      const response = await withRetry(
        async () =>
          fetch(`${apiUrl}/api/companies/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(searchPayload),
          }),
        'search-companies'
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('search_companies_api_error', { status: response.status, errorText });
        const errorInfo = errorService.external(
          `Company search API error: ${response.status} - ${errorText}`,
          { status: response.status }
        );
        return createToolErrorResponse(errorInfo);
      }

      // 4. Parse response
      const result = await response.json();
      const data = result.data || result;
      const companies = data.results || [];
      const totalCount = data.totalNumberOfRecords ?? data.totalCount ?? companies.length;
      const totalPages = data.totalNumberOfPages ?? Math.ceil(totalCount / (pageSize || COMPANY_SEARCH.DEFAULT_PAGE_SIZE));

      logger.debug('search_companies_success', { totalCount, returnedCount: companies.length });

      return {
        success: true,
        companies: companies.map((c: Record<string, unknown>) => ({
          companyName: c.companyName as string,
          companyResourceId: c.companyResourceId as string,
          industryName: c.industryName as string | undefined,
          licenseTypeName: c.licenseTypeName as string | undefined,
          resellerName: c.resellerName as string | undefined,
          numberOfUsers: c.numberOfUsers as string | undefined,
          targetUserCount: c.targetUserCount as number | undefined,
          monthlyActiveUserCount: c.monthlyActiveUserCount as number | undefined,
          deletedTargetUserCount: c.deletedTargetUserCount as number | undefined,
          inactiveTargetUserCount: c.inactiveTargetUserCount as number | undefined,
          licenceExpired: c.licenceExpired as boolean | undefined,
          licenseEndDate: c.licenseEndDate as string | undefined,
          createTime: c.createTime as string | undefined,
        })),
        totalCount,
        pageNumber: data.pageNumber || pageNumber || 1,
        pageSize: data.pageSize || pageSize || COMPANY_SEARCH.DEFAULT_PAGE_SIZE,
        totalPages,
        message: `Found ${totalCount} companies (showing page ${data.pageNumber || pageNumber || 1} of ${totalPages})`,
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('search_companies_error', { error: err.message, stack: err.stack });
      const errorInfo = errorService.external(CS_ERROR_MESSAGES.COMPANY_SEARCH_FAILED, {
        originalError: err.message,
      });
      return createToolErrorResponse(errorInfo);
    }
  },
});
