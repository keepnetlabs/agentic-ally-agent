import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { KVService } from '../../services/kv-service';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';

// Output schema defined separately to avoid circular reference
const uploadTrainingOutputSchema = z.object({
    success: z.boolean(),
    data: z.object({
        resourceId: z.string(),
        sendTrainingLanguageId: z.string().optional(),
        microlearningId: z.string(),
        title: z.string().optional(),
    }).optional(),
    message: z.string().optional(),
    error: z.string().optional(),
});

export const uploadTrainingTool = createTool({
    id: 'upload-training',
    description: 'Fetches the microlearning content by ID, prepares it, and uploads it to the platform via the SCORM worker.',
    inputSchema: z.object({
        microlearningId: z.string().describe('The ID of the microlearning content to upload'),
    }),
    outputSchema: uploadTrainingOutputSchema,
    execute: async ({ context }) => {
        const logger = getLogger('UploadTrainingTool');
        const { microlearningId } = context;

        logger.info('Preparing upload for microlearning', { microlearningId });

        // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
        const { token, companyId, env } = getRequestContext();

        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING);
            logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
            return createToolErrorResponse(errorInfo);
        }

        try {
            // 1. Fetch Content from KV
            const kvService = new KVService();
            const baseContent = await kvService.getMicrolearning(microlearningId);

            if (!baseContent || !baseContent.base) {
                const errorInfo = errorService.notFound(`Microlearning content not found for ID: ${microlearningId}`, { microlearningId });
                logErrorInfo(logger, 'warn', 'Microlearning not found', errorInfo);
                return createToolErrorResponse(errorInfo);
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
            const maskedPayload = maskSensitiveField(payload, 'accessToken', token);
            logger.debug('Upload payload prepared', { payload: maskedPayload });

            // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
            const result = await withRetry(
                () => callWorkerAPI({
                    env,
                    serviceBinding: env?.CRUD_WORKER,
                    publicUrl: API_ENDPOINTS.TRAINING_WORKER_URL,
                    endpoint: 'https://worker/submit',
                    payload,
                    errorPrefix: 'Worker failed',
                    operationName: `Upload training content ${microlearningId}`
                }),
                `Upload training content ${microlearningId}`
            );

            logger.info('Training upload successful', { resourceId: result.resourceId, microlearningId });

            const toolResult = {
                success: true,
                data: {
                    resourceId: result.resourceId,
                    sendTrainingLanguageId: result.languageId,
                    microlearningId: microlearningId,
                    title: title
                },
                message: `Training uploaded successfully. Resource ID ${result.resourceId} is ready for assignment.`
            };

            // Validate result against output schema
            const validation = validateToolResult(toolResult, uploadTrainingOutputSchema, 'upload-training');
            if (!validation.success) {
                logErrorInfo(logger, 'error', 'Upload training result validation failed', validation.error);
                return createToolErrorResponse(validation.error);
            }

            return validation.data;

        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                microlearningId,
                stack: err.stack,
            });

            logErrorInfo(logger, 'error', 'Upload tool failed', errorInfo);

            return createToolErrorResponse(errorInfo);
        }
    },
});
