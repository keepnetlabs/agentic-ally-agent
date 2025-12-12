import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../utils/core/request-storage';
import { ERROR_MESSAGES } from '../constants';

const ASSIGN_API_URL = 'https://crud-phishing-worker.keepnet-labs-ltd-business-profile4086.workers.dev/send'; // TODO: Update with actual phishing assign endpoint
const API_URL = 'https://test-api.devkeepnet.com';

export const assignPhishingTool = createTool({
    id: 'assign-phishing',
    description: 'Assigns an uploaded phishing simulation to a specific user.',
    inputSchema: z.object({
        resourceId: z.string().describe('The Resource ID returned from the upload process'),
        languageId: z.string().optional().describe('The Language ID returned from the upload process'),
        targetUserResourceId: z.string().describe('The User ID to assign the phishing simulation to')
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
    }),
    execute: async ({ context }) => {
        const { resourceId, languageId, targetUserResourceId } = context;
        const name = `Phishing Campaign - ${targetUserResourceId} Agentic Ally`;

        console.log(`🔗 Preparing phishing assignment for Resource: ${resourceId}${languageId ? ` (LangID: ${languageId})` : ''} to User: ${targetUserResourceId}`);

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
            name
        };

        // Log Payload (Token is in header, so payload is safe to log)
        console.log('📦 Assign Phishing Payload:', JSON.stringify({
            ...payload,
            accessToken: '***MASKED***',
        }, null, 2));

        try {
            // Service Binding kullan (production) veya fallback to public URL (local dev)
            let response: Response;

            if (env?.PHISHING_CRUD_WORKER) {
                // ✅ SERVICE BINDING (Production - Internal Routing)
                console.log('🔗 Using Service Binding: PHISHING_CRUD_WORKER');
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
                console.log('🌐 Using Public URL (Fallback):', ASSIGN_API_URL);
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
            console.log('✅ Phishing Assignment Success:', JSON.stringify(result, null, 2));

            return {
                success: true,
                message: 'Phishing simulation assigned successfully.'
            };

        } catch (error) {
            console.error('❌ Assign phishing tool failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : ERROR_MESSAGES.PLATFORM.UNKNOWN_ASSIGN_ERROR
            };
        }
    },
});

