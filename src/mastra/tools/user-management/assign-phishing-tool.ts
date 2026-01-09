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
const assignPhishingOutputSchema = z.object({
    success: z.boolean(),
    data: z.object({
        campaignName: z.string(),
        assignmentType: z.enum(['USER', 'GROUP']),
        targetId: z.string(),
        targetLabel: z.string(),
        resourceId: z.string(),
        languageId: z.string().optional(),
        followUpTrainingId: z.string().optional(),
    }).optional(),
    message: z.string().optional(),
    error: z.string().optional(),
});

export const assignPhishingTool = createTool({
    id: 'assign-phishing',
    description: 'Assigns an uploaded phishing simulation to a specific user or group.',
    inputSchema: z.object({
        resourceId: z.string().describe('The Resource ID returned from the upload process').refine(isSafeId, { message: 'Invalid resourceId format.' }),
        languageId: z.string().optional().describe('The Language ID returned from the upload process').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid languageId format.' }),
        isQuishing: z.boolean().optional().describe('Quishing flag (can be passed from upload result)'),
        targetUserResourceId: z.string().optional().describe('The User ID to assign the phishing simulation to (user assignment)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid targetUserResourceId format.' }),
        targetUserEmail: z.string().email().optional().describe('Optional: user email for display in summary messages (does not affect assignment).'),
        targetUserFullName: z.string().optional().describe('Optional: user full name for display in summary messages (does not affect assignment).'),
        targetGroupResourceId: z.string().optional().describe('The Group ID to assign the phishing simulation to (group assignment)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid targetGroupResourceId format.' }),
        trainingId: z.string().optional().describe('The Training Resource ID to send after phishing simulation (if sendAfterPhishingSimulation is true)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid trainingId format.' }),
        sendTrainingLanguageId: z.string().optional().describe('The Training Language ID to send after phishing simulation (if sendAfterPhishingSimulation is true)').refine((v) => (v ? isSafeId(v) : true), { message: 'Invalid sendTrainingLanguageId format.' })
    }).refine(
        data => Boolean(data.targetUserResourceId) !== Boolean(data.targetGroupResourceId),
        { message: 'Provide EXACTLY ONE: targetUserResourceId (user assignment) OR targetGroupResourceId (group assignment).' }
    ),
    outputSchema: assignPhishingOutputSchema,
    execute: async ({ context }) => {
        const logger = getLogger('AssignPhishingTool');
        const { resourceId, languageId, isQuishing, targetUserResourceId, targetUserEmail, targetUserFullName, targetGroupResourceId, trainingId, sendTrainingLanguageId } = context;

        // Determine assignment type
        const isUserAssignment = !!targetUserResourceId;
        const assignmentType = isUserAssignment ? 'USER' : 'GROUP';
        const targetId = targetUserResourceId || targetGroupResourceId;
        const userLabel = isUserAssignment
            ? (targetUserEmail?.trim() || targetUserFullName?.trim() || targetUserResourceId)
            : undefined;
        const targetLabel = isUserAssignment ? userLabel : targetId;
        const name = `Phishing Campaign - ${targetId} (${assignmentType}) Agentic Ally`;

        logger.info(`Preparing phishing assignment for resource to ${assignmentType}`, {
            resourceId,
            languageId,
            targetUserResourceId,
            targetGroupResourceId,
            trainingId,
            sendTrainingLanguageId
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
            phishingId: resourceId,
            languageId: languageId,
            isQuishing: isQuishing || false, // Add quishing flag for backend routing
            ...(targetUserResourceId && { targetUserResourceId }),
            ...(targetGroupResourceId && { targetGroupResourceId }),
            name,
            ...(trainingId && { trainingId }),
            ...(sendTrainingLanguageId && { sendTrainingLanguageId })
        };

        // Log Payload with masked token
        const maskedPayload = maskSensitiveField(payload, 'accessToken');
        logger.debug('Assign phishing payload prepared', { payload: maskedPayload });

        try {
            // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
            const result = await withRetry(
                () => callWorkerAPI({
                    env,
                    serviceBinding: env?.PHISHING_CRUD_WORKER,
                    publicUrl: API_ENDPOINTS.PHISHING_WORKER_SEND,
                    endpoint: 'https://worker/send',
                    payload,
                    token,
                    errorPrefix: 'Assign API failed',
                    operationName: `Assign phishing to ${assignmentType} ${targetId}`
                }),
                `Assign phishing to ${assignmentType} ${targetId}`
            );

            logger.info('Phishing assignment success', { resultKeys: Object.keys(result) });

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
                    prefix: `✅ ${isQuishing ? 'Quishing' : 'Phishing'} campaign assigned to ${assignmentType} ${targetLabel}`,
                    title: name,
                    kv: [
                        { key: 'resourceId', value: resourceId },
                        { key: 'languageId', value: languageId },
                        { key: 'followUpTrainingId', value: trainingId },
                    ],
                })
            };

            // Validate result against output schema
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

