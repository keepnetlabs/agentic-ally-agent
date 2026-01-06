import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { extractCompanyIdFromTokenExport } from '../../utils/core/policy-fetcher';

// Output schema defined separately to avoid circular reference
const assignTrainingOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const assignTrainingTool = createTool({
  id: 'assign-training',
  description: 'Assigns an uploaded training resource to a specific user or group.',
  inputSchema: z.object({
    resourceId: z.string().describe('The Resource ID returned from the upload process'),
    sendTrainingLanguageId: z.string().describe('The Language ID returned from the upload process'),
    targetUserResourceId: z.string().optional().describe('The User ID to assign the training to (user assignment)'),
    targetGroupResourceId: z.string().optional().describe('The Group ID to assign the training to (group assignment)'),
  }).refine(
    data => data.targetUserResourceId || data.targetGroupResourceId,
    { message: 'Either targetUserResourceId (user assignment) or targetGroupResourceId (group assignment) must be provided' }
  ),
  outputSchema: assignTrainingOutputSchema,
  execute: async ({ context }) => {
    const logger = getLogger('AssignTrainingTool');
    const { resourceId, sendTrainingLanguageId, targetUserResourceId, targetGroupResourceId } = context;

    // Determine assignment type
    const isUserAssignment = !!targetUserResourceId;
    const assignmentType = isUserAssignment ? 'USER' : 'GROUP';
    const targetId = targetUserResourceId || targetGroupResourceId;

    logger.info(`Preparing assignment for resource to ${assignmentType}`, { resourceId, languageId: sendTrainingLanguageId, targetUserResourceId, targetGroupResourceId });

    // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
    const { token, companyId, env } = getRequestContext();
    const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    const payload = {
      apiUrl: API_ENDPOINTS.PLATFORM_API_URL,
      accessToken: token,
      companyId: effectiveCompanyId,
      trainingId: resourceId,
      languageId: sendTrainingLanguageId, // Map languageId to resourceId param if API expects it
      ...(targetUserResourceId && { targetUserResourceId }),
      ...(targetGroupResourceId && { targetGroupResourceId }),
    };

    // Log Payload with masked token
    const maskedPayload = maskSensitiveField(payload, 'accessToken', token);
    logger.debug('Assign payload prepared', { payload: maskedPayload });

    try {
      // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
      const result = await withRetry(
        () => callWorkerAPI({
          env,
          serviceBinding: env?.CRUD_WORKER,
          publicUrl: API_ENDPOINTS.TRAINING_WORKER_SEND,
          endpoint: 'https://worker/send',
          payload,
          token,
          errorPrefix: 'Assign API failed',
          operationName: `Assign training to ${assignmentType} ${targetId}`
        }),
        `Assign training to ${assignmentType} ${targetId}`
      );

      logger.info('Assignment success', { resultKeys: Object.keys(result) });

      const toolResult = {
        success: true,
        message: 'Training assigned successfully.'
      };

      // Validate result against output schema
      const validation = validateToolResult(toolResult, assignTrainingOutputSchema, 'assign-training');
      if (!validation.success) {
        logErrorInfo(logger, 'error', 'Assign training result validation failed', validation.error);
        return createToolErrorResponse(validation.error);
      }

      return validation.data;

    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        resourceId,
        targetUserResourceId,
        targetGroupResourceId,
        stack: err.stack,
      });

      logErrorInfo(logger, 'error', 'Assign tool failed', errorInfo);

      return createToolErrorResponse(errorInfo);
    }
  },
});
