import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { translateLanguageJsonTool } from '../tools/generation';
import { inboxTranslateJsonTool } from '../tools/inbox';
import { KVService } from '../services/kv-service';
import { normalizeDepartmentName } from '../utils/language/language-utils';
import { validateInboxStructure, correctInboxStructure } from '../utils/validation/json-validation-utils';
import { MODEL_PROVIDERS, TIMEOUT_VALUES, STRING_TRUNCATION, API_ENDPOINTS, LANGUAGE, CLOUDFLARE_KV } from '../constants';
import { getLogger } from '../utils/core/logger';
import { loadInboxWithFallback } from '../utils/kv-helpers';
import { waitForKVConsistency, buildExpectedKVKeys } from '../utils/kv-consistency';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { withRetry } from '../utils/core/resilience-utils';
import { LanguageCodeSchema } from '../utils/validation/language-validation';
import { MicrolearningContent } from '../types/microlearning';

const logger = getLogger('AddLanguageWorkflow');

// Input/Output Schemas
const addLanguageInputSchema = z.object({
  existingMicrolearningId: z.string().min(1, 'Microlearning ID is required').describe('ID of existing microlearning'),
  targetLanguage: LanguageCodeSchema.describe('Target language code in BCP-47 format (e.g., tr-TR, de-DE, fr-FR, ja-JP, ko-KR, zh-CN, fr-CA)'),
  sourceLanguage: LanguageCodeSchema.optional().describe('Source language code in BCP-47 format (e.g., en-US, tr-TR). If not provided, auto-detected from microlearning metadata'),
  department: z.string().optional().default(LANGUAGE.DEFAULT_DEPARTMENT),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider (OPENAI, WORKERS_AI, GOOGLE)'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
});

const existingContentSchema = z.object({
  success: z.boolean(),
  data: z.any(), // existing microlearning
  microlearningId: z.string(),
  analysis: z.any(), // minimal analysis for target language
  sourceLanguage: z.string(), // source language to translate from
  targetLanguage: z.string(), // target language for parallel steps
  department: z.string(), // department for parallel steps
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(), // model provider override
  model: z.string().optional(), // model override
  hasInbox: z.boolean(), // whether inbox is needed (false for code_review type)
});

const languageContentSchema = z.object({
  success: z.boolean(),
  data: z.any(), // translated language content
  microlearningId: z.string(),
  analysis: z.any(),
  microlearningStructure: z.any(),
  hasInbox: z.boolean(), // pass through from previous step
});

const finalResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    microlearningId: z.string(),
    title: z.string(),
    targetLanguage: z.string(),
    trainingUrl: z.string(),
    filesGenerated: z.array(z.string()),
  })
});

// Step 1: Load Existing Microlearning
const loadExistingStep = createStep({
  id: 'load-existing-microlearning',
  description: 'Load existing microlearning and prepare analysis for target language',
  inputSchema: addLanguageInputSchema,
  outputSchema: existingContentSchema,
  execute: async ({ inputData }) => {
    const { existingMicrolearningId, targetLanguage, sourceLanguage, department, modelProvider, model } = inputData;

    logger.info('Step 1: Loading existing microlearning', { existingMicrolearningId, targetLanguage });

    // Try KVService first, fallback to MicrolearningService
    let existing = null;

    try {
      const kvService = new KVService();
      logger.info('Using KVService to load microlearning', { existingMicrolearningId });
      const kvResult = await withRetry(
        () => kvService.getMicrolearning(existingMicrolearningId),
        'KV load (microlearning base)'
      );
      existing = kvResult?.base;

      if (existing) {
        logger.info('Found microlearning in KV', { microlearningId: existing.microlearning_id });
      }
    } catch (kvError) {
      const err = kvError instanceof Error ? kvError : new Error(String(kvError));
      logger.warn('KVService failed to load microlearning', { error: err.message, stack: err.stack });
    }

    if (!existing) {
      logger.error('Microlearning not found in KVService', { existingMicrolearningId });
      throw new Error(`Microlearning not found with ID: "${existingMicrolearningId}". Please ensure the microlearning exists and provide the correct ID.`);
    }

    const existingTyped = existing as unknown as MicrolearningContent;
    const meta = existingTyped.microlearning_metadata || {};
    const analysis = {
      language: targetLanguage.toLowerCase(),  // Normalize to lowercase for KV key consistency
      topic: meta.title || 'Training',
      title: meta.title || 'Training',
      department: (department && department !== LANGUAGE.DEFAULT_DEPARTMENT) ? department : (meta.department_relevance?.[0] || LANGUAGE.DEFAULT_DEPARTMENT),
      level: meta.level || 'beginner',
      category: meta.category || 'General',
      subcategory: meta.subcategory,
      learningObjectives: (meta as any).learning_objectives || [],
    } as any;

    // Detect actualSourceLanguage from microlearning metadata (default to en-gb)
    const actualSourceLanguage = meta.language || (meta as any).primary_language || sourceLanguage || LANGUAGE.DEFAULT_SOURCE;

    if (!meta.language && !(meta as any).primary_language && !sourceLanguage) {
      logger.info('Source language not specified, defaulting to en');
    }

    // Validate that target language is different from source
    if (actualSourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
      const errorInfo = errorService.validation(`Target language (${targetLanguage}) cannot be the same as source language (${actualSourceLanguage})`, {
        targetLanguage,
        actualSourceLanguage,
        step: 'validate-languages'
      });
      logErrorInfo(logger, 'error', 'Language validation failed', errorInfo);
      throw new Error(errorInfo.message);
    }

    // Check if training has code_review scene type (no inbox needed)
    let hasInbox = true; // Default: inbox is required for most trainings
    const scenes = existingTyped.scenes || [];
    const hasCodeReview = scenes.some((scene) => scene?.metadata?.scene_type === 'code_review');
    if (hasCodeReview) {
      hasInbox = false; // Only disable inbox for code_review trainings
    }

    if (!hasInbox) {
      logger.info('Code review training detected - inbox will be skipped');
    }

    logger.info('Step 1 completed: Found microlearning', {
      title: analysis.title,
      category: analysis.category,
      sourceLanguage: actualSourceLanguage,
      targetLanguage,
      department: analysis.department,
      inboxRequired: hasInbox
    });

    return {
      success: true,
      data: existing,
      microlearningId: existingTyped.microlearning_id,
      analysis,
      sourceLanguage: actualSourceLanguage.toLowerCase(), // Use detected source language
      targetLanguage, // Pass to parallel steps
      department, // Pass to parallel steps
      modelProvider, // Pass model override through
      model, // Pass model override through
      hasInbox // Pass inbox flag to next steps
    } as any;
  }
});

