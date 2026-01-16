import { createStep, createWorkflow } from '@mastra/core/workflows';

import { addLanguageWorkflow } from './add-language-workflow';
import { KVService } from '../services/kv-service';

import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';

import {
  addMultipleLanguagesInputSchema,
  finalMultiLanguageResultSchema
} from '../schemas/add-language-schemas';

// Step: Process Multiple Languages in Parallel
const processMultipleLanguagesStep = createStep({
  id: 'process-multiple-languages',
  description: 'Process multiple languages in parallel using add-language-workflow',
  inputSchema: addMultipleLanguagesInputSchema,
  outputSchema: finalMultiLanguageResultSchema,
  execute: async ({ inputData }) => {
    const logger = getLogger('ProcessMultipleLanguages');
    const { existingMicrolearningId, targetLanguages, sourceLanguage, department, modelProvider, model } = inputData;

    logger.info('Starting parallel language processing', {
      languageCount: targetLanguages.length,
      languages: targetLanguages.join(', ')
    });

    try {
      // Validation
      if (!existingMicrolearningId) {
        const errorInfo = errorService.validation('existingMicrolearningId is required', { step: 'validate-input' });
        logErrorInfo(logger, 'error', 'Input validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
        const errorInfo = errorService.validation('targetLanguages must be a non-empty array', { step: 'validate-input' });
        logErrorInfo(logger, 'error', 'Input validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      if (targetLanguages.length > 12) {
        const errorInfo = errorService.validation(`Too many languages requested (${targetLanguages.length}). Maximum supported: 12 languages.`, {
          requestedCount: targetLanguages.length,
          step: 'validate-input'
        });
        logErrorInfo(logger, 'error', 'Input validation failed', errorInfo);
        throw new Error(errorInfo.message);
      }

      const normalizedLanguages = targetLanguages.map((lang) => lang.toLowerCase());
      logger.info('Validation passed. Processing languages', { languages: normalizedLanguages.join(', ') });

      const startTime = Date.now();
      logger.info('Starting parallel execution', { timestamp: new Date().toISOString() });

      // Launch all language workflows in parallel
      const workflowPromises = normalizedLanguages.map(async (targetLanguage) => {
        const langStartTime = Date.now();
        try {
          logger.info('Starting translation workflow', { language: targetLanguage });

          const workflow = addLanguageWorkflow;
          const run = await workflow.createRunAsync();

          const result = await run.start({
            inputData: {
              existingMicrolearningId,
              department: department || 'All',
              targetLanguage,
              sourceLanguage: sourceLanguage || undefined,
              modelProvider,
              model
            }
          });

          const duration = Date.now() - langStartTime;

          if (result?.status === 'success') {
            const trainingUrl = (result as any)?.result?.data?.trainingUrl ||
              (result as any)?.data?.trainingUrl ||
              (result as any)?.trainingUrl;
            const title = (result as any)?.result?.data?.title ||
              (result as any)?.data?.title ||
              (result as any)?.title;

            logger.info('Translation completed successfully', { language: targetLanguage, durationMs: duration });

            return {
              language: targetLanguage,
              success: true,
              trainingUrl,
              title,
              duration
            };
          } else {
            const errorMsg = (result as any)?.error?.message ||
              (result as any)?.result?.message ||
              (result as any)?.message ||
              'Unknown error';
            logger.error('Translation failed', { error: errorMsg, language: targetLanguage });

            return {
              language: targetLanguage,
              success: false,
              error: errorMsg,
              duration
            };
          }
        } catch (error) {
          const duration = Date.now() - langStartTime;
          const err = normalizeError(error);
          logger.error('Translation exception', { error: err.message, stack: err.stack, language: targetLanguage });

          return {
            language: targetLanguage,
            success: false,
            error: err.message,
            duration
          };
        }
      });

      // Wait for all workflows to complete
      const results = await Promise.allSettled(workflowPromises);
      const totalDuration = Date.now() - startTime;

      logger.info('Total execution time', {
        durationMs: totalDuration,
        durationSec: (totalDuration / 1000).toFixed(2)
      });

      // Process results
      const languageResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const err = normalizeError(result.reason);
          return {
            language: normalizedLanguages[index],
            success: false,
            error: err.message
          };
        }
      });

      const successCount = languageResults.filter((r) => r.success).length;
      const failureCount = languageResults.filter((r) => !r.success).length;

      logger.info('Translation results', {
        successCount,
        totalCount: targetLanguages.length,
        durationSec: (totalDuration / 1000).toFixed(2)
      });

      // Update language_availability ONCE after all parallel workflows (prevents race condition)
      if (successCount > 0) {
        const successLanguages = languageResults
          .filter((r) => r.success)
          .map((r) => r.language);

        const kvService = new KVService();
        await kvService.updateLanguageAvailabilityAtomic(existingMicrolearningId, successLanguages);
      }

      const status = successCount > 0 ? (failureCount === 0 ? 'success' : 'partial') : 'failed';

      return {
        success: failureCount === 0,
        successCount,
        failureCount,
        totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
        languages: normalizedLanguages,
        results: languageResults,
        status: status as 'success' | 'partial' | 'failed'
      };
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Multi-language workflow error', { error: err.message, stack: err.stack });
      throw error;
    }
  }
});

// Add Multiple Languages Workflow
const addMultipleLanguagesWorkflow = createWorkflow({
  id: 'add-multiple-languages-workflow',
  description: 'Add multiple languages to existing microlearning in parallel',
  inputSchema: addMultipleLanguagesInputSchema,
  outputSchema: finalMultiLanguageResultSchema,
})
  .then(processMultipleLanguagesStep);

// Commit workflow
addMultipleLanguagesWorkflow.commit();

export { addMultipleLanguagesWorkflow };
