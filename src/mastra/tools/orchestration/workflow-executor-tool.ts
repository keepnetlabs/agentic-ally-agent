import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createMicrolearningWorkflow } from '../../workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from '../../workflows/add-language-workflow';
import { addMultipleLanguagesWorkflow } from '../../workflows/add-multiple-languages-workflow';
import { updateMicrolearningWorkflow } from '../../workflows/update-microlearning-workflow';
import { v4 as uuidv4 } from 'uuid';
import { PROMPT_ANALYSIS, MODEL_PROVIDERS, ERROR_MESSAGES } from '../../constants';

/**
 * Type definitions for workflow results
 */
interface WorkflowMetadata {
  trainingUrl?: string;
  title?: string;
  department?: string;
  microlearningId?: string;
  filesGenerated?: string[];
  [key: string]: unknown;
}

interface CreateMicrolearningResult {
  status: 'success' | 'error' | 'failed' | 'suspended';
  result?: {
    metadata?: WorkflowMetadata;
    [key: string]: unknown;
  };
  error?: Error | string;
  [key: string]: unknown;
}

interface AddLanguageResult {
  status: 'success' | 'error' | 'failed' | 'suspended';
  result?: {
    data?: {
      trainingUrl?: string;
      title?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  error?: Error | string;
  [key: string]: unknown;
}

interface LanguageResultItem {
  success?: boolean;
  trainingUrl?: string;
  language?: string;
  [key: string]: unknown;
}

interface AddMultipleLanguagesResult {
  status: 'success' | 'error' | 'failed' | 'suspended';
  result?: {
    results?: LanguageResultItem[];
    successCount?: number;
    failureCount?: number;
    languages?: string[];
    status?: string;
    [key: string]: unknown;
  };
  error?: Error | string;
  [key: string]: unknown;
}

interface UpdateMicrolearningResult {
  status: 'success' | 'error' | 'failed' | 'suspended';
  result?: {
    success: boolean;
    status: string;
    metadata?: {
      microlearningId: string;
      version: number;
      changes?: Record<string, unknown>;
      trainingUrl?: string;
      timestamp: string;
    };
    error?: string;
  };
  [key: string]: unknown;
}

// Workflow executor schema
const workflowExecutorSchema = z.object({
  workflowType: z.enum(['create-microlearning', 'add-language', 'add-multiple-languages', 'update-microlearning']).describe('Which workflow to execute'),

  // Create microlearning parameters
  prompt: z
    .string()
    .min(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH, `Prompt must be at least ${PROMPT_ANALYSIS.MIN_PROMPT_LENGTH} characters`)
    .max(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH, `Prompt must not exceed ${PROMPT_ANALYSIS.MAX_PROMPT_LENGTH} characters`)
    .optional()
    .describe('User prompt for microlearning creation'),
  additionalContext: z
    .string()
    .max(PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH, `Additional context must not exceed ${PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH} characters`)
    .optional()
    .describe('Additional context for the microlearning'),
  customRequirements: z
    .string()
    .max(PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH, `Custom requirements must not exceed ${PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH} characters`)
    .optional()
    .describe('Custom requirements or special requests'),
  department: z
    .string()
    .max(PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH, `Department name must not exceed ${PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH} characters`)
    .optional()
    .describe('Target department'),
  level: z
    .enum(PROMPT_ANALYSIS.DIFFICULTY_LEVELS)
    .optional()
    .default('Intermediate')
    .describe('Content difficulty level'),
  priority: z
    .enum(PROMPT_ANALYSIS.PRIORITY_LEVELS)
    .optional()
    .default('medium'),

  // Add language parameters
  existingMicrolearningId: z
    .string()
    .min(1, 'Microlearning ID cannot be empty')
    .max(256, 'Microlearning ID must not exceed 256 characters')
    .optional()
    .describe('ID of existing microlearning to translate'),
  targetLanguage: z
    .string()
    .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
    .optional()
    .nullable()
    .describe('Target language for translation (single language)'),
  targetLanguages: z
    .array(
      z
        .string()
        .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
    )
    .max(12, 'Maximum 12 languages allowed at once')
    .optional()
    .describe('Target languages for parallel translation (multiple languages)'),
  sourceLanguage: z
    .string()
    .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
    .optional()
    .nullable()
    .describe('Source language (optional)'),

  // Update microlearning parameters
  updates: z
    .object({
      theme: z.record(z.any()).describe('Theme updates (fontFamily, colors, logo)'),
    })
    .optional()
    .describe('Updates for update-microlearning workflow'),

  // Model override parameters (optional)
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider override'),
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

        // Start workflow with writer parameter
        const workflow = createMicrolearningWorkflow;
        const run = await workflow.createRunAsync();

        // Start workflow - let it fail if it fails
        const workflowResult: CreateMicrolearningResult = await run.start({
          inputData: {
            prompt: params.prompt!,
            additionalContext: params.additionalContext,
            customRequirements: params.customRequirements,
            department: params.department || 'All',
            level: params.level || 'Intermediate',
            priority: params.priority || 'medium',
            modelProvider: params.modelProvider,
            model: params.model,
            writer: writer
          }
        });

        // Extract info from result - simple fallback approach
        let trainingUrl = 'URL not available';
        let title = params.prompt?.slice(0, 50) || 'microlearning';
        let department = 'specified department';
        let microlearningId = 'ID not available';

        console.log('🔍 Workflow result:', workflowResult);

        // Try to extract data from workflow result
        if (
          workflowResult.status === 'success' &&
          workflowResult.result?.metadata
        ) {
          try {
            const metadata = workflowResult.result.metadata;
            trainingUrl = metadata.trainingUrl || trainingUrl;
            title = metadata.title || title;
            department = metadata.department || department;
            microlearningId = metadata.microlearningId || microlearningId;
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
        } catch (error) {
          console.error('⚠️ Failed to send training URL to frontend:', {
            error: error instanceof Error ? error.message : String(error),
            trainingUrl: trainingUrl?.substring(0, 100),
            timestamp: new Date().toISOString(),
          });
          // NOTE: Continue - don't block response, but log for monitoring
        }

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

        const result: AddLanguageResult = await run.start({
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
        const trainingUrl =
          result?.status === 'success' && result.result?.data
            ? result.result.data.trainingUrl
            : null;
        const title =
          result?.status === 'success' && result.result?.data
            ? result.result.data.title
            : null;
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

        const result: AddMultipleLanguagesResult = await run.start({
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
          const workflowResults: LanguageResultItem[] = result.result.results || [];

          // Send first successful URL to frontend for UI refresh
          const firstSuccess = workflowResults.find(
            (r) => r.success && r.trainingUrl
          );
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
            successCount: result.result.successCount,
            failureCount: result.result.failureCount,
            languages: result.result.languages,
            results: result.result.results,
            status: result.result.status
          };
        } else {
          throw new Error('Add multiple languages workflow failed');
        }

      } else if (workflowType === 'update-microlearning') {
        if (!params.existingMicrolearningId || !params.updates) {
          throw new Error('existingMicrolearningId and updates are required for update-microlearning workflow');
        }

        const workflow = updateMicrolearningWorkflow;
        const run = await workflow.createRunAsync();

        const result: UpdateMicrolearningResult = await run.start({
          inputData: {
            microlearningId: params.existingMicrolearningId,
            department: params.department || 'All',
            updates: params.updates,
            modelProvider: params.modelProvider,
            model: params.model,
          }
        });

        console.log('🔍 Update workflow result:', result);

        // Send updated training URL to frontend via UI signal
        const trainingUrl = result?.result?.metadata?.trainingUrl;
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
            console.log('Updated training URL sent to frontend:', trainingUrl);
          } catch (error) {
            console.error('⚠️ Failed to send updated training URL to frontend:', error);
            // Continue - don't block response
          }
        }

        return {
          success: result?.result?.success ?? false,
          status: result?.result?.status ?? 'Update completed',
          microlearningId: params.existingMicrolearningId,
        };

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
          delta: `❌ Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`
        });
        await writer?.write({ type: 'text-end', id: messageId });
      } catch (writeError) {
        console.error('Failed to send error message:', writeError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.WORKFLOW.UNKNOWN_ERROR
      };
    }
  }
});