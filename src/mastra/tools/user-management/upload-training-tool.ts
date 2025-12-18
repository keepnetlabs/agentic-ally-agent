import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { KVService } from '../../services/kv-service';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { errorService } from '../../services/error-service';

export const uploadTrainingTool = createTool({
    id: 'upload-training',
    description: 'Fetches the microlearning content by ID, prepares it, and uploads it to the platform via the SCORM worker.',
    inputSchema: z.object({
        microlearningId: z.string().describe('The ID of the microlearning content to upload'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        data: z.object({
            resourceId: z.string(),
            sendTrainingLanguageId: z.string().optional(), // Add this field
            microlearningId: z.string(),
            title: z.string().optional(),
        }).optional(),
        message: z.string().optional(),
        error: z.string().optional(),
    }),
    execute: async ({ context }) => {
        const logger = getLogger('UploadTrainingTool');
        const { microlearningId } = context;

        logger.info('Preparing upload for microlearning', { microlearningId });

        // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
        const store = requestStorage.getStore();
        const token = store?.token;
        const companyId = store?.companyId;
        const env = store?.env; // Cloudflare env (bindings: KV, D1, Service Bindings)

        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING);
            logger.warn('Auth error: Token missing', errorInfo);
            return { success: false, error: JSON.stringify(errorInfo) };
        }

        try {
            // 1. Fetch Content from KV
            const kvService = new KVService();
            const baseContent = await kvService.getMicrolearning(microlearningId);

            if (!baseContent || !baseContent.base) {
                throw new Error(`Microlearning content not found for ID: ${microlearningId}`);
            }

            const microlearningData = baseContent.base;

            // 2. Prepare Payload (Extract fields)
            const meta = microlearningData.microlearning_metadata;

            const category = (meta.category || 'General').trim().replace(/\s+/g, '');

            const rolesInput = meta.role_relevance || 'AllEmployees';
            const targetAudience = Array.isArray(rolesInput)
                ? rolesInput.join('').replace(/\s+/g, '')
                : (rolesInput || 'AllEmployees').toString().trim().replace(/\s+/g, '');

            const description = meta.description?.trim() || 'Microlearning training module';
            const title = meta.title?.trim() || 'Security Awareness Training';

            // Extract language from availability list (default to 'en-us' if empty)
            const availableLangs = meta.language_availability || [];
            const language = Array.isArray(availableLangs) && availableLangs.length > 0
                ? availableLangs[0]
                : 'en-us';

            const trainingData = {
                title,
                description,
                category,
                targetAudience,
                language,
            };

            // 3. Upload to Worker
            const payload = {
                accessToken: token, // Sensitive!
                companyId: companyId,
                url: API_ENDPOINTS.PLATFORM_API_URL,
                baseUrl: API_ENDPOINTS.MICROLEARNING_API_URL + microlearningId,
                trainingData: trainingData
            };

            // Secure Logging (Mask token)
            const maskedPayload = {
                ...payload,
                accessToken: token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : undefined
            };
            logger.debug('Upload payload prepared', { payload: maskedPayload });

            // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
            const result = await withRetry(async () => {
                // Service Binding kullan (production) veya fallback to public URL (local dev)
                let response: Response;

                if (env?.CRUD_WORKER) {
                    // ✅ SERVICE BINDING (Production - Internal Routing)
                    logger.debug('Using Service Binding: CRUD_WORKER');
                    response = await env.CRUD_WORKER.fetch('https://worker/submit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    // ⚠️ FALLBACK: Public URL (Local Development)
                    logger.debug('Using Public URL fallback for training upload', { url: API_ENDPOINTS.TRAINING_WORKER_URL });
                    response = await fetch(API_ENDPOINTS.TRAINING_WORKER_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Worker failed: ${response.status} - ${errorText}`);
                }

                return await response.json();
            }, `Upload training content ${microlearningId}`);

            logger.info('Training upload successful', { resourceId: result.resourceId, microlearningId });

            return {
                success: true,
                data: {
                    resourceId: result.resourceId,
                    sendTrainingLanguageId: result.languageId,
                    microlearningId: microlearningId,
                    title: title
                },
                message: `Training uploaded successfully. Resource ID ${result.resourceId} is ready for assignment.`
            };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const errorInfo = errorService.external(err.message, {
                microlearningId,
                stack: err.stack,
            });

            logger.error('Upload tool failed', errorInfo);

            return {
                success: false,
                error: JSON.stringify(errorInfo)
            };
        }
    },
});
