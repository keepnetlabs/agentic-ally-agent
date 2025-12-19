import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';

// Output schema defined separately to avoid circular reference
const assignTrainingOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const assignTrainingTool = createTool({
  id: 'assign-training',
  description: 'Assigns an uploaded training resource to a specific user.',
  inputSchema: z.object({
    resourceId: z.string().describe('The Resource ID returned from the upload process'),
    sendTrainingLanguageId: z.string().describe('The Language ID returned from the upload process'),
    targetUserResourceId: z.string().describe('The User ID to assign the training to'),
  }),
  outputSchema: assignTrainingOutputSchema,
  execute: async ({ context }) => {
    const logger = getLogger('AssignTrainingTool');
    const { resourceId, sendTrainingLanguageId, targetUserResourceId } = context;

    logger.info('Preparing assignment for resource to user', { resourceId, languageId: sendTrainingLanguageId, targetUserResourceId });

    // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
    const { token, companyId, env } = getRequestContext();

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
      logger.warn('Auth error: Token missing', { code: errorInfo.code, message: errorInfo.message, category: errorInfo.category });
      return { success: false, error: JSON.stringify(errorInfo) };
    }

    const payload = {
      apiUrl: API_ENDPOINTS.PLATFORM_API_URL,
      accessToken: token,
      companyId: companyId,
      trainingId: resourceId,
      languageId: sendTrainingLanguageId, // Map languageId to resourceId param if API expects it
      targetUserResourceId: targetUserResourceId,
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
          operationName: `Assign training to user ${targetUserResourceId}`
        }),
        `Assign training to user ${targetUserResourceId}`
      );

      logger.info('Assignment success', { resultKeys: Object.keys(result) });

      const toolResult = {
        success: true,
        message: 'Training assigned successfully.'
      };

      // Validate result against output schema
      const validation = validateToolResult(toolResult, assignTrainingOutputSchema, 'assign-training');
      if (!validation.success) {
        logger.error('Assign training result validation failed', { code: validation.error.code, message: validation.error.message });
        return {
          success: false,
          error: JSON.stringify(validation.error)
        };
      }

      return validation.data;

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const errorInfo = errorService.external(err.message, {
        resourceId,
        targetUserResourceId,
        stack: err.stack,
      });

      logger.error('Assign tool failed', { code: errorInfo.code, message: errorInfo.message, category: errorInfo.category });

      return {
        success: false,
        error: JSON.stringify(errorInfo)
      };
    }
  },
});
