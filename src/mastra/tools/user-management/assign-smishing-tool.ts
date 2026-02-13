import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { uuidv4 } from '../../utils/core/id-utils';
import { KVService } from '../../services/kv-service';
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

const assignSmishingOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    campaignName: z.string(),
    assignmentType: z.enum(['USER', 'GROUP']),
    targetId: z.string(),
    targetLabel: z.string(),
    resourceId: z.string(),
    languageId: z.string().optional(),
  }).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const assignSmishingTool = createTool({
  id: 'assign-smishing',
  description: 'Assigns an uploaded smishing simulation to a specific user or group.',
  inputSchema: z.object({
    resourceId: z.string().describe('The Resource ID returned from the upload process').refine(isSafeId, { message: 'Invalid resourceId format.' }),
    languageId: z.string().optional().describe('The Language ID returned from the upload process').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid languageId format.' }),
    targetUserResourceId: z.string().optional().describe('The User ID to assign the smishing simulation to (user assignment)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid targetUserResourceId format.' }),
    targetUserEmail: z.string().email().optional().describe('Optional: user email for display in summary messages (does not affect assignment).'),
    targetUserFullName: z.string().optional().describe('Optional: user full name for display in summary messages (does not affect assignment).'),
    targetGroupResourceId: z.string().optional().describe('The Group ID to assign the smishing simulation to (group assignment)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid targetGroupResourceId format.' }),
  }).refine(
    data => Boolean(data.targetUserResourceId) !== Boolean(data.targetGroupResourceId),
    { message: 'Provide EXACTLY ONE: targetUserResourceId (user assignment) OR targetGroupResourceId (group assignment).' }
  ),
  outputSchema: assignSmishingOutputSchema,
  execute: async ({ context, writer }) => {
    const logger = getLogger('AssignSmishingTool');
    const { resourceId, languageId, targetUserResourceId, targetUserEmail, targetUserFullName, targetGroupResourceId } = context;

    try {
      const kvService = new KVService(KV_NAMESPACES.SMISHING);
      const smishingContent = await kvService.getSmishing(resourceId);
      if (smishingContent?.base) {
        const errorInfo = errorService.validation(
          'Smishing content must be uploaded before assignment. Use uploadSmishing first.',
          { field: 'resourceId', reason: 'smishingId_not_uploaded', resourceId }
        );
        logErrorInfo(logger, 'warn', 'Assign smishing blocked: upload required', errorInfo);
        return createToolErrorResponse(errorInfo);
      }
    } catch (guardError) {
      logger.warn('Assign smishing upload guard failed, continuing', {
        error: normalizeError(guardError).message
      });
    }

    const isUserAssignment = !!targetUserResourceId;
    const assignmentType = isUserAssignment ? 'USER' : 'GROUP';
    const targetId = targetUserResourceId || targetGroupResourceId;
    const userLabel = isUserAssignment
      ? (targetUserEmail?.trim() || targetUserFullName?.trim() || targetUserResourceId)
      : undefined;
    const targetLabel = isUserAssignment ? userLabel : targetId;
    const name = `Smishing Campaign - ${targetId} (${assignmentType}) Agentic Ally`;

    logger.info(`Preparing smishing assignment for resource to ${assignmentType}`, {
      resourceId,
      languageId,
      targetUserResourceId,
      targetGroupResourceId
    });

    const { token, companyId, env, baseApiUrl } = getRequestContext();
    const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    const payload = {
      apiUrl: baseApiUrl,
      accessToken: token,
      companyId: effectiveCompanyId,
      smishingId: resourceId,
      languageId: languageId,
      ...(targetUserResourceId && { targetUserResourceId }),
      ...(targetGroupResourceId && { targetGroupResourceId }),
      name,
    };
    logger.info('Assign smishing payload prepared (redacted)');

    const maskedPayload = maskSensitiveField(payload, 'accessToken');
    logger.debug('Assign smishing payload prepared', { payload: maskedPayload });

    try {
      const result = await withRetry(
        () => callWorkerAPI({
          env,
          serviceBinding: env?.SMISHING_CRUD_WORKER,
          publicUrl: API_ENDPOINTS.SMISHING_WORKER_SEND,
          endpoint: 'https://worker/send',
          payload,
          token,
          errorPrefix: 'Assign API failed',
          operationName: `Assign smishing to ${assignmentType} ${targetId}`
        }),
        `Assign smishing to ${assignmentType} ${targetId}`
      );

      logger.info('Smishing assignment success', { result });

      if (writer) {
        try {
          const messageId = uuidv4();
          const meta = { resourceId, targetId, assignmentType };
          const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');

          await writer.write({ type: 'text-start', id: messageId });
          await writer.write({
            type: 'text-delta',
            id: messageId,
            delta: `::ui:smishing_assigned::${encoded}::/ui:smishing_assigned::\n`
          });
          await writer.write({ type: 'text-end', id: messageId });
          } catch (emitErr) {
            const err = normalizeError(emitErr);
            const errorInfo = errorService.external(err.message, { step: 'emit-ui-signal-smishing-assignment', stack: err.stack });
            logErrorInfo(logger, 'warn', 'Failed to emit UI signal for smishing assignment', errorInfo);
          }
      }

      const toolResult = {
        success: true,
        data: {
          campaignName: name,
          assignmentType,
          targetId: String(targetId || ''),
          targetLabel: String(targetLabel || ''),
          resourceId,
          ...(languageId ? { languageId } : {}),
        },
        message: formatToolSummary({
          prefix: result.message ? `✅ ${result.message}` : `✅ Smishing campaign assigned to ${assignmentType} ${targetLabel}`,
          title: result.message ? undefined : name,
          kv: [
            { key: 'resourceId', value: resourceId },
            { key: 'languageId', value: languageId },
          ],
        })
      };

      const validation = validateToolResult(toolResult, assignSmishingOutputSchema, 'assign-smishing');
      if (!validation.success) {
        logErrorInfo(logger, 'error', 'Assign smishing result validation failed', validation.error);
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

      logErrorInfo(logger, 'error', 'Assign smishing tool failed', errorInfo);

      return createToolErrorResponse(errorInfo);
    }
  },
});
