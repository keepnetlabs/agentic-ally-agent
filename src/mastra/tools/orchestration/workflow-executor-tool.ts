/**
 * Workflow Executor Tool - Main Orchestrator
 *
 * Routes microlearning requests to appropriate workflow pipelines:
 *
 * CREATE-MICROLEARNING Workflow:
 * 1. Analyze user prompt (language detection, intent extraction)
 * 2. Generate 8-scene metadata structure
 * 3. [PARALLEL] Generate scene content (8 scenes in parallel)
 * 3. [PARALLEL] Generate inbox structure (phishing emails/SMS)
 * 4. Save to Cloudflare KV (fire-and-forget, non-blocking)
 * Output: Training URL for interactive module
 *
 * ADD-LANGUAGE Workflow:
 * 1. Load existing microlearning from KV
 * 2. Translate all scenes (multi-level retry + auto-correction)
 * 3. Update department inboxes for new language
 * 4. Save updated version to KV
 * Output: Updated training URL with new language
 *
 * Also supports:
 * - addMultipleLanguagesWorkflow: Translate to multiple languages in parallel
 * - updateMicrolearningWorkflow: Modify existing modules
 *
 * UI Integration:
 * - Sends `::ui:canvas_open::{trainingUrl}` signal for frontend handlers
 * - Returns structured responses with metadata
 *
 * See CLAUDE.md for detailed workflow documentation and patterns.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createMicrolearningWorkflow } from '../../workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from '../../workflows/add-language-workflow';
import { addMultipleLanguagesWorkflow } from '../../workflows/add-multiple-languages-workflow';
import { updateMicrolearningWorkflow } from '../../workflows/update-microlearning-workflow';
import { uuidv4 } from '../../utils/core/id-utils';
import { PROMPT_ANALYSIS, MODEL_PROVIDERS } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { getPolicySummary } from '../../utils/core/policy-cache';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';

const logger = getLogger('WorkflowExecutor');

/**
 * Type definitions for workflow results
 */
import {
  CreateMicrolearningResult,
  AddLanguageResult,
  AddMultipleLanguagesResult,
  UpdateMicrolearningResult,
  LanguageResultItem
} from './types';
import {
  validateCreateMicrolearningResult,
  validateAddLanguageResult
} from './validators';

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
  language: z
    .string()
    .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
    .optional()
    .describe('Language for new microlearning content (e.g., tr-tr, en-gb)'),

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

// Output schema for workflow executor tool
const workflowExecutorOutputSchema = z.object({
  success: z.boolean(),
  title: z.string().optional(),
  department: z.string().optional(),
  microlearningId: z.string().optional(),
  status: z.string().optional(),
  successCount: z.number().optional(),
  failureCount: z.number().optional(),
  languages: z.array(z.string()).optional(),
  results: z.array(z.any()).optional(),
  error: z.string().optional(),
});

