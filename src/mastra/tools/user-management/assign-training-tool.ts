import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { uuidv4 } from '../../utils/core/id-utils';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { ERROR_MESSAGES, API_ENDPOINTS, KV_NAMESPACES } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { extractCompanyIdFromTokenExport } from '../../utils/core/policy-fetcher';
import { isSafeId } from '../../utils/core/id-utils';
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';
import { KVService } from '../../services/kv-service';

// Output schema defined separately to avoid circular reference
const assignTrainingOutputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      assignmentType: z.enum(['USER', 'GROUP']),
      targetId: z.string(),
      targetLabel: z.string(),
      resourceId: z.string(),
      sendTrainingLanguageId: z.string(),
    })
    .optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const assignTrainingTool = createTool({
  id: 'assign-training',
  description: 'Assigns an uploaded training resource to a specific user or group.',
  inputSchema: z
    .object({
      resourceId: z
        .string()
        .describe('The Resource ID returned from the upload process')
        .refine(isSafeId, { message: 'Invalid resourceId format.' }),
      sendTrainingLanguageId: z
        .string()
        .describe('The Language ID returned from the upload process')
        .refine(isSafeId, { message: 'Invalid sendTrainingLanguageId format.' }),
      targetUserResourceId: z
        .string()
        .optional()
        .describe('The User ID to assign the training to (user assignment)')
        .refine(v => (v ? isSafeId(v) : true), { message: 'Invalid targetUserResourceId format.' }),
      targetUserEmail: z
        .string()
        .email()
        .optional()
        .describe('Optional: user email for display in summary messages (does not affect assignment).'),
      targetUserFullName: z
        .string()
        .optional()
        .describe('Optional: user full name for display in summary messages (does not affect assignment).'),
      targetGroupResourceId: z
        .string()
        .optional()
        .describe('The Group ID to assign the training to (group assignment)')
        .refine(v => (v ? isSafeId(v) : true), { message: 'Invalid targetGroupResourceId format.' }),
    })
    .refine(data => Boolean(data.targetUserResourceId) !== Boolean(data.targetGroupResourceId), {
      message:
        'Provide EXACTLY ONE: targetUserResourceId (user assignment) OR targetGroupResourceId (group assignment).',
    }),
  outputSchema: assignTrainingOutputSchema,
  execute: async ({ context, writer }) => {
    const logger = getLogger('AssignTrainingTool');
    const {
      resourceId,
      sendTrainingLanguageId,
      targetUserResourceId,
      targetUserEmail,
      targetUserFullName,
      targetGroupResourceId,
    } = context;

    // Guard: prevent assigning with raw microlearningId (must upload first)
    try {
      const kvService = new KVService(KV_NAMESPACES.MICROLEARNING);
      const microlearningContent = await kvService.getMicrolearning(resourceId);
      if (microlearningContent?.base) {
        const errorInfo = errorService.validation(
          'Training must be uploaded before assignment. Use uploadTraining first.',
          { field: 'resourceId', reason: 'microlearningId_not_uploaded', resourceId }
        );
        logErrorInfo(logger, 'warn', 'Assign training blocked: upload required', errorInfo);
        return createToolErrorResponse(errorInfo);
      }
    } catch (guardError) {
      logger.warn('Assign training upload guard failed, continuing', {
        error: normalizeError(guardError).message,
      });
    }

    // Determine assignment type
    const isUserAssignment = !!targetUserResourceId;
    const assignmentType = isUserAssignment ? 'USER' : 'GROUP';
    const targetId = targetUserResourceId || targetGroupResourceId;
    const userLabel = isUserAssignment
      ? targetUserEmail?.trim() || targetUserFullName?.trim() || targetUserResourceId
      : undefined;
    const targetLabel = isUserAssignment ? userLabel : targetId;

    logger.info(`Preparing assignment for resource to ${assignmentType}`, {
      resourceId,
      languageId: sendTrainingLanguageId,
      targetUserResourceId,
      targetGroupResourceId,
    });

    // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
    const { token, companyId, env, baseApiUrl } = getRequestContext();
    const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    const payload = {
      apiUrl: baseApiUrl, // Dynamic URL from header or environment
      accessToken: token,
      companyId: effectiveCompanyId,
      trainingId: resourceId,
      languageId: sendTrainingLanguageId, // Map languageId to resourceId param if API expects it
      ...(targetUserResourceId && { targetUserResourceId }),
      ...(targetGroupResourceId && { targetGroupResourceId }),
    };

    // Log Payload with masked token
    const maskedPayload = maskSensitiveField(payload, 'accessToken');
    logger.debug('Assign payload prepared', { payload: maskedPayload });

    try {
      // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
      const result = await withRetry(
        () =>
          callWorkerAPI({
            env,
            serviceBinding: env?.CRUD_WORKER,
            publicUrl: API_ENDPOINTS.TRAINING_WORKER_SEND,
            endpoint: 'https://worker/send',
            payload,
            token,
            errorPrefix: 'Assign API failed',
            operationName: `Assign training to ${assignmentType} ${targetId}`,
          }),
        `Assign training to ${assignmentType} ${targetId}`
      );

      logger.info('Assignment success', { result });

      // EMIT UI SIGNAL (SURGICAL)
      if (writer) {
        try {
          const messageId = uuidv4();
          const meta = { resourceId, targetId, assignmentType };
          const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');

          await writer.write({ type: 'text-start', id: messageId });
          await writer.write({
            type: 'text-delta',
            id: messageId,
            delta: `::ui:training_assigned::${encoded}::/ui:training_assigned::\n`,
          });
          await writer.write({ type: 'text-end', id: messageId });
        } catch (emitErr) {
          const err = normalizeError(emitErr);
          const errorInfo = errorService.external(err.message, {
            step: 'emit-ui-signal-training-assignment',
            stack: err.stack,
          });
          logErrorInfo(logger, 'warn', 'Failed to emit UI signal for training assignment', errorInfo);
        }
      }

      const toolResult = {
        success: true,
        data: {
          assignmentType: assignmentType as 'USER' | 'GROUP',
          targetId: String(targetId || ''),
          targetLabel: String(targetLabel || ''),
          resourceId,
          sendTrainingLanguageId,
        },
        message: formatToolSummary({
          prefix: result.message ? `✅ ${result.message}` : `✅ Training assigned to ${assignmentType} ${targetLabel}`,
          kv: [
            { key: 'resourceId', value: resourceId },
            { key: 'sendTrainingLanguageId', value: sendTrainingLanguageId },
          ],
        }),
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
