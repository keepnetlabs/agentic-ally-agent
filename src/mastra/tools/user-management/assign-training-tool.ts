/**
 * assign-training-tool
 *
 * EU AI Act (Art. 9) Tool Risk Metadata:
 * - riskLevel: limited
 * - rationale: Assigns training to user/group; affects learning assignment
 * - humanOversight: approval-gated (Chat confirmation before execution)
 * @see docs/AI_COMPLIANCE_INVENTORY.md
 */
import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { isSafeId } from '../../utils/core/id-utils';
import { generateBatchId } from '../../utils/core/short-id';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI, type AgenticActivitiesPayload, type WorkerSendResponse } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { ERROR_MESSAGES, KV_NAMESPACES, MAX_GROUP_ASSIGN_USERS, getWorkerUrls } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { extractCompanyIdFromTokenExport } from '../../utils/core/policy-fetcher';
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';
import { KVService } from '../../services/kv-service';
import { fanOutGroupAssignment, groupResultSchema } from '../../utils/core/group-assignment';
import { emitUISignal } from '../../utils/core/ui-signal';

const assignTrainingOutputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      assignmentType: z.enum(['USER', 'GROUP']),
      targetId: z.string(),
      targetLabel: z.string(),
      resourceId: z.string(),
      sendTrainingLanguageId: z.string(),
      groupResult: groupResultSchema.optional(),
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
      contentCategory: z
        .string()
        .optional()
        .describe('Free-text category classifying the activity (e.g. "Security Awareness", "Compliance Training"). Used by the Agentic AI Activities API.'),
      explanationJson: z
        .object({ reasoningText: z.string() })
        .optional()
        .describe('AI reasoning for why this activity was created. Sent to the Agentic AI Activities API as explanationJson.'),
    })
    .refine(data => Boolean(data.targetUserResourceId) !== Boolean(data.targetGroupResourceId), {
      message:
        'Provide EXACTLY ONE: targetUserResourceId (user assignment) OR targetGroupResourceId (group assignment).',
    }),
  outputSchema: assignTrainingOutputSchema,
  execute: async (inputData, ctx?: ToolExecutionContext) => {
    const writer = ctx?.writer;
    const logger = getLogger('AssignTrainingTool');
    const {
      resourceId,
      sendTrainingLanguageId,
      targetUserResourceId,
      targetUserEmail,
      targetUserFullName,
      targetGroupResourceId,
      contentCategory,
      explanationJson,
    } = inputData;

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

    const commonPayloadFields = {
      activityType: 'training' as const,
      trainingResourceId: resourceId,
      contentCategory: contentCategory || '',
      ...(explanationJson && { explanationJson }),
      apiUrl: baseApiUrl,
      accessToken: token,
      companyId: effectiveCompanyId,
      trainingId: resourceId,
      languageId: sendTrainingLanguageId,
    };

    const callAssignApi = (p: AgenticActivitiesPayload) =>
      withRetry(
        () =>
          callWorkerAPI<WorkerSendResponse>({
            env,
            serviceBinding: env?.CRUD_WORKER,
            publicUrl: getWorkerUrls(baseApiUrl).TRAINING_WORKER_SEND,
            endpoint: 'https://worker/send',
            payload: p,
            token,
            errorPrefix: 'Assign API failed',
            operationName: `Assign training to user ${p.targetUserResourceId}`,
            baseApiUrl,
          }),
        `Assign training to user ${p.targetUserResourceId}`
      );

    try {
      // ─── Group Assignment: fan-out to individual users ───
      if (targetGroupResourceId) {
        const fanOutResult = await fanOutGroupAssignment({
          token,
          groupResourceId: targetGroupResourceId,
          baseApiUrl,
          buildPayload: (userResourceId: string) => ({
            ...commonPayloadFields,
            batchResourceId: generateBatchId(),
            targetUserResourceId: userResourceId,
          }),
          callApi: callAssignApi,
        });

        if (fanOutResult.limitExceeded) {
          const errorInfo = errorService.validation(
            `Group has ${fanOutResult.totalUsers} users, exceeding the maximum of ${MAX_GROUP_ASSIGN_USERS}. Use batch-autonomous for larger groups.`,
            { field: 'targetGroupResourceId', reason: 'group_too_large', totalUsers: fanOutResult.totalUsers }
          );
          logErrorInfo(logger, 'warn', 'Group assignment blocked: too many users', errorInfo);
          return createToolErrorResponse(errorInfo);
        }

        logger.info('Group assignment complete', { fanOutResult });

        await emitUISignal({
          writer,
          signalName: 'training_assigned',
          meta: {
            resourceId,
            groupResourceId: targetGroupResourceId,
            totalUsers: fanOutResult.totalUsers,
            succeeded: fanOutResult.succeeded,
            failed: fanOutResult.failed,
          },
          logger,
          stepLabel: 'training-assignment',
        });

        const hasAnySuccess = fanOutResult.succeeded > 0;
        const isEmptyGroup = fanOutResult.totalUsers === 0;
        const failedSuffix = fanOutResult.failed > 0 ? ` (${fanOutResult.failed} failed)` : '';

        let prefix: string;
        if (isEmptyGroup) {
          prefix = '⚠️ Group has no active users — nothing to assign';
        } else if (hasAnySuccess) {
          prefix = `✅ Training assigned to ${fanOutResult.succeeded}/${fanOutResult.totalUsers} users${failedSuffix}`;
        } else {
          prefix = `❌ Training assignment failed for all ${fanOutResult.totalUsers} users`;
        }

        const toolResult = {
          success: hasAnySuccess || isEmptyGroup,
          data: {
            assignmentType: 'GROUP' as const,
            targetId: targetGroupResourceId,
            targetLabel: targetGroupResourceId,
            resourceId,
            sendTrainingLanguageId,
            groupResult: fanOutResult,
          },
          message: formatToolSummary({
            prefix,
            kv: [
              { key: 'resourceId', value: resourceId },
              { key: 'sendTrainingLanguageId', value: sendTrainingLanguageId },
              { key: 'groupResourceId', value: targetGroupResourceId },
            ],
          }),
          ...(!hasAnySuccess && !isEmptyGroup ? { error: `All ${fanOutResult.totalUsers} user assignments failed` } : {}),
        };

        const validation = validateToolResult(toolResult, assignTrainingOutputSchema, 'assign-training');
        if (!validation.success) {
          logErrorInfo(logger, 'error', 'Assign training result validation failed', validation.error);
          return createToolErrorResponse(validation.error);
        }
        return validation.data;
      }

      // ─── User Assignment: single API call (unchanged) ───
      const payload: AgenticActivitiesPayload = {
        ...commonPayloadFields,
        batchResourceId: generateBatchId(),
        targetUserResourceId,
      };

      const maskedPayload = maskSensitiveField(payload, 'accessToken');
      logger.debug('Assign payload prepared', { payload: maskedPayload });

      const result = await callAssignApi(payload);

      logger.info('Assignment success', { result });

      await emitUISignal({
        writer,
        signalName: 'training_assigned',
        meta: { resourceId, targetId, assignmentType },
        logger,
        stepLabel: 'training-assignment',
      });

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
