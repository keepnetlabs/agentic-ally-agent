import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createMicrolearningWorkflow } from '../workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from '../workflows/add-language-workflow';
import { addMultipleLanguagesWorkflow } from '../workflows/add-multiple-languages-workflow';
import { v4 as uuidv4 } from 'uuid';

// Tool için schema
const workflowExecutorSchema = z.object({
  workflowType: z.enum(['create-microlearning', 'add-language', 'add-multiple-languages']).describe('Which workflow to execute'),

  // Create microlearning parameters
  prompt: z.string().optional().describe('User prompt for microlearning creation'),
  additionalContext: z.string().optional().describe('Additional context for the microlearning'),
  customRequirements: z.string().optional().describe('Custom requirements or special requests'),
  department: z.string().optional().describe('Target department'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional().default('Intermediate').describe('Content difficulty level'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),

  // Add language parameters
  existingMicrolearningId: z.string().optional().describe('ID of existing microlearning to translate'),
  targetLanguage: z.string().optional().nullable().describe('Target language for translation (single language)'),
  targetLanguages: z.array(z.string()).optional().describe('Target languages for parallel translation (multiple languages)'),
  sourceLanguage: z.string().optional().nullable().describe('Source language (optional)'),

  // Model override parameters (optional)
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional().describe('Model provider override'),
  model: z.string().optional().describe('Model name override (e.g., OPENAI_GPT_4O_MINI)'),
});

export const workflowExecutorTool = createTool({
  id: 'workflow-executor',
  description: 'Execute microlearning workflows with streaming progress updates',
  inputSchema: workflowExecutorSchema,

  execute: async ({ context, writer }) => {
    const { workflowType, ...params } = context;

    try {
      if (workflowType === 'create-microlearning') {
        if (!params.prompt) {
          throw new Error('Prompt is required for create-microlearning workflow');
        }
        // Workflow'u başlat
        const workflow = createMicrolearningWorkflow;
        const run = await workflow.createRunAsync();

        // Workflow'u başlat - let it fail if it fails
        const workflowResult = await run.start({
          inputData: {
            prompt: params.prompt!,
            additionalContext: params.additionalContext,
            customRequirements: params.customRequirements,
            department: params.department || 'All',
            level: params.level || 'Intermediate',
            priority: params.priority || 'medium',
            modelProvider: params.modelProvider,
            model: params.model
          }
        });

        // Extract info from result - simple fallback approach
        let trainingUrl = 'URL not available';
        let title = params.prompt?.slice(0, 50) || 'microlearning';
        let department = 'specified department';
        let microlearningId = 'ID not available';

        console.log('🔍 Workflow result:', workflowResult);

        // Try to extract data from workflow result
        if (workflowResult.status === 'success' && workflowResult.result?.metadata) {
          try {
            trainingUrl = workflowResult.result.metadata.trainingUrl || trainingUrl;
            title = workflowResult.result.metadata.title || title;
            department = workflowResult.result.metadata.department || department;
            microlearningId = workflowResult.result.metadata.microlearningId || microlearningId;
          } catch (error) {
            console.warn('Could not extract workflow result data:', error);
          }
        }

        // Emit a custom UI signal for FE to open a canvas
        // Frontend can listen for lines starting with "::ui:canvas_open::" and use the raw URL payload
        try {
          const messageId = uuidv4();
          await writer?.write({ type: 'text-start', id: messageId });
          await writer?.write({
            type: 'text-delta',
            id: messageId,
            delta: `::ui:canvas_open::${trainingUrl}\n`
          });
          await writer?.write({ type: 'text-end', id: messageId });
          console.log('URL sent to frontend:', trainingUrl);
        } catch { }

        return {
          success: true,
          title,
          department,
          microlearningId,
          status: 'success'
        };

      } else if (workflowType === 'add-language') {
        if (!params.existingMicrolearningId || !params.targetLanguage) {
          throw new Error('existingMicrolearningId and targetLanguage are required for add-language workflow');
        }

        const workflow = addLanguageWorkflow;
        const run = await workflow.createRunAsync();

        const result = await run.start({
          inputData: {
            existingMicrolearningId: params.existingMicrolearningId!,
            department: params.department || 'All',
            targetLanguage: params.targetLanguage!,
            // sourceLanguage omitted: workflow will auto-detect from microlearning_metadata.language
            // This ensures correct language code (e.g., en-US not just en)
            sourceLanguage: params.sourceLanguage || undefined,  // Only pass if explicitly provided
            modelProvider: params.modelProvider,
            model: params.model
          }
        });

        // Extract trainingUrl from result and send to frontend
        const trainingUrl = result?.status === 'success' ? result.result?.data?.trainingUrl : null;
        const title = result?.status === 'success' ? result.result?.data?.title : null;
        console.log('🔍 Training URL for translated:', trainingUrl);
        if (trainingUrl) {
          try {
            const messageId = uuidv4();
            await writer?.write({ type: 'text-start', id: messageId });
            await writer?.write({
              type: 'text-delta',
              id: messageId,
              delta: `::ui:canvas_open::${trainingUrl}\n`
            });
            await writer?.write({ type: 'text-end', id: messageId });
            console.log('URL sent to frontend:', trainingUrl);
          } catch (error) {
            console.error('Failed to send URL to frontend:', error);
          }
        }

        return {
          success: true,
          department: params.department || 'All',
          title: title || 'Microlearning',
          status: 'success'
        };

      } else if (workflowType === 'add-multiple-languages') {
        if (!params.existingMicrolearningId || !params.targetLanguages || params.targetLanguages.length === 0) {
          throw new Error('existingMicrolearningId and targetLanguages array are required for add-multiple-languages workflow');
        }

        const workflow = addMultipleLanguagesWorkflow;
        const run = await workflow.createRunAsync();

        const result = await run.start({
          inputData: {
            existingMicrolearningId: params.existingMicrolearningId,
            targetLanguages: params.targetLanguages,
            sourceLanguage: params.sourceLanguage || undefined,
            department: params.department || 'All',
            modelProvider: params.modelProvider,
            model: params.model
          }
        });

        // Return workflow result
        if (result?.status === 'success' && result.result) {
          const workflowResults = (result.result as any).results || [];

          // Send first successful URL to frontend for UI refresh
          const firstSuccess = workflowResults.find((r: any) => r.success && r.trainingUrl);
          if (firstSuccess) {
            try {
              const messageId = uuidv4();
              await writer?.write({ type: 'text-start', id: messageId });
              await writer?.write({
                type: 'text-delta',
                id: messageId,
                delta: `::ui:canvas_open::${firstSuccess.trainingUrl}\n`
              });
              await writer?.write({ type: 'text-end', id: messageId });
              console.log('URL sent to frontend:', firstSuccess.trainingUrl);
            } catch (error) {
              console.error('Failed to send URL to frontend:', error);
            }
          }

          return {
            success: true,
            successCount: (result.result as any).successCount,
            failureCount: (result.result as any).failureCount,
            languages: (result.result as any).languages,
            results: (result.result as any).results,
            status: (result.result as any).status
          };
        } else {
          throw new Error('Add multiple languages workflow failed');
        }

      } else {
        throw new Error(`Unknown workflow type: ${workflowType}`);
      }

    } catch (error) {
      // Send error message to frontend
      try {
        const messageId = uuidv4();
        await writer?.write({ type: 'text-start', id: messageId });
        await writer?.write({
          type: 'text-delta',
          id: messageId,
          delta: `❌ Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`
        });
        await writer?.write({ type: 'text-end', id: messageId });
      } catch (writeError) {
        console.error('Failed to send error message:', writeError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});