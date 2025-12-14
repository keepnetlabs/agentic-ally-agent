import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { ERROR_MESSAGES } from '../../constants';

const ASSIGN_API_URL = 'https://crud-phishing-worker.keepnet-labs-ltd-business-profile4086.workers.dev/send';
const API_URL = 'https://test-api.devkeepnet.com';

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
            return { success: false, error: ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING };
        }

        const payload = {
            apiUrl: API_URL,
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
                logger.debug('Using Public URL fallback for phishing assignment', { url: ASSIGN_API_URL });
                response = await fetch(ASSIGN_API_URL, {
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

            const result = await response.json();
            logger.info('Phishing assignment success', { resultKeys: Object.keys(result) });

            return {
                success: true,
                message: 'Phishing simulation assigned successfully.'
            };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Assign phishing tool failed', { error: err.message, stack: err.stack });
            return {
                success: false,
                error: error instanceof Error ? error.message : ERROR_MESSAGES.PLATFORM.UNKNOWN_ASSIGN_ERROR
            };
        }
    },
});

