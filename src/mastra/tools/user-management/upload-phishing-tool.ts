import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { uuidv4 } from '../../utils/core/id-utils';
import { getRequestContext } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { withRetry } from '../../utils/core/resilience-utils';
import { callWorkerAPI } from '../../utils/core/worker-api-client';
import { maskSensitiveField } from '../../utils/core/security-utils';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { KVService } from '../../services/kv-service';
import { ERROR_MESSAGES, API_ENDPOINTS, KV_NAMESPACES } from '../../constants';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { extractCompanyIdFromTokenExport } from '../../utils/core/policy-fetcher';
import { formatToolSummary } from '../../utils/core/tool-summary-formatter';
import { summarizeForLog } from '../../utils/core/log-redaction-utils';

interface UploadPhishingWorkerResult {
    success?: boolean;
    templateResourceId?: string;
    templateId?: number;
    landingPageResourceId?: string;
    landingPageId?: number;
    scenarioResourceId?: string;
    scenarioId?: number;
    languageId?: string;
    resourceId?: string; // fallback older worker response
    message?: string;
}

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
        isQuishing: z.boolean().optional(), // Quishing flag for passing to assign tool
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
    execute: async ({ context, writer }) => {
        const logger = getLogger('UploadPhishingTool');
        const { phishingId } = context;

        logger.info('Preparing upload for phishing content', { phishingId });

        // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
        const { token, companyId, env, baseApiUrl } = getRequestContext();
        const effectiveCompanyId = companyId || (token ? extractCompanyIdFromTokenExport(token) : undefined);

        if (!token) {
            const errorInfo = errorService.auth(ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING);
            logErrorInfo(logger, 'warn', 'Auth error: Token missing', errorInfo);
            return createToolErrorResponse(errorInfo);
        }

        try {
            // 1. Fetch Content from KV
            // Use phishing namespace ID (same as in create-phishing-workflow.ts)
            const kvService = new KVService(KV_NAMESPACES.PHISHING);
            const phishingContent = await kvService.getPhishing(phishingId);

            if (!phishingContent || !phishingContent.base) {
                const errorInfo = errorService.notFound(`Phishing content not found for ID: ${phishingId}`, { phishingId });
                logErrorInfo(logger, 'warn', 'Phishing content not found', errorInfo);
                return createToolErrorResponse(errorInfo);
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
            const isQuishing = phishingData.isQuishing || false;

            logger.info('Quishing flag extracted from KV', { phishingId, isQuishing });

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
                isQuishing, // Add quishing flag for backend routing
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
                companyId: effectiveCompanyId,
                url: baseApiUrl, // Dynamic URL from header or environment
                phishingData: phishingPayload
            };

            // Secure Logging (Mask token)
            const maskedPayload = maskSensitiveField(payload, 'accessToken');
            logger.debug('Upload payload prepared (redacted)', {
                payload: summarizeForLog(maskedPayload),
                phishingData: summarizeForLog((maskedPayload as any)?.phishingData),
                emailTemplate: summarizeForLog((maskedPayload as any)?.phishingData?.email?.template),
                landingPage: summarizeForLog((maskedPayload as any)?.phishingData?.landingPage),
            });

            // Wrap API call with retry (exponential backoff: 1s, 2s, 4s)
            const result = await withRetry<UploadPhishingWorkerResult>(
                () => callWorkerAPI({
                    env,
                    serviceBinding: env?.PHISHING_CRUD_WORKER,
                    publicUrl: API_ENDPOINTS.PHISHING_WORKER_URL,
                    endpoint: 'https://worker/submit',
                    payload,
                    token,
                    errorPrefix: 'Worker failed',
                    operationName: `Upload phishing content ${phishingId}`
                }) as Promise<UploadPhishingWorkerResult>,
                `Upload phishing content ${phishingId}`
            );

            logger.info('Phishing upload successful', {
                result
            });

            // Backend returns: { templateResourceId, templateId, landingPageResourceId, landingPageId, scenarioResourceId, scenarioId, message }
            // Map to our expected format
            const templateResourceId = result.templateResourceId || result.resourceId; // Fallback for backward compatibility
            const scenarioResourceId = result.scenarioResourceId || null;

            // CRITICAL: Use scenarioResourceId for assignment if available, otherwise fallback to templateResourceId
            // Backend API expects scenarioResourceId for assignment (based on "Phishing scenario not found" error)
            const resourceIdForAssignment = scenarioResourceId || templateResourceId;

            const formattedMessage = formatToolSummary({
                prefix: result.message ? `✅ ${result.message}` : `✅ ${isQuishing ? 'Quishing' : 'Phishing'} uploaded`,
                title: result.message ? undefined : name,
                suffix: 'Ready to assign',
                kv: [
                    { key: 'scenarioName', value: name },
                    { key: 'resourceId', value: resourceIdForAssignment },
                    { key: 'scenarioResourceId', value: scenarioResourceId || undefined },
                    { key: 'landingPageResourceId', value: result.landingPageResourceId || undefined },
                    { key: 'phishingId', value: phishingId },
                ],
            });

            // EMIT UI SIGNAL (SURGICAL)
            if (writer) {
                try {
                    const messageId = uuidv4();
                    const meta = { phishingId, resourceId: resourceIdForAssignment || templateResourceId, title: name };
                    const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');

                    await writer.write({ type: 'text-start', id: messageId });
                    await writer.write({
                        type: 'text-delta',
                        id: messageId,
                        delta: `::ui:phishing_uploaded::${encoded}::/ui:phishing_uploaded::\n`
                    });
                    await writer.write({ type: 'text-end', id: messageId });
                } catch (emitErr) {
                    logger.warn('Failed to emit UI signal for phishing upload', { error: normalizeError(emitErr).message });
                }
            }

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
                    title: name,
                    scenarioName: name,
                    isQuishing: isQuishing, // Pass isQuishing flag for assign tool
                },
                // Always return our high-signal summary to user (backend messages can be generic).
                message: formattedMessage,
            };

            // Validate result against output schema
            const validation = validateToolResult(toolResult, uploadPhishingOutputSchema, 'upload-phishing');
            if (!validation.success) {
                logErrorInfo(logger, 'error', 'Upload phishing result validation failed', validation.error);
                return createToolErrorResponse(validation.error);
            }

            return validation.data;

        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                phishingId,
                stack: err.stack,
            });

            logErrorInfo(logger, 'error', 'Upload tool failed', errorInfo);

            return createToolErrorResponse(errorInfo);
        }
    },
});


