import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../../utils/core/request-storage';
import { getLogger } from '../../utils/core/logger';
import { KVService } from '../../services/kv-service';
import { ERROR_MESSAGES } from '../../constants';

const WORKER_URL = 'https://crud-phishing-worker.keepnet-labs-ltd-business-profile4086.workers.dev/submit'; // TODO: Update with actual phishing worker URL
const API_URL = 'https://test-api.devkeepnet.com';

export const uploadPhishingTool = createTool({
    id: 'upload-phishing',
    description: 'Fetches the phishing content by ID, prepares it, and uploads it to the platform via the phishing worker.',
    inputSchema: z.object({
        phishingId: z.string().describe('The ID of the phishing content to upload'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        data: z.object({
            resourceId: z.string(),
            languageId: z.string().optional(),
            phishingId: z.string(),
            title: z.string().optional(),
        }).optional(),
        message: z.string().optional(),
        error: z.string().optional(),
    }),
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
            return { success: false, error: ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING };
        }

        try {
            // 1. Fetch Content from KV
            // Use phishing namespace ID (same as in create-phishing-workflow.ts)
            const kvService = new KVService('f6609d79aa2642a99584b05c64ecaa9f');
            const phishingContent = await kvService.getPhishing(phishingId);

            if (!phishingContent || !phishingContent.base) {
                throw new Error(`Phishing content not found for ID: ${phishingId}`);
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
                url: API_URL,
                phishingData: phishingPayload
            };

            // Secure Logging (Mask token)
            logger.debug('Upload payload prepared', { hasPhishingData: !!phishingPayload });

            // Service Binding kullan (production) veya fallback to public URL (local dev)
            let response: Response;

            if (env?.PHISHING_CRUD_WORKER) {
                // ✅ SERVICE BINDING (Production - Internal Routing)
                logger.debug('Using Service Binding: PHISHING_CRUD_WORKER');
                response = await env.PHISHING_CRUD_WORKER.fetch('https://worker/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // ⚠️ FALLBACK: Public URL (Local Development)
                logger.debug('Using Public URL fallback for phishing upload', { url: WORKER_URL });
                response = await fetch(WORKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Worker failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            logger.info('Phishing upload successful', { resourceId: result.resourceId, phishingId });

            return {
                success: true,
                data: {
                    resourceId: result.resourceId,
                    languageId: result.languageId,
                    phishingId: phishingId,
                    title: name
                },
                message: `Phishing simulation uploaded successfully. Resource ID ${result.resourceId} is ready for assignment.`
            };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Upload tool failed', { error: err.message, stack: err.stack });
            return {
                success: false,
                error: error instanceof Error ? error.message : ERROR_MESSAGES.PLATFORM.UNKNOWN_UPLOAD_ERROR
            };
        }
    },
});


