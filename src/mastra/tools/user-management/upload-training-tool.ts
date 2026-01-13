import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI, type ServiceBinding } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { KVService } from '../../services/kv-service';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { waitForKVConsistency, buildExpectedKVKeys } from '../../utils/kv-consistency';
import { MicrolearningService } from '../../services/microlearning-service';
import { MicrolearningContent } from '../../types/microlearning';
import { extractCompanyIdFromTokenExport } from '../../utils/core/policy-fetcher';
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';
import { summarizeForLog } from '../../utils/core/log-redaction-utils';

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
        const { token, companyId, env, baseApiUrl } = getRequestContext();
        const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING);
            logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
            return createToolErrorResponse(errorInfo);
        }

        try {
            const safeEnv: Record<string, unknown> = env ?? {};
            const toServiceBinding = (value: unknown): ServiceBinding | undefined => {
                if (!value || typeof value !== 'object') return undefined;
                if (!('fetch' in value)) return undefined;
                return typeof (value as { fetch?: unknown }).fetch === 'function' ? (value as ServiceBinding) : undefined;
            };

            const serviceBinding = toServiceBinding(safeEnv.CRUD_WORKER);

            // 1. Wait for KV consistency (handles eventual consistency)
            // Build expected keys - we only need base key for upload
            const expectedKeys = buildExpectedKVKeys(microlearningId);
            await waitForKVConsistency(microlearningId, expectedKeys);

            // 1.5. Additional wait after consistency check (Cloudflare KV eventual consistency)
            // Even if key exists, content might not be fully readable yet
            logger.debug('Waiting additional time for KV content to be fully readable', { microlearningId });
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds additional wait for Cloudflare KV eventual consistency

            // 2. Fetch Content from KV with retry (handles eventual consistency edge cases)
            const kvService = new KVService();
            let baseContent: { base?: MicrolearningContent } | undefined;
            try {
                baseContent = await withRetry(
                    async () => {
                        const result = await kvService.getMicrolearning(microlearningId);
                        // Throw error if null to trigger retry mechanism
                        if (!result || !result.base) {
                            const errorInfo = errorService.notFound(`Microlearning content not found for ID: ${microlearningId}`, {
                                microlearningId,
                                step: 'fetch-microlearning-content'
                            });
                            throw new Error(errorInfo.message);
                        }
                        return result;
                    },
                    `Fetch microlearning content ${microlearningId}`
                );
            } catch (kvError) {
                const cachedMicrolearning = MicrolearningService.getCachedMicrolearning(microlearningId);
                if (cachedMicrolearning) {
                    const normalizedError = normalizeError(kvError);
                    logger.warn('KV fetch failed, falling back to in-memory microlearning cache', {
                        microlearningId,
                        error: normalizedError.message
                    });
                    baseContent = { base: cachedMicrolearning };
                } else {
                    throw kvError;
                }
            }

            if (!baseContent || !baseContent.base) {
                const errorInfo = errorService.notFound(
                    `Microlearning content not found for ID: ${microlearningId}. The content may still be processing.`,
                    { microlearningId }
                );
                logErrorInfo(logger, 'warn', 'Microlearning not found', errorInfo);
                return createToolErrorResponse(errorInfo);
            }

            const microlearningData = baseContent.base;

            // 2. Prepare Payload (Extract fields)
            const meta = microlearningData.microlearning_metadata;

            const category = (meta.category || 'General').trim().replace(/\s+/g, '');

            // Handle potential legacy data where role_relevance might be string or undefined
            const rolesInput = (meta.role_relevance as unknown as (string[] | string | undefined)) || 'AllEmployees';
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

            // Extract department for inbox URL (from department_relevance array, default to 'all')
            const departmentArray = meta.department_relevance || [];
            const department = Array.isArray(departmentArray) && departmentArray.length > 0
                ? departmentArray[0]
                : 'all';
            const inboxUrl = `inbox/${department.toLowerCase()}`;

            const trainingData = {
                title,
                description,
                category,
                targetAudience,
                language,
                inboxUrl,
            };
            // 3. Upload to Worker (includes inboxUrl for department-specific inbox assignment)
            const payload = {
                accessToken: token, // Sensitive!
                companyId: effectiveCompanyId,
                url: baseApiUrl, // Dynamic URL from header or environment
                baseUrl: API_ENDPOINTS.MICROLEARNING_API_URL + microlearningId,
                trainingData
            };

            // Secure Logging (Mask token)
            const maskedPayload = maskSensitiveField(payload, 'accessToken');
            logger.debug('Upload payload prepared (redacted)', {
                payload: summarizeForLog(maskedPayload),
                trainingData: summarizeForLog(maskedPayload.trainingData),
            });

            // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
            const result = await withRetry(
                () => callWorkerAPI({
                    env: safeEnv,
                    serviceBinding,
                    publicUrl: API_ENDPOINTS.TRAINING_WORKER_URL,
                    endpoint: 'https://worker/submit',
                    payload,
                    token,
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
                message: formatToolSummary({
                    prefix: '✅ Training uploaded',
                    title,
                    suffix: 'Ready to assign',
                    kv: [
                        { key: 'resourceId', value: result.resourceId },
                        { key: 'sendTrainingLanguageId', value: result.languageId },
                        { key: 'microlearningId', value: microlearningId },
                    ],
                })
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
