/**
 * assign-smishing-tool
 *
 * EU AI Act (Art. 9) Tool Risk Metadata:
 * - riskLevel: limited
 * - rationale: Assigns smishing simulation to user/group; affects training assignment
 * - humanOversight: approval-gated (Chat confirmation before execution)
 * @see docs/AI_COMPLIANCE_INVENTORY.md
 */
import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { isSafeId } from '../../utils/core/id-utils';
import { generateBatchId } from '../../utils/core/short-id';
import { KVService } from '../../services/kv-service';
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
import { fanOutGroupAssignment, groupResultSchema } from '../../utils/core/group-assignment';
import { emitUISignal } from '../../utils/core/ui-signal';

const assignSmishingOutputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      campaignName: z.string(),
      assignmentType: z.enum(['USER', 'GROUP']),
      targetId: z.string(),
      targetLabel: z.string(),
      resourceId: z.string(),
      languageId: z.string().optional(),
      groupResult: groupResultSchema.optional(),
    })
    .optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const assignSmishingTool = createTool({
  id: 'assign-smishing',
  description: 'Assigns an uploaded smishing simulation to a specific user or group.',
  inputSchema: z
    .object({
      resourceId: z
        .string()
        .describe('The Resource ID returned from the upload process')
        .refine(isSafeId, { message: 'Invalid resourceId format.' }),
      languageId: z
        .string()
        .nullable()
        .optional()
        .transform(v => v ?? undefined)
        .describe('The Language ID returned from the upload process')
        .refine(v => (v ? isSafeId(v) : true), { message: 'Invalid languageId format.' }),
      targetUserResourceId: z
        .string()
        .optional()
        .describe('The User ID to assign the smishing simulation to (user assignment)')
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
        .describe('The Group ID to assign the smishing simulation to (group assignment)')
        .refine(v => (v ? isSafeId(v) : true), { message: 'Invalid targetGroupResourceId format.' }),
      contentCategory: z
        .string()
        .optional()
        .describe('Free-text category classifying the activity (e.g. "Social Engineering", "Smishing Awareness"). Used by the Agentic AI Activities API.'),
    })
    .refine(data => Boolean(data.targetUserResourceId) !== Boolean(data.targetGroupResourceId), {
      message:
        'Provide EXACTLY ONE: targetUserResourceId (user assignment) OR targetGroupResourceId (group assignment).',
    }),
  outputSchema: assignSmishingOutputSchema,
  execute: async (inputData, ctx?: ToolExecutionContext) => {
    const writer = ctx?.writer;
    const logger = getLogger('AssignSmishingTool');
    const { resourceId, languageId, targetUserResourceId, targetUserEmail, targetUserFullName, targetGroupResourceId, contentCategory } =
      inputData;

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
        error: normalizeError(guardError).message,
      });
    }

    const isUserAssignment = !!targetUserResourceId;
    const assignmentType = isUserAssignment ? 'USER' : 'GROUP';
    const targetId = targetUserResourceId || targetGroupResourceId;
    const userLabel = isUserAssignment
      ? targetUserEmail?.trim() || targetUserFullName?.trim() || targetUserResourceId
      : undefined;
    const targetLabel = isUserAssignment ? userLabel : targetId;
    const name = `Smishing Campaign - ${targetId} (${assignmentType}) Agentic Ally`;

    logger.info(`Preparing smishing assignment for resource to ${assignmentType}`, {
      resourceId,
      languageId,
      targetUserResourceId,
      targetGroupResourceId,
    });

    const { token, companyId, env, baseApiUrl } = getRequestContext();
    const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    const commonPayloadFields = {
      activityType: 'smishing' as const,
      scenarioResourceId: resourceId,
      contentCategory: contentCategory || '',
      apiUrl: baseApiUrl,
      accessToken: token,
      companyId: effectiveCompanyId,
      smishingId: resourceId,
      languageId,
      name,
    };

    const callAssignApi = (p: AgenticActivitiesPayload) =>
      withRetry(
        () =>
          callWorkerAPI<WorkerSendResponse>({
            env,
            serviceBinding: env?.SMISHING_CRUD_WORKER,
            publicUrl: getWorkerUrls(baseApiUrl).SMISHING_WORKER_SEND,
            endpoint: 'https://worker/send',
            payload: p,
            token,
            errorPrefix: 'Assign API failed',
            operationName: `Assign smishing to user ${p.targetUserResourceId}`,
            baseApiUrl,
          }),
        `Assign smishing to user ${p.targetUserResourceId}`
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
          logErrorInfo(logger, 'warn', 'Group smishing assignment blocked: too many users', errorInfo);
          return createToolErrorResponse(errorInfo);
        }

        logger.info('Group smishing assignment complete', { fanOutResult });

        await emitUISignal({
          writer,
          signalName: 'smishing_assigned',
          meta: {
            resourceId,
            groupResourceId: targetGroupResourceId,
            totalUsers: fanOutResult.totalUsers,
            succeeded: fanOutResult.succeeded,
            failed: fanOutResult.failed,
          },
          logger,
          stepLabel: 'smishing-assignment',
        });

        const hasAnySuccess = fanOutResult.succeeded > 0;
        const isEmptyGroup = fanOutResult.totalUsers === 0;
        const failedSuffix = fanOutResult.failed > 0 ? ` (${fanOutResult.failed} failed)` : '';

        let prefix: string;
        if (isEmptyGroup) {
          prefix = '⚠️ Group has no active users — nothing to assign';
        } else if (hasAnySuccess) {
          prefix = `✅ Smishing campaign assigned to ${fanOutResult.succeeded}/${fanOutResult.totalUsers} users${failedSuffix}`;
        } else {
          prefix = `❌ Smishing campaign assignment failed for all ${fanOutResult.totalUsers} users`;
        }

        const toolResult = {
          success: hasAnySuccess || isEmptyGroup,
          data: {
            campaignName: name,
            assignmentType: 'GROUP' as const,
            targetId: targetGroupResourceId,
            targetLabel: targetGroupResourceId,
            resourceId,
            ...(languageId ? { languageId } : {}),
            groupResult: fanOutResult,
          },
          message: formatToolSummary({
            prefix,
            title: name,
            kv: [
              { key: 'resourceId', value: resourceId },
              { key: 'groupResourceId', value: targetGroupResourceId },
            ],
          }),
          ...(!hasAnySuccess && !isEmptyGroup ? { error: `All ${fanOutResult.totalUsers} user assignments failed` } : {}),
        };

        const validation = validateToolResult(toolResult, assignSmishingOutputSchema, 'assign-smishing');
        if (!validation.success) {
          logErrorInfo(logger, 'error', 'Assign smishing result validation failed', validation.error);
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
      logger.info('Assign smishing payload prepared', { payload: maskedPayload });

      const result = await callAssignApi(payload);

      logger.info('Smishing assignment success', { result });

      await emitUISignal({
        writer,
        signalName: 'smishing_assigned',
        meta: { resourceId, targetId, assignmentType },
        logger,
        stepLabel: 'smishing-assignment',
      });

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
          prefix: result.message
            ? `✅ ${result.message}`
            : `✅ Smishing campaign assigned to ${assignmentType} ${targetLabel}`,
          title: result.message ? undefined : name,
          kv: [
            { key: 'resourceId', value: resourceId },
            { key: 'languageId', value: languageId },
          ],
        }),
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
