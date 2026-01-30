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

import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { RequestContext } from '@mastra/core/request-context';
import { createMicrolearningWorkflow } from '../../workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from '../../workflows/add-language-workflow';
import { addMultipleLanguagesWorkflow } from '../../workflows/add-multiple-languages-workflow';
import { updateMicrolearningWorkflow } from '../../workflows/update-microlearning-workflow';
import { getLogger } from '../../utils/core/logger';
import { workflowExecutorSchema, workflowExecutorOutputSchema } from './workflow-executor-schemas';
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

export const workflowExecutorTool = createTool({
  id: 'workflow-executor',
  description: 'Execute microlearning workflows with streaming progress updates',
  inputSchema: workflowExecutorSchema,
  outputSchema: workflowExecutorOutputSchema,

  // v1: (inputData, context) signature
  execute: async (inputData, ctx?: ToolExecutionContext) => {
    const { workflowType, ...params } = inputData;
    const writer = ctx?.writer;
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
        logger.info('Policy summary ready', { hasContent: !!policyContext, length: policyContext?.length || 0 });

        // Start workflow with writer in requestContext (bypasses Zod validation)
        const workflow = createMicrolearningWorkflow;
        const run = await workflow.createRun();

        // Create requestContext with writer (Zod won't touch this)
        const requestContext = new RequestContext();
        if (writer) {
          requestContext.set('writer', writer);
        }

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
            policyContext: policyContext || undefined // Pass if available
          },
          requestContext
        });

        // Extract info from result - simple fallback approach
        let trainingUrl = 'URL not available';
        let title = params.prompt?.slice(0, 50) || 'microlearning';
        let department = 'specified department';
        let microlearningId = 'ID not available';

        logger.debug('Workflow result received', { status: workflowResult.status });

        // Check workflow status first - if failed, return error immediately
        if (workflowResult.status === 'failed') {
          const workflowError = workflowResult.error;
          const errorMessage = typeof workflowError === 'string'
            ? workflowError
            : (workflowError?.message || 'Workflow execution failed');
          const errorInfo = errorService.external(`Microlearning creation failed: ${errorMessage}`, {
            step: 'workflow-executor',
            workflowStatus: workflowResult.status
          });
          logErrorInfo(logger, 'error', 'Workflow execution failed', errorInfo);
          return createToolErrorResponse(errorInfo);
        }

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
          // Workflow completed but result validation failed
          const errorInfo = errorService.external('Workflow completed but result validation failed', {
            step: 'workflow-executor',
            workflowStatus: workflowResult.status
          });
          logErrorInfo(logger, 'error', 'Workflow result validation failed', errorInfo);
          return createToolErrorResponse(errorInfo);
        }

        // Emit UI signal for FE to open canvas (same pattern as phishing)
        if (writer) {
          const meta = {
            microlearningId,
            trainingUrl,
            title,
            department,
          };
          const encodedMeta = Buffer.from(JSON.stringify(meta)).toString('base64');

          await writer.write({
            type: 'data-ui-signal',
            data: {
              signal: 'canvas_open',
              message: `::ui:canvas_open::${trainingUrl}::/ui:canvas_open::\n`
            }
          });

          await writer.write({
            type: 'data-ui-signal',
            data: {
              signal: 'training_meta',
              message: `::ui:training_meta::${encodedMeta}::/ui:training_meta::\n`
            }
          });

          logger.debug('Training URL sent to frontend', { urlLength: trainingUrl?.length });
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
        const run = await workflow.createRun();

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
        if (trainingUrl && writer) {
          await writer.write({
            type: 'data-ui-signal',
            data: {
              signal: 'canvas_open',
              message: `::ui:canvas_open::${trainingUrl}::/ui:canvas_open::\n`
            }
          });
          logger.debug('Training URL sent to frontend', { urlLength: trainingUrl?.length });
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
        const run = await workflow.createRun();

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
          if (firstSuccess && writer) {
            await writer.write({
              type: 'data-ui-signal',
              data: {
                signal: 'canvas_open',
                message: `::ui:canvas_open::${firstSuccess.trainingUrl}::/ui:canvas_open::\n`
              }
            });
            logger.debug('Training URL sent to frontend', { urlLength: firstSuccess.trainingUrl?.length });
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
        const run = await workflow.createRun();

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
        if (trainingUrl && writer) {
          await writer.write({
            type: 'data-ui-signal',
            data: {
              signal: 'canvas_open',
              message: `::ui:canvas_open::${trainingUrl}::/ui:canvas_open::\n`
            }
          });
          logger.debug('Updated training URL sent to frontend', { microlearningId: params.existingMicrolearningId });
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
        workflowType: inputData?.workflowType,
        step: 'workflow-execution',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'Workflow execution failed', errorInfo);

      // Send error message to frontend
      if (writer) {
        await writer.write({
          type: 'data-ui-signal',
          data: {
            signal: 'workflow_error',
            message: `::ui:workflow_error::${err.message}::/ui:workflow_error::\n`
          }
        });
      }

      return createToolErrorResponse(errorInfo);
    }
  }
});