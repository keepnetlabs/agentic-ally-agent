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

// Output schema defined separately to avoid circular reference
const assignPhishingOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    error: z.string().optional(),
});

export const assignPhishingTool = createTool({
    id: 'assign-phishing',
    description: 'Assigns an uploaded phishing simulation to a specific user.',
    inputSchema: z.object({
        resourceId: z.string().describe('The Resource ID returned from the upload process'),
        languageId: z.string().optional().describe('The Language ID returned from the upload process'),
        targetUserResourceId: z.string().describe('The User ID to assign the phishing simulation to'),
        trainingId: z.string().optional().describe('The Training Resource ID to send after phishing simulation (if sendAfterPhishingSimulation is true)'),
        sendTrainingLanguageId: z.string().optional().describe('The Training Language ID to send after phishing simulation (if sendAfterPhishingSimulation is true)')
    }),
    outputSchema: assignPhishingOutputSchema,
    execute: async ({ context }) => {
        const logger = getLogger('AssignPhishingTool');
        const { resourceId, languageId, targetUserResourceId, trainingId, sendTrainingLanguageId } = context;
        const name = `Phishing Campaign - ${targetUserResourceId} Agentic Ally`;

        logger.info('Preparing phishing assignment for resource to user', {
            resourceId,
            languageId,
            targetUserResourceId,
            trainingId,
            sendTrainingLanguageId
        });

        // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
        const { token, companyId, env } = getRequestContext();

        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
            logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
            return createToolErrorResponse(errorInfo);
        }

        const payload = {
            apiUrl: API_ENDPOINTS.PLATFORM_API_URL,
            accessToken: token,
            companyId: companyId,
            phishingId: resourceId,
            languageId: languageId,
            targetUserResourceId: targetUserResourceId,
            name,
            ...(trainingId && { trainingId }),
            ...(sendTrainingLanguageId && { sendTrainingLanguageId })
        };

        // Log Payload with masked token
        const maskedPayload = maskSensitiveField(payload, 'accessToken', token);
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
                    operationName: `Assign phishing to user ${targetUserResourceId}`
                }),
                `Assign phishing to user ${targetUserResourceId}`
            );

            logger.info('Phishing assignment success', { resultKeys: Object.keys(result) });

            const toolResult = {
                success: true,
                message: 'Phishing simulation assigned successfully.'
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
                stack: err.stack,
            });

            logErrorInfo(logger, 'error', 'Assign phishing tool failed', errorInfo);

            return createToolErrorResponse(errorInfo);
        }
    },
});

