/**
 * assign-phishing-tool
 *
 * EU AI Act (Art. 9) Tool Risk Metadata:
 * - riskLevel: limited
 * - rationale: Assigns phishing simulation to user/group; affects training assignment and target selection
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

const assignPhishingOutputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      campaignName: z.string(),
      assignmentType: z.enum(['USER', 'GROUP']),
      targetId: z.string(),
      targetLabel: z.string(),
      resourceId: z.string(),
      languageId: z.string().optional(),
      followUpTrainingId: z.string().optional(),
      groupResult: groupResultSchema.optional(),
    })
    .optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const assignPhishingTool = createTool({
  id: 'assign-phishing',
  description: 'Assigns an uploaded phishing simulation to a specific user or group.',
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
      isQuishing: z.boolean().optional().describe('Quishing flag (can be passed from upload result)'),
      targetUserResourceId: z
        .string()
        .optional()
        .describe('The User ID to assign the phishing simulation to (user assignment)')
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
        .describe('The Group ID to assign the phishing simulation to (group assignment)')
        .refine(v => (v ? isSafeId(v) : true), { message: 'Invalid targetGroupResourceId format.' }),
      trainingId: z
        .string()
        .nullable()
        .optional()
        .transform(v => v ?? undefined)
        .describe('The Training Resource ID to send after phishing simulation (if sendAfterPhishingSimulation is true)')
        .refine(v => (v ? isSafeId(v) : true), { message: 'Invalid trainingId format.' }),
      sendTrainingLanguageId: z
        .string()
        .nullable()
        .optional()
        .transform(v => v ?? undefined)
        .describe('The Training Language ID to send after phishing simulation (if sendAfterPhishingSimulation is true)')
        .refine(v => (v ? isSafeId(v) : true), { message: 'Invalid sendTrainingLanguageId format.' }),
      contentCategory: z
        .string()
        .optional()
        .describe('Free-text category classifying the activity (e.g. "Social Engineering", "Phishing Awareness"). Used by the Agentic AI Activities API.'),
      explanationJson: z
        .object({ reasoningText: z.string() })
        .optional()
        .describe('AI reasoning for why this activity was created. Sent to the Agentic AI Activities API as explanationJson.'),
    })
    .refine(data => Boolean(data.targetUserResourceId) !== Boolean(data.targetGroupResourceId), {
      message:
        'Provide EXACTLY ONE: targetUserResourceId (user assignment) OR targetGroupResourceId (group assignment).',
    }),
  outputSchema: assignPhishingOutputSchema,
  execute: async (inputData, ctx?: ToolExecutionContext) => {
    const writer = ctx?.writer;
    const logger = getLogger('AssignPhishingTool');
    const {
      resourceId,
      languageId,
      isQuishing,
      targetUserResourceId,
      targetUserEmail,
      targetUserFullName,
      targetGroupResourceId,
      trainingId,
      sendTrainingLanguageId,
      contentCategory,
      explanationJson,
    } = inputData;

    // Guard: prevent assigning with raw phishingId (must upload first)
    try {
      const kvService = new KVService(KV_NAMESPACES.PHISHING);
      const phishingContent = await kvService.getPhishing(resourceId);
      if (phishingContent?.base) {
        const errorInfo = errorService.validation(
          'Phishing content must be uploaded before assignment. Use uploadPhishing first.',
          { field: 'resourceId', reason: 'phishingId_not_uploaded', resourceId }
        );
        logErrorInfo(logger, 'warn', 'Assign phishing blocked: upload required', errorInfo);
        return createToolErrorResponse(errorInfo);
      }
    } catch (guardError) {
      logger.warn('Assign phishing upload guard failed, continuing', {
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
    const name = `Phishing Campaign - ${targetId} (${assignmentType}) Agentic Ally`;

    logger.info(`Preparing phishing assignment for resource to ${assignmentType}`, {
      resourceId,
      languageId,
      targetUserResourceId,
      targetGroupResourceId,
      trainingId,
      sendTrainingLanguageId,
    });

    // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
    const { token, companyId, env, baseApiUrl } = getRequestContext();
    const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

    if (!token) {
      const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
      logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
      return createToolErrorResponse(errorInfo);
    }

    const campaignType = isQuishing ? 'quishing' : 'phishing';

    const commonPayloadFields = {
      activityType: (isQuishing ? 'quishing' : 'phishing') as 'phishing' | 'quishing',
      scenarioResourceId: resourceId,
      contentCategory: contentCategory || '',
      ...(explanationJson && { explanationJson }),
      apiUrl: baseApiUrl,
      accessToken: token,
      companyId: effectiveCompanyId,
      phishingId: resourceId,
      languageId,
      isQuishing: isQuishing || false,
      name,
      ...(trainingId && { trainingId }),
      ...(sendTrainingLanguageId && { sendTrainingLanguageId }),
    };

    const callAssignApi = (p: AgenticActivitiesPayload) =>
      withRetry(
        () =>
          callWorkerAPI<WorkerSendResponse>({
            env,
            serviceBinding: env?.PHISHING_CRUD_WORKER,
            publicUrl: getWorkerUrls(baseApiUrl).PHISHING_WORKER_SEND,
            endpoint: 'https://worker/send',
            payload: p,
            token,
            errorPrefix: 'Assign API failed',
            operationName: `Assign ${campaignType} to user ${p.targetUserResourceId}`,
            baseApiUrl,
          }),
        `Assign ${campaignType} to user ${p.targetUserResourceId}`
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
          logErrorInfo(logger, 'warn', 'Group phishing assignment blocked: too many users', errorInfo);
          return createToolErrorResponse(errorInfo);
        }

        logger.info('Group phishing assignment complete', { fanOutResult });

        await emitUISignal({
          writer,
          signalName: 'phishing_assigned',
          meta: {
            resourceId,
            groupResourceId: targetGroupResourceId,
            totalUsers: fanOutResult.totalUsers,
            succeeded: fanOutResult.succeeded,
            failed: fanOutResult.failed,
          },
          logger,
          stepLabel: 'phishing-assignment',
        });

        const hasAnySuccess = fanOutResult.succeeded > 0;
        const isEmptyGroup = fanOutResult.totalUsers === 0;
        const failedSuffix = fanOutResult.failed > 0 ? ` (${fanOutResult.failed} failed)` : '';

        let prefix: string;
        if (isEmptyGroup) {
          prefix = '⚠️ Group has no active users — nothing to assign';
        } else if (hasAnySuccess) {
          prefix = `✅ ${campaignType} campaign assigned to ${fanOutResult.succeeded}/${fanOutResult.totalUsers} users${failedSuffix}`;
        } else {
          prefix = `❌ ${campaignType} campaign assignment failed for all ${fanOutResult.totalUsers} users`;
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
            ...(trainingId ? { followUpTrainingId: trainingId } : {}),
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

        const validation = validateToolResult(toolResult, assignPhishingOutputSchema, 'assign-phishing');
        if (!validation.success) {
          logErrorInfo(logger, 'error', 'Assign phishing result validation failed', validation.error);
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
      logger.info('Assign phishing payload prepared', { payload: maskedPayload });

      const result = await callAssignApi(payload);

      logger.info('Phishing assignment success', { result });

      await emitUISignal({
        writer,
        signalName: 'phishing_assigned',
        meta: { resourceId, targetId, assignmentType },
        logger,
        stepLabel: 'phishing-assignment',
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
          ...(trainingId ? { followUpTrainingId: trainingId } : {}),
        },
        message: formatToolSummary({
          prefix: result.message
            ? `✅ ${result.message}`
            : `✅ ${campaignType} campaign assigned to ${assignmentType} ${targetLabel}`,
          title: result.message ? undefined : name,
          kv: [
            { key: 'resourceId', value: resourceId },
            { key: 'languageId', value: languageId },
            { key: 'followUpTrainingId', value: trainingId },
          ],
        }),
      };

      const validation = validateToolResult(toolResult, assignPhishingOutputSchema, 'assign-phishing');
      if (!validation.success) {
        logErrorInfo(logger, 'error', 'Assign phishing result validation failed', validation.error);
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

      logErrorInfo(logger, 'error', 'Assign phishing tool failed', errorInfo);

      return createToolErrorResponse(errorInfo);
    }
  },
});