export const workflowExecutorTool = createTool({
  id: 'workflow-executor',
  description: 'Execute microlearning workflows with streaming progress updates',
  inputSchema: workflowExecutorSchema,
  outputSchema: workflowExecutorOutputSchema,

  execute: async ({ context, writer }) => {
    const { workflowType, ...params } = context;

    try {
      if (workflowType === 'create-microlearning') {
        if (!params.prompt) {
          const errorInfo = errorService.validation('Prompt is required for create-microlearning workflow');
          logErrorInfo(logger, 'warn', 'Validation error', errorInfo);
          return createToolErrorResponse(errorInfo);
        }
        const prompt = params.prompt;

        // Get cached policy summary ONCE at workflow start
        logger.info('Getting policy summary for workflow');
        const policyContext = await getPolicySummary();
        logger.info('Policy summary ready', { hasContent: !!policyContext, length: policyContext.length });

        // Start workflow with writer parameter
        const workflow = createMicrolearningWorkflow;
        const run = await workflow.createRunAsync();

        // Start workflow - let it fail if it fails
        const workflowResult: CreateMicrolearningResult = await run.start({
          inputData: {
            prompt,
            additionalContext: params.additionalContext,
            customRequirements: params.customRequirements,
            department: params.department || 'All',
            level: params.level || 'Intermediate',
            priority: params.priority || 'medium',
            language: params.language,
            modelProvider: params.modelProvider,
            model: params.model,
            writer: writer,
            policyContext: policyContext || undefined // Pass if available
          }
        });

        // Extract info from result - simple fallback approach
        let trainingUrl = 'URL not available';
        let title = params.prompt?.slice(0, 50) || 'microlearning';
        let department = 'specified department';
        let microlearningId = 'ID not available';

        logger.debug('Workflow result received', { status: workflowResult.status });

        // Validate and extract data from workflow result
        if (validateCreateMicrolearningResult(workflowResult)) {
          try {
            const metadata = workflowResult.result?.metadata;
            if (metadata?.trainingUrl) trainingUrl = metadata.trainingUrl;
            if (metadata?.title) title = metadata.title;
            if (metadata?.department) department = metadata.department;
            if (metadata?.microlearningId) microlearningId = metadata.microlearningId;
          } catch (error) {
            const err = normalizeError(error);
            logger.error('Failed to extract validated workflow result data', { error: err.message });
          }
        } else {
          logger.error('Workflow result validation failed', { status: workflowResult.status });
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
          // Emit structured training metadata for routing/agent context (FE can ignore if unsupported)
          try {
            const meta = {
              microlearningId,
              trainingUrl,
              title,
              department,
            };
            const encoded = Buffer.from(JSON.stringify(meta)).toString('base64');
            await writer?.write({
              type: 'text-delta',
              id: messageId,
              delta: `::ui:training_meta::${encoded}::/ui:training_meta::\n`
            });
          } catch (metaErr) {
            const err = normalizeError(metaErr);
            logger.warn('Failed to send training meta to frontend', { error: err.message });
          }
          await writer?.write({ type: 'text-end', id: messageId });
          logger.debug('Training URL sent to frontend', { urlLength: trainingUrl?.length });
        } catch (error) {
          const err = normalizeError(error);
          logger.error('Failed to send training URL to frontend', {
            error: err.message,
            stack: err.stack,
            trainingUrl: trainingUrl?.substring(0, 100),
            timestamp: new Date().toISOString(),
          });
          // NOTE: Continue - don't block response, but log for monitoring
        }

        const result = {
          success: true,
          title,
          department,
          microlearningId,
          status: 'success'
        };

        // Validate result against output schema
        const validation = validateToolResult(result, workflowExecutorOutputSchema, 'workflow-executor');
        if (!validation.success) {
          logger.error('Workflow executor result validation failed', { code: validation.error.code, message: validation.error.message });
          return createToolErrorResponse(validation.error);
        }

        return validation.data;

      } else if (workflowType === 'add-language') {
        if (!params.existingMicrolearningId || !params.targetLanguage) {
          const errorInfo = errorService.validation('existingMicrolearningId and targetLanguage are required for add-language workflow');
          logErrorInfo(logger, 'warn', 'Validation error', errorInfo);
          return createToolErrorResponse(errorInfo);
        }
        const existingMicrolearningId = params.existingMicrolearningId;
        const targetLanguage = params.targetLanguage;

        const workflow = addLanguageWorkflow;
        const run = await workflow.createRunAsync();

        const workflowResult: AddLanguageResult = await run.start({
          inputData: {
            existingMicrolearningId,
            department: params.department || 'All',
            targetLanguage,
            // sourceLanguage omitted: workflow will auto-detect from microlearning_metadata.language
            // This ensures correct language code (e.g., en-US not just en)
            sourceLanguage: params.sourceLanguage || undefined,  // Only pass if explicitly provided
            modelProvider: params.modelProvider,
            model: params.model
          }
        });

        // Validate and extract trainingUrl from result
        const isValid = validateAddLanguageResult(workflowResult);
        const data = isValid ? workflowResult.result?.data : undefined;
        const trainingUrl = data?.trainingUrl ?? null;
        const title = data?.title ?? null;

        if (!isValid) {
          logger.error('Language workflow result validation failed', { status: workflowResult.status });
        }

        logger.debug('Language translation completed', { hasTrainingUrl: !!trainingUrl });
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
            logger.debug('Training URL sent to frontend', { urlLength: trainingUrl?.length });
          } catch (error) {
            const err = normalizeError(error);
            logger.error('Failed to send translated URL to frontend', { error: err.message, stack: err.stack });
          }
        }

        const toolResult = {
          success: true,
          department: params.department || 'All',
          title: title || 'Microlearning',
          status: 'success'
        };

        // Validate result against output schema
        const validation = validateToolResult(toolResult, workflowExecutorOutputSchema, 'workflow-executor');
        if (!validation.success) {
          logger.error('Add language result validation failed', { code: validation.error.code, message: validation.error.message });
          return createToolErrorResponse(validation.error);
        }

        return validation.data;

      } else if (workflowType === 'add-multiple-languages') {
        if (!params.existingMicrolearningId || !params.targetLanguages || params.targetLanguages.length === 0) {
          const errorInfo = errorService.validation('existingMicrolearningId and targetLanguages array are required for add-multiple-languages workflow');
          logErrorInfo(logger, 'warn', 'Validation error', errorInfo);
          return createToolErrorResponse(errorInfo);
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
              logger.debug('Training URL sent to frontend', { urlLength: firstSuccess.trainingUrl?.length });
            } catch (error) {
              const err = normalizeError(error);
              logger.error('Failed to send translated URL to frontend', { error: err.message, stack: err.stack });
            }
          }

          const resultData = {
            success: true,
            successCount: result.result.successCount,
            failureCount: result.result.failureCount,
            languages: result.result.languages,
            results: result.result.results,
            status: result.result.status
          };

          // Validate result against output schema
          const validation = validateToolResult(resultData, workflowExecutorOutputSchema, 'workflow-executor');
          if (!validation.success) {
            logger.error('Add multiple languages result validation failed', { code: validation.error.code, message: validation.error.message });
            return createToolErrorResponse(validation.error);
          }

          return validation.data;
        } else {
          const errorInfo = errorService.external('Add multiple languages workflow failed');
          logErrorInfo(logger, 'error', 'Workflow failed', errorInfo);
          return createToolErrorResponse(errorInfo);
        }

      } else if (workflowType === 'update-microlearning') {
        if (!params.existingMicrolearningId || !params.updates) {
          const errorInfo = errorService.validation('existingMicrolearningId and updates are required for update-microlearning workflow');
          logErrorInfo(logger, 'warn', 'Validation error', errorInfo);
          return createToolErrorResponse(errorInfo);
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

        logger.debug('Update workflow completed', { success: result?.result?.success });

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
            logger.debug('Updated training URL sent to frontend', { microlearningId: params.existingMicrolearningId });
          } catch (error) {
            const err = normalizeError(error);
            logger.error('Failed to send updated training URL to frontend', { error: err.message, stack: err.stack });
            // Continue - don't block response
          }
        }

        const resultData = {
          success: result?.result?.success ?? false,
          status: result?.result?.status ?? 'Update completed',
          microlearningId: params.existingMicrolearningId,
        };

        // Validate result against output schema
        const validation = validateToolResult(resultData, workflowExecutorOutputSchema, 'workflow-executor');
        if (!validation.success) {
          logger.error('Update microlearning result validation failed', { code: validation.error.code, message: validation.error.message });
          return createToolErrorResponse(validation.error);
        }

        return validation.data;

      } else {
        const errorInfo = errorService.validation(`Unknown workflow type: ${workflowType}`);
        logErrorInfo(logger, 'warn', 'Unknown workflow type', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        workflowType: context?.workflowType,
        step: 'workflow-execution',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'Workflow execution failed', errorInfo);

      // Send error message to frontend
      try {
        const messageId = uuidv4();
        await writer?.write({ type: 'text-start', id: messageId });
        await writer?.write({
          type: 'text-delta',
          id: messageId,
          delta: `❌ Workflow failed: ${err.message}\n`
        });
        await writer?.write({ type: 'text-end', id: messageId });
      } catch (writeError) {
        const writeErr = normalizeError(writeError);
        logger.error('Failed to send error message to frontend', { error: writeErr.message, stack: writeErr.stack });
      }

      return createToolErrorResponse(errorInfo);
    }
  }
});