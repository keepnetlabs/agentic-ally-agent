import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../utils/request-storage';
import { KVService } from '../services/kv-service';
import { ERROR_MESSAGES } from '../constants';

const WORKER_URL = 'https://crud-training-worker.keepnet-labs-ltd-business-profile4086.workers.dev/submit';
const API_URL = 'https://test-api.devkeepnet.com';
const BASE_URL = 'https://test.devkeepnet.com';

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
        const { microlearningId } = context;

        console.log(`📤 Preparing upload for ID: "${microlearningId}"...`);

        // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
        const store = requestStorage.getStore();
        const token = store?.token;
        const env = store?.env; // Cloudflare env (bindings: KV, D1, Service Bindings)

        if (!token) {
            return { success: false, error: ERROR_MESSAGES.PLATFORM.UPLOAD_TOKEN_MISSING };
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
                url: API_URL,
                baseUrl: BASE_URL,
                trainingData: trainingData
            };

            // Secure Logging (Mask token)
            console.log('📦 Upload Payload:', JSON.stringify({
                ...payload,
                accessToken: '***MASKED***',
                trainingData
            }, null, 2));

            // Service Binding kullan (production) veya fallback to public URL (local dev)
            let response: Response;

            if (env?.CRUD_WORKER) {
                // ✅ SERVICE BINDING (Production - Internal Routing)
                console.log('🔗 Using Service Binding: CRUD_WORKER');
                response = await env.CRUD_WORKER.fetch('https://worker/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // ⚠️ FALLBACK: Public URL (Local Development)
                console.log('🌐 Using Public URL (Fallback):', WORKER_URL);
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
            console.log('✅ Upload Success. Result:', JSON.stringify(result, null, 2));

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
            console.error('❌ Upload tool failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : ERROR_MESSAGES.PLATFORM.UNKNOWN_UPLOAD_ERROR
            };
        }
    },
});