// Step 2: Translate Language Content
const translateLanguageStep = createStep({
  id: 'translate-language-content',
  description: 'Translate base language content to target language',
  inputSchema: existingContentSchema,
  outputSchema: languageContentSchema,
  execute: async ({ inputData }) => {
    const { data: microlearningStructure, microlearningId, analysis, sourceLanguage, targetLanguage } = inputData;

    logger.info('Step 2: Starting translation', { sourceLanguage, targetLanguage });

    // Try to get base language content from KVService first
    let baseContent = null;

    try {
      const kvService = new KVService();
      logger.info('Using KVService to get language content', { microlearningId, sourceLanguage });
      const langKey = CLOUDFLARE_KV.KEY_TEMPLATES.language(microlearningId, sourceLanguage);
      baseContent = await kvService.get(langKey);

      if (baseContent) {
        logger.info('Found base content in KV', { microlearningId, sourceLanguage });
      }
    } catch (kvError) {
      const err = kvError instanceof Error ? kvError : new Error(String(kvError));
      logger.warn('KVService failed to load language content', { error: err.message, stack: err.stack });
    }

    // Validate base content exists and has data
    if (!baseContent || Object.keys(baseContent).length === 0) {
      logger.error('Base content not found or empty in KVService', { microlearningId, sourceLanguage });
      throw new Error(`Base language content (${sourceLanguage}) not found or empty for translation. Make sure the base language content exists.`);
    }

    logger.info('Found base content, translating', { microlearningId, sourceLanguage, targetLanguage });

    const translationParams = {
      json: baseContent,
      microlearningStructure: microlearningStructure, // Pass scenes metadata for proper scene mapping
      sourceLanguage: sourceLanguage.toLowerCase(),  // Source language (e.g., en-us)
      targetLanguage: targetLanguage.toLowerCase(),  // Normalize to lowercase (e.g., tr-tr)
      topic: analysis.topic, // Pass topic for context-aware translation
      doNotTranslateKeys: ['iconName', 'id', 'ids', 'url', 'src'],
      modelProvider: inputData.modelProvider, // Pass model override if provided
      model: inputData.model // Pass model override if provided
    };

    // Execute with retry for resilience against transient AI failures
    const translated = await withRetry(
      async () => {
        if (!translateLanguageJsonTool.execute) {
          throw new Error('translateLanguageJsonTool.execute is not available');
        }
        return await translateLanguageJsonTool.execute(translationParams);
      },
      `Language translation (${sourceLanguage} → ${targetLanguage})`
    );

    if (!translated?.success) {
      logger.error('Translation tool failed', { response: translated });
      throw new Error(`Language translation failed: ${translated?.error || 'Unknown error'}`);
    }

    // Validate translation data is not empty
    if (!translated.data || Object.keys(translated.data).length === 0) {
      const errorInfo = errorService.external('Translation returned empty content', { step: 'translate-language-json' });
      logErrorInfo(logger, 'error', 'Translation succeeded but returned empty data', errorInfo);
      throw new Error(errorInfo.message);
    }

    // Store translated content using KVService
    try {
      const kvService = new KVService();

      // Store language content
      logger.info('Storing translated content', { microlearningId, targetLanguage });

      const langSuccess = await kvService.storeLanguageContent(
        microlearningId,
        targetLanguage,
        translated.data
      );

      logger.info('Language content storage result', { success: langSuccess });

      // Update language_availability atomically (prevents race conditions in parallel workflows)
      await kvService.updateLanguageAvailabilityAtomic(microlearningId, targetLanguage);

    } catch (kvError) {
      const err = kvError instanceof Error ? kvError : new Error(String(kvError));
      logger.error('KVService storage failed in worker environment', { error: err.message, stack: err.stack });
      throw new Error(`Translation completed but storage failed: ${kvError}`);
    }

    logger.info('Step 2 completed: Translation successful', { targetLanguage, microlearningId });

    return {
      success: true,
      data: translated.data,
      microlearningId,
      analysis,
      microlearningStructure,
      hasInbox: (inputData as any).hasInbox // Pass through from previous step
    } as any;
  }
});

