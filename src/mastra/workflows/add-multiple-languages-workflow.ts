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

/** Shape of add-language workflow run result (success or error). */
interface AddLanguageRunResult {
  status?: string;
  result?: { data?: { trainingUrl?: string; title?: string }; title?: string; trainingUrl?: string };
  data?: { trainingUrl?: string; title?: string };
  error?: { message?: string };
  message?: string;
}

function extractFromAddLanguageResult(result: AddLanguageRunResult | null | undefined): {
  trainingUrl?: string;
  title?: string;
  error?: string;
} {
  if (!result) return {};
  const r = result as AddLanguageRunResult;
  const trainingUrl =
    r?.result?.data?.trainingUrl ?? r?.result?.trainingUrl ?? r?.data?.trainingUrl ?? (r as Record<string, unknown>)?.trainingUrl;
  const title =
    r?.result?.data?.title ?? r?.result?.title ?? r?.data?.title ?? (r as Record<string, unknown>)?.title;
  const error =
    r?.error?.message ?? (r?.result as { message?: string })?.message ?? (r as Record<string, unknown>)?.message;
  return { trainingUrl: trainingUrl as string | undefined, title: title as string | undefined, error: error as string | undefined };
}

// Step: Process Multiple Languages in Parallel
export const processMultipleLanguagesStep = createStep({
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
            const { trainingUrl, title } = extractFromAddLanguageResult(result);

            logger.info('Translation completed successfully', { language: targetLanguage, durationMs: duration });

            return {
              language: targetLanguage,
              success: true,
              trainingUrl,
              title,
              duration
            };
          } else {
            const { error: extractedError } = extractFromAddLanguageResult(result);
            const errorMsg = extractedError || 'Unknown error';
            const errorInfo = errorService.external(errorMsg, { step: 'add-language-translation', language: targetLanguage });
            logErrorInfo(logger, 'error', 'Translation failed', errorInfo);

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
          const errorInfo = errorService.external(err.message, {
            step: 'add-language-translation',
            stack: err.stack,
            language: targetLanguage
          });
          logErrorInfo(logger, 'error', 'Translation exception', errorInfo);

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
      const errorInfo = errorService.external(err.message, {
        step: 'process-multiple-languages',
        stack: err.stack
      });
      logErrorInfo(logger, 'error', 'Multi-language workflow error', errorInfo);
      const e = new Error(err.message);
      (e as Error & { code?: string }).code = errorInfo.code;
      throw e;
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
