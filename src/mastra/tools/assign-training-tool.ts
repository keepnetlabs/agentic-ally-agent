import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../utils/request-storage';
import { ERROR_MESSAGES } from '../constants';

const ASSIGN_API_URL = 'https://crud-training-worker.keepnet-labs-ltd-business-profile4086.workers.dev/send'; // Check this endpoint
const API_URL = 'https://test-api.devkeepnet.com';
export const assignTrainingTool = createTool({
  id: 'assign-training',
  description: 'Assigns an uploaded training resource to a specific user.',
  inputSchema: z.object({
    resourceId: z.string().describe('The Resource ID returned from the upload process'),
    sendTrainingLanguageId: z.string().describe('The Language ID returned from the upload process'),
    targetUserResourceId: z.string().describe('The User ID to assign the training to'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { resourceId, sendTrainingLanguageId, targetUserResourceId } = context;

    console.log(`🔗 Preparing assignment for Resource: ${resourceId} (LangID: ${sendTrainingLanguageId}) to User: ${targetUserResourceId}`);

    // Get Auth Token & Cloudflare bindings from AsyncLocalStorage
    const store = requestStorage.getStore();
    const token = store?.token;
    const env = store?.env; // Cloudflare env (bindings: KV, D1, Service Bindings)

    if (!token) {
      return { success: false, error: ERROR_MESSAGES.PLATFORM.ASSIGN_TOKEN_MISSING };
    }

    const payload = {
      apiUrl: API_URL,
      accessToken: token,
      trainingId: resourceId,
      languageId: sendTrainingLanguageId, // Map languageId to resourceId param if API expects it
      targetUserResourceId: targetUserResourceId,
    };

    // Log Payload (Token is in header, so payload is safe to log)
    console.log('📦 Assign Payload:', JSON.stringify(payload, null, 2));

    try {
      // Service Binding kullan (production) veya fallback to public URL (local dev)
      let response: Response;

      if (env?.CRUD_WORKER) {
        // ✅ SERVICE BINDING (Production - Internal Routing)
        console.log('🔗 Using Service Binding: CRUD_WORKER');
        response = await env.CRUD_WORKER.fetch('https://worker/send', {
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
      console.log('✅ Assignment Success:', JSON.stringify(result, null, 2));

      return {
        success: true,
        message: 'Training assigned successfully.'
      };

    } catch (error) {
      console.error('❌ Assign tool failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.PLATFORM.UNKNOWN_ASSIGN_ERROR
      };
    }
  },
});
