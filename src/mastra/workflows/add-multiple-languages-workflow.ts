import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { addLanguageWorkflow } from './add-language-workflow';
import { KVService } from '../services/kv-service';
import { MODEL_PROVIDERS } from '../constants';
import { getLogger } from '../utils/core/logger';

// Input/Output Schemas
const addMultipleLanguagesInputSchema = z.object({
  existingMicrolearningId: z.string().describe('ID of existing microlearning'),
  targetLanguages: z.array(z.string()).min(1).describe('Array of target languages'),
  sourceLanguage: z.string().optional().describe('Source language code (optional)'),
  department: z.string().optional().default('All').describe('Target department'),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider override'),
  model: z.string().optional().describe('Model name override'),
});

const finalMultiLanguageResultSchema = z.object({
  success: z.boolean(),
  successCount: z.number(),
  failureCount: z.number(),
  totalDuration: z.string(),
  languages: z.array(z.string()),
  results: z.array(z.object({
    language: z.string(),
    success: z.boolean(),
    trainingUrl: z.string().optional(),
    title: z.string().optional(),
    error: z.string().optional(),
    duration: z.number().optional(),
  })),
  status: z.enum(['success', 'partial', 'failed']),
});

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
        throw new Error('existingMicrolearningId is required');
      }

      if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
        throw new Error('targetLanguages must be a non-empty array');
      }

      if (targetLanguages.length > 12) {
        throw new Error(`Too many languages requested (${targetLanguages.length}). Maximum supported: 12 languages.`);
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
          const err = error instanceof Error ? error : new Error(String(error));
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
          return {
            language: normalizedLanguages[index],
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error'
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
      const err = error instanceof Error ? error : new Error(String(error));
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
