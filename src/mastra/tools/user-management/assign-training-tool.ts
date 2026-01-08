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
import { isSafeId } from '../../utils/core/id-utils';
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';

// Output schema defined separately to avoid circular reference
const assignTrainingOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    assignmentType: z.enum(['USER', 'GROUP']),
    targetId: z.string(),
    targetLabel: z.string(),
    resourceId: z.string(),
    sendTrainingLanguageId: z.string(),
  }).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const assignTrainingTool = createTool({
  id: 'assign-training',
  description: 'Assigns an uploaded training resource to a specific user or group.',
  inputSchema: z.object({
    resourceId: z.string().describe('The Resource ID returned from the upload process').refine(isSafeId, { message: 'Invalid resourceId format.' }),
    sendTrainingLanguageId: z.string().describe('The Language ID returned from the upload process').refine(isSafeId, { message: 'Invalid sendTrainingLanguageId format.' }),
    targetUserResourceId: z.string().optional().describe('The User ID to assign the training to (user assignment)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid targetUserResourceId format.' }),
    targetUserEmail: z.string().email().optional().describe('Optional: user email for display in summary messages (does not affect assignment).'),
    targetUserFullName: z.string().optional().describe('Optional: user full name for display in summary messages (does not affect assignment).'),
    targetGroupResourceId: z.string().optional().describe('The Group ID to assign the training to (group assignment)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid targetGroupResourceId format.' }),
  }).refine(
    data => Boolean(data.targetUserResourceId) !== Boolean(data.targetGroupResourceId),
    { message: 'Provide EXACTLY ONE: targetUserResourceId (user assignment) OR targetGroupResourceId (group assignment).' }
  ),
  outputSchema: assignTrainingOutputSchema,
  execute: async ({ context }) => {
    const logger = getLogger('AssignTrainingTool');
    const { resourceId, sendTrainingLanguageId, targetUserResourceId, targetUserEmail, targetUserFullName, targetGroupResourceId } = context;

    // Determine assignment type
    const isUserAssignment = !!targetUserResourceId;
    const assignmentType = isUserAssignment ? 'USER' : 'GROUP';
    const targetId = targetUserResourceId || targetGroupResourceId;
    const userLabel = isUserAssignment
      ? (targetUserEmail?.trim() || targetUserFullName?.trim() || targetUserResourceId)
      : undefined;
    const targetLabel = isUserAssignment ? userLabel : targetId;

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
        data: {
          assignmentType,
          targetId: String(targetId || ''),
          targetLabel: String(targetLabel || ''),
          resourceId,
          sendTrainingLanguageId,
        },
        message: formatToolSummary({
          prefix: `✅ Training assigned to ${assignmentType} ${targetLabel}`,
          kv: [
            { key: 'resourceId', value: resourceId },
            { key: 'sendTrainingLanguageId', value: sendTrainingLanguageId },
          ],
        })
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
