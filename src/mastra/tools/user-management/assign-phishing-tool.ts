import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { errorService } from '../../services/error-service';

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
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
    }),
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
        const store = requestStorage.getStore();
        const token = store?.token;
        const companyId = store?.companyId;
        const env = store?.env; // Cloudflare env (bindings: KV, D1, Service Bindings)

        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING);
            logger.warn('Auth error: Token missing', errorInfo);
            return { success: false, error: JSON.stringify(errorInfo) };
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
        const maskedPayload = {
            ...payload,
            accessToken: token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : undefined
        };
        logger.debug('Assign phishing payload prepared', { payload: maskedPayload });

        try {
            // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
            const result = await withRetry(async () => {
                // Service Binding kullan (production) veya fallback to public URL (local dev)
                let response: Response;

                if (env?.PHISHING_CRUD_WORKER) {
                    // ✅ SERVICE BINDING (Production - Internal Routing)
                    logger.debug('Using Service Binding: PHISHING_CRUD_WORKER');
                    response = await env.PHISHING_CRUD_WORKER.fetch('https://worker/send', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });
                } else {
                    // ⚠️ FALLBACK: Public URL (Local Development)
                    logger.debug('Using Public URL fallback for phishing assignment', { url: API_ENDPOINTS.PHISHING_WORKER_SEND });
                    response = await fetch(API_ENDPOINTS.PHISHING_WORKER_SEND, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Assign API failed: ${response.status} - ${errorText}`);
                }

                return await response.json();
            }, `Assign phishing to user ${targetUserResourceId}`);

            logger.info('Phishing assignment success', { resultKeys: Object.keys(result) });

            return {
                success: true,
                message: 'Phishing simulation assigned successfully.'
            };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const errorInfo = errorService.external(err.message, {
                resourceId,
                targetUserResourceId,
                stack: err.stack,
            });

            logger.error('Assign phishing tool failed', errorInfo);

            return {
                success: false,
                error: JSON.stringify(errorInfo)
            };
        }
    },
});