// Step 3: Update Inbox (runs in parallel with translation)
// Note: success can be false if inbox translation fails - workflow continues with language content only
const updateInboxSchema = z.object({
  success: z.boolean(),
  microlearningId: z.string(),
  filesGenerated: z.array(z.string()).optional(),
});

const updateInboxStep = createStep({
  id: 'update-inbox',
  description: 'Translate and update department inbox for new language',
  inputSchema: existingContentSchema, // Receives from loadExistingStep
  outputSchema: updateInboxSchema,
  execute: async ({ inputData }) => {
    const { analysis, microlearningId, data: microlearningStructure } = inputData;
    const targetLanguage = analysis.language;
    const sourceLanguage = microlearningStructure.microlearning_metadata?.language || 'en';
    const modelProvider = (inputData as any).modelProvider;
    const model = (inputData as any).model;
    const hasInbox = (inputData as any).hasInbox;

    // Skip inbox processing if not needed (e.g., code_review training)
    if (!hasInbox) {
      logger.info('Step 3: Skipping inbox update - not required for this training type');
      return {
        success: true,
        microlearningId,
        filesGenerated: []
      };
    }

    logger.info('Step 3: Creating inbox', { targetLanguage, sourceLanguage });

    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : normalizeDepartmentName(LANGUAGE.DEFAULT_DEPARTMENT);
    const kvService = new KVService();

    // Try to translate existing inbox using KVService
    try {
      // Load inbox with automatic fallback to en-gb
      const baseInbox = await loadInboxWithFallback(
        kvService,
        microlearningId,
        normalizedDept,
        sourceLanguage
      );

      if (baseInbox) {
        logger.debug('Found base inbox', { sample: JSON.stringify(baseInbox).substring(0, STRING_TRUNCATION.JSON_SAMPLE_LENGTH) });
        if (!inboxTranslateJsonTool.execute) {
          const errorInfo = errorService.internal('inboxTranslateJsonTool is not executable', { step: 'translate-inbox-json' });
          logErrorInfo(logger, 'error', 'Tool execution check failed', errorInfo);
          throw new Error(errorInfo.message);
        }

        // First attempt with minimal protection
        const inboxTranslationParams = {
          json: baseInbox,
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage.toLowerCase(),
          topic: analysis.topic,
          doNotTranslateKeys: ['id', 'ids', 'isPhishing', 'headers', 'attachments'],
          modelProvider,
          model
        };
        logger.debug('Inbox translation parameters', inboxTranslationParams);
        let translatedInbox = await inboxTranslateJsonTool.execute(inboxTranslationParams);
        let isValid = translatedInbox?.success && validateInboxStructure(baseInbox, translatedInbox.data);

        // Retry once with enhanced protection if first attempt failed
        if (!isValid) {
          logger.warn('First inbox translation failed or invalid, retrying with enhanced protection');

          const enhancedParams = {
            ...inboxTranslationParams,
            doNotTranslateKeys: [...inboxTranslationParams.doNotTranslateKeys,
              'difficulty', 'size', 'type', 'Return-Path', 'SPF', 'DMARC']
          };

          await new Promise(resolve => setTimeout(resolve, TIMEOUT_VALUES.LANGUAGE_WORKFLOW_BACKOFF_MS));
          translatedInbox = await inboxTranslateJsonTool.execute(enhancedParams);
          isValid = translatedInbox?.success && validateInboxStructure(baseInbox, translatedInbox.data);
        }

        // Store result or use correction fallback
        if (isValid) {
          await kvService.storeInboxContent(microlearningId, normalizedDept, targetLanguage, translatedInbox.data);
          logger.info('Inbox translated and stored', { normalizedDept, targetLanguage });
        } else {
          logger.warn('Translation retry also failed, using structure correction fallback');
          const correctedInbox = correctInboxStructure(baseInbox, translatedInbox?.data || baseInbox);
          await kvService.storeInboxContent(microlearningId, normalizedDept, targetLanguage, correctedInbox);
          logger.info('Inbox corrected and stored', { normalizedDept, targetLanguage });
        }
      } else {
        logger.error('No base inbox found to translate');
        return {
          success: false,
          microlearningId,
          filesGenerated: []
        };
      }
    } catch (error) {
      const err = normalizeError(error);
      logger.error('Inbox translation failed', { error: err.message, stack: err.stack });
      return {
        success: false,
        microlearningId,
        filesGenerated: []
      };
    }

    logger.info('Step 3 completed: Inbox translation and storage finished');

    return {
      success: true,
      microlearningId,
      filesGenerated: [`inbox/${normalizedDept}/${targetLanguage}.json`]
    };
  }
});

