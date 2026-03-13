/**
 * Get Company Detail Tool
 *
 * Fetches detailed company information from GET /api/companies/{resourceId}.
 * Resolves licenseModules IDs to display names via lookup cache.
 * Returns clean, agent-friendly company data.
 *
 * Used by: Company Search Agent
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
import { resolveLicenseModuleIds } from './get-lookup-data-tool';

const logger = getLogger('GetCompanyDetailTool');

// ============================================
// SCHEMAS
// ============================================

const inputSchema = z.object({
  companyResourceId: z.string().describe('The unique resource ID of the company to retrieve details for'),
});

const outputSchema = z.object({
  success: z.boolean(),
  company: z
    .object({
      name: z.string(),
      description: z.string().optional(),
      statusName: z.string().optional(),
      industryName: z.string().optional(),
      countryName: z.string().optional(),
      countryCode: z.string().optional(),
      licenseTypeName: z.string().optional(),
      licensePeriodTypeName: z.string().optional(),
      licenseStartDate: z.string().optional(),
      licenseEndDate: z.string().optional(),
      licenseModuleNames: z.array(z.string()).optional(),
      numberOfUsers: z.number().optional(),
      targetUserCount: z.number().optional(),
      preferredLanguageTypeName: z.string().optional(),
      timeZoneId: z.string().optional(),
      dateFormat: z.string().optional(),
      timeFormat: z.string().optional(),
      notificationTemplateTypeName: z.string().optional(),
      trainingContentTypeName: z.string().optional(),
      smtpConfigurationTypeName: z.string().optional(),
      baseManHourCost: z.number().optional(),
      baseManHour: z.number().optional(),
      hasAgenticAILicense: z.boolean().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

// ============================================
// TOOL DEFINITION
// ============================================

export const getCompanyDetailTool = createTool({
  id: 'get-company-detail',
  description:
    'Fetches detailed information for a specific company by its resourceId. Returns license details, country, modules, language preferences, and more.',
  inputSchema,
  outputSchema,
  execute: async (inputData) => {
    const { companyResourceId } = inputData;

    logger.debug('get_company_detail_start', { companyResourceId });

    // 1. Get auth context
    const { token, baseApiUrl } = getRequestContext();

    if (!token) {
      const errorInfo = errorService.auth(CS_ERROR_MESSAGES.TOKEN_MISSING);
      return createToolErrorResponse(errorInfo);
    }

    const apiUrl = baseApiUrl || 'https://test-api.devkeepnet.com';

    try {
      // 2. Call API
      const response = await withRetry(
        async () =>
          fetch(`${apiUrl}/api/companies/${companyResourceId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }),
        'get-company-detail'
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        logger.error('get_company_detail_api_error', { status: response.status, errorText });
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
        };
      }

      // 3. Parse response
      const result = await response.json();
      const data = result.data || result;

      // 4. Resolve licenseModules IDs to names
      const rawModuleIds: string[] = data.licenseModules || [];
      const licenseModuleNames = await resolveLicenseModuleIds(
        rawModuleIds,
        token,
        apiUrl
      );

      logger.debug('get_company_detail_success', { companyName: data.name });

      return {
        success: true,
        company: {
          name: data.name as string,
          description: data.description as string | undefined,
          statusName: data.statusName as string | undefined,
          industryName: data.industryName as string | undefined,
          countryName: data.countryName as string | undefined,
          countryCode: data.countryCode as string | undefined,
          licenseTypeName: data.licenseTypeName as string | undefined,
          licensePeriodTypeName: data.licensePeriodTypeName as string | undefined,
          licenseStartDate: data.licenseStartDate as string | undefined,
          licenseEndDate: data.licenseEndDate as string | undefined,
          licenseModuleNames,
          numberOfUsers: data.numberOfUsers as number | undefined,
          targetUserCount: data.targetUserCount as number | undefined,
          preferredLanguageTypeName: data.preferredLanguageTypeName as string | undefined,
          timeZoneId: data.timeZoneId as string | undefined,
          dateFormat: data.dateFormat as string | undefined,
          timeFormat: data.timeFormat as string | undefined,
          notificationTemplateTypeName: data.notificationTemplateTypeName as string | undefined,
          trainingContentTypeName: data.trainingContentTypeName as string | undefined,
          smtpConfigurationTypeName: data.smtpConfigurationTypeName as string | undefined,
          baseManHourCost: data.baseManHourCost as number | undefined,
          baseManHour: data.baseManHour as number | undefined,
          hasAgenticAILicense: data.hasAgenticAILicense as boolean | undefined,
        },
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('get_company_detail_error', { error: err.message, stack: err.stack });
      const errorInfo = errorService.external(CS_ERROR_MESSAGES.COMPANY_DETAIL_FAILED, {
        originalError: err.message,
      });
      return createToolErrorResponse(errorInfo);
    }
  },
});
