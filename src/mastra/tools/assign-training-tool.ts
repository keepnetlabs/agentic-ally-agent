import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { requestStorage } from '../utils/request-storage';

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

    // Get Auth Token
    const store = requestStorage.getStore();
    const token = store?.token;

    if (!token) {
      return { success: false, error: 'Authentication token missing. Cannot assign training.' };
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
      const response = await fetch(ASSIGN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

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
        error: error instanceof Error ? error.message : 'Unknown assignment error'
      };
    }
  },
});
