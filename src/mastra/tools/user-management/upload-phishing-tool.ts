import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import { KVService } from '../../services/kv-service';
import { ERROR_MESSAGES, API_ENDPOINTS } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';

// Output schema defined separately to avoid circular reference
const uploadPhishingOutputSchema = z.object({
    success: z.boolean(),
    data: z.object({
        resourceId: z.string(), // CRITICAL: Uses scenarioResourceId if available, otherwise templateResourceId (for assignment)
        templateResourceId: z.string().optional(), // Original template resource ID
        templateId: z.number().optional(),
        landingPageResourceId: z.string().nullable().optional(),
        landingPageId: z.number().nullable().optional(),
        scenarioResourceId: z.string().nullable().optional(), // Scenario resource ID (preferred for assignment)
        scenarioId: z.number().nullable().optional(),
        languageId: z.string().optional(), // May not be in backend response, kept for compatibility
        phishingId: z.string(),
        title: z.string().optional(),
    }).optional(),
    message: z.string().optional(),
    error: z.string().optional(),
});

export const uploadPhishingTool = createTool({
    id: 'upload-phishing',
    description: 'Fetches the phishing content by ID, prepares it, and uploads it to the platform via the phishing worker.',
    inputSchema: z.object({
        phishingId: z.string().describe('The ID of the phishing content to upload'),
    }),
    outputSchema: uploadPhishingOutputSchema,
    execute: async ({ context }) => {
        const logger = getLogger('UploadPhishingTool');
        const { phishingId } = context;

        logger.info('Preparing upload for phishing content', { phishingId });

        // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
        const store = requestStorage.getStore();
        const token = store?.token;
        const companyId = store?.companyId;
        const env = store?.env; // Cloudflare env (bindings: KV, D1, Service Bindings)

        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING);
            logger.warn('Auth error: Token missing', { code: errorInfo.code, message: errorInfo.message, category: errorInfo.category });
            return { success: false, error: JSON.stringify(errorInfo) };
        }

        try {
            // 1. Fetch Content from KV
            // Use phishing namespace ID (same as in create-phishing-workflow.ts)
            const kvService = new KVService('f6609d79aa2642a99584b05c64ecaa9f');
            const phishingContent = await kvService.getPhishing(phishingId);

            if (!phishingContent || !phishingContent.base) {
                const errorInfo = errorService.notFound(`Phishing content not found for ID: ${phishingId}`, { phishingId });
                logger.warn('Phishing content not found', { code: errorInfo.code, message: errorInfo.message, category: errorInfo.category });
                return {
                    success: false,
                    error: JSON.stringify(errorInfo)
                };
            }

            const phishingData = phishingContent.base;
            const emailContent = phishingContent.email;
            const landingContent = phishingContent.landing;

            // 2. Prepare Payload (Extract fields from base metadata)
            const name = phishingData.name?.trim();
            const description = phishingData.description?.trim();
            const topic = phishingData.topic?.trim();
            const difficulty = phishingData.difficulty;
            const method = phishingData.method;

            // Extract language from availability list (default to 'en-gb' if empty)
            const availableLangs = phishingData.language_availability || [];
            const language = Array.isArray(availableLangs) && availableLangs.length > 0
                ? availableLangs[0]
                : 'en-gb';

            logger.debug('Language extracted for upload', {
                availableLangs,
                selectedLanguage: language,
                phishingId
            });

            const phishingPayload = {
                name,
                description,
                topic,
                difficulty,
                method,
                language,
                email: emailContent ? {
                    subject: emailContent.subject,
                    template: emailContent.template,
                    fromAddress: emailContent.fromAddress,
                    fromName: emailContent.fromName,
                } : undefined,
                landingPage: landingContent ? {
                    ...landingContent,
                } : undefined,
            };

            // 3. Upload to Worker
            const payload = {
                accessToken: token, // Sensitive!
                companyId: companyId,
                url: API_ENDPOINTS.PLATFORM_API_URL,
                phishingData: phishingPayload
            };

            // Secure Logging (Mask token)
            const maskedPayload = {
                ...payload,
                accessToken: token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : undefined
            };
            logger.debug('Upload payload prepared', { payload: maskedPayload });

            // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
            const result = await withRetry(
                () => callWorkerAPI({
                    env,
                    serviceBinding: env?.PHISHING_CRUD_WORKER,
                    publicUrl: API_ENDPOINTS.PHISHING_WORKER_URL,
                    endpoint: 'https://worker/submit',
                    payload,
                    errorPrefix: 'Worker failed',
                    operationName: `Upload phishing content ${phishingId}`
                }),
                `Upload phishing content ${phishingId}`
            );

            logger.info('Phishing upload successful', {
                success: result.success,
                templateResourceId: result.templateResourceId,
                templateId: result.templateId,
                landingPageResourceId: result.landingPageResourceId,
                landingPageId: result.landingPageId,
                scenarioResourceId: result.scenarioResourceId,
                scenarioId: result.scenarioId,
                message: result.message
            });

            // Backend returns: { templateResourceId, templateId, landingPageResourceId, landingPageId, scenarioResourceId, scenarioId, message }
            // Map to our expected format
            const templateResourceId = result.templateResourceId || result.resourceId; // Fallback for backward compatibility
            const scenarioResourceId = result.scenarioResourceId || null;

            // CRITICAL: Use scenarioResourceId for assignment if available, otherwise fallback to templateResourceId
            // Backend API expects scenarioResourceId for assignment (based on "Phishing scenario not found" error)
            const resourceIdForAssignment = scenarioResourceId || templateResourceId;

            const toolResult = {
                success: true,
                data: {
                    resourceId: resourceIdForAssignment, // Use scenarioResourceId if available, otherwise templateResourceId
                    templateResourceId: templateResourceId, // Keep original templateResourceId for reference
                    templateId: result.templateId,
                    landingPageResourceId: result.landingPageResourceId || null,
                    landingPageId: result.landingPageId || null,
                    scenarioResourceId: scenarioResourceId, // Scenario resource ID (may be null)
                    scenarioId: result.scenarioId || null,
                    languageId: result.languageId, // May not exist in backend response, kept for compatibility
                    phishingId: phishingId,
                    title: name
                },
                message: result.message || `Phishing simulation uploaded successfully. Resource ID ${resourceIdForAssignment} is ready for assignment.`
            };

            // Validate result against output schema
            const validation = validateToolResult(toolResult, uploadPhishingOutputSchema, 'upload-phishing');
            if (!validation.success) {
                logger.error('Upload phishing result validation failed', { code: validation.error.code, message: validation.error.message });
                return {
                    success: false,
                    error: JSON.stringify(validation.error)
                };
            }

            return validation.data;

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const errorInfo = errorService.external(err.message, {
                phishingId,
                stack: err.stack,
            });

            logger.error('Upload tool failed', { code: errorInfo.code, message: errorInfo.message, category: errorInfo.category });

            return {
                success: false,
                error: JSON.stringify(errorInfo)
            };
        }
    },
});