// Step 4: Combine Results (after parallel steps)
const combineInputSchema = z.object({
  'translate-language-content': languageContentSchema,
  'update-inbox': updateInboxSchema,
});

const combineResultsStep = createStep({
  id: 'combine-results',
  description: 'Combine parallel results and generate final training URL',
  inputSchema: combineInputSchema,
  outputSchema: finalResultSchema,
  execute: async ({ inputData }) => {
    const translateLanguage = inputData['translate-language-content'];
    const updateInbox = inputData['update-inbox'];
    const { microlearningId, analysis } = translateLanguage;
    const targetLanguage = analysis.language;
    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : normalizeDepartmentName(LANGUAGE.DEFAULT_DEPARTMENT);
    const hasInbox = (translateLanguage as any).hasInbox;

    // Check if translation succeeded
    if (!translateLanguage.success) {
      const errorInfo = errorService.external('Language translation failed - cannot generate training URL', { step: 'finalize-translation' });
      logErrorInfo(logger, 'error', 'Language translation failed', errorInfo);
      throw new Error(errorInfo.message);
    }

    // Verify KV consistency before returning URL to UI
    const expectedKeys = buildExpectedKVKeys(microlearningId, targetLanguage, normalizedDept);
    await waitForKVConsistency(microlearningId, expectedKeys);

    // Generate training URL
    const langUrl = encodeURIComponent(`lang/${targetLanguage}`);
    let trainingUrl: string;
    let filesGenerated: string[];
    let message = `🌐 Language translation completed successfully!`;

    // Check if inbox was required and if it succeeded
    if (hasInbox && updateInbox.success) {
      // Both language and inbox successful
      const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
      trainingUrl = `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?courseId=${microlearningId}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;
      filesGenerated = [
        `${microlearningId}/${targetLanguage}.json`,
        ...(updateInbox.filesGenerated || [])
      ];
    } else if (hasInbox && !updateInbox.success) {
      // Language succeeded but inbox failed - graceful degradation
      logger.warn('Inbox translation failed, but language content is available');
      trainingUrl = `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?courseId=${microlearningId}&langUrl=${langUrl}&isEditMode=true`;
      filesGenerated = [`${microlearningId}/${targetLanguage}.json`];
      message = `🌐 Language translation completed! Note: Inbox translation failed but training content is ready.`;
    } else {
      // No inbox needed
      trainingUrl = `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?courseId=${microlearningId}&langUrl=${langUrl}&isEditMode=true`;
      filesGenerated = [`${microlearningId}/${targetLanguage}.json`];
    }

    logger.info('Training URL generated', { trainingUrl });
    logger.info('Add-language workflow completed', { targetLanguage });

    return {
      success: true,
      message,
      data: {
        microlearningId,
        title: analysis.title,
        targetLanguage,
        trainingUrl,
        filesGenerated
      }
    };
  }
});

// Add Language Workflow - Parallel processing

const addLanguageWorkflow = createWorkflow({
  id: 'add-language-workflow',
  description: 'Add new language to existing microlearning with parallel processing for translation and inbox',
  inputSchema: addLanguageInputSchema,
  outputSchema: finalResultSchema,
})
  .then(loadExistingStep)
  .parallel([translateLanguageStep, updateInboxStep])
  .then(combineResultsStep);

// Commit workflow
addLanguageWorkflow.commit();

export { addLanguageWorkflow };