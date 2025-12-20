import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { translateLanguageJsonTool } from '../tools/generation';
import { inboxTranslateJsonTool } from '../tools/inbox';
import { KVService } from '../services/kv-service';
import { normalizeDepartmentName } from '../utils/language/language-utils';
import { validateInboxStructure, correctInboxStructure, detectJsonCorruption } from '../utils/validation/json-validation-utils';
import { MODEL_PROVIDERS, TIMEOUT_VALUES, STRING_TRUNCATION } from '../constants';
import { getLogger } from '../utils/core/logger';
import { waitForKVConsistency, buildExpectedKVKeys } from '../utils/kv-consistency';
import { normalizeError } from '../utils/core/error-utils';

const logger = getLogger('AddLanguageWorkflow');

// Input/Output Schemas
const addLanguageInputSchema = z.object({
  existingMicrolearningId: z.string().describe('ID of existing microlearning'),
  targetLanguage: z.string().describe('Target language code - supports any language code (e.g., tr-tr, de-de, fr-fr, ja-jp, ko-kr, zh-cn,fr-ca etc.)'),
  sourceLanguage: z.string().optional().describe('Source language code (e.g., en-US, tr-TR). If not provided, auto-detected from microlearning metadata'),
  department: z.string().optional().default('All'),
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
      const kvResult = await kvService.getMicrolearning(existingMicrolearningId);
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

    const meta = (existing as any).microlearning_metadata || {};
    const analysis = {
      language: targetLanguage.toLowerCase(),  // Normalize to lowercase for KV key consistency
      topic: meta.topic || (existing as any).title || 'Training',
      title: meta.title || (existing as any).title || 'Training',
      department: (department && department !== 'All') ? department : (meta.department || 'All'),
      level: meta.level || 'beginner',
      category: meta.category || 'General',
      subcategory: meta.subcategory,
      learningObjectives: meta.learning_objectives || [],
    } as any;

    // Detect actual source language from microlearning metadata (default to 'en')
    const actualSourceLanguage = meta.language || meta.primary_language || sourceLanguage || 'en-gb';

    if (!meta.language && !meta.primary_language && !sourceLanguage) {
      logger.info('Source language not specified, defaulting to en');
    }

    // Validate that target language is different from source
    if (actualSourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
      throw new Error(`Target language (${targetLanguage}) cannot be the same as source language (${actualSourceLanguage}). Please choose a different target language.`);
    }

    // Check if training has code_review scene type (no inbox needed)
    let hasInbox = true; // Default: inbox is required for most trainings
    const scenes = (existing as any).scenes || [];
    const hasCodeReview = scenes.some((scene: any) => scene?.metadata?.scene_type === 'code_review');
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
      microlearningId: (existing as any).microlearning_id,
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
      const langKey = `ml:${microlearningId}:lang:${sourceLanguage}`;
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

    if (!translateLanguageJsonTool.execute) {
      throw new Error('translateLanguageJsonTool is not executable');
    }

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


    const translated = await translateLanguageJsonTool.execute(translationParams);

    if (!translated?.success) {
      logger.error('Translation tool failed', { response: translated });
      throw new Error(`Language translation failed: ${translated?.error || 'Unknown error'}`);
    }

    // Validate translation data is not empty
    if (!translated.data || Object.keys(translated.data).length === 0) {
      logger.error('Translation succeeded but returned empty data');
      throw new Error('Translation returned empty content - please retry or check source language content');
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

    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';
    const kvService = new KVService();

    // Try to translate existing inbox using KVService
    try {
      logger.info('Looking for base inbox in KV', { microlearningId, normalizedDept, sourceLanguage });

      // Try to get inbox from KVService
      const inboxKey = `ml:${microlearningId}:inbox:${normalizedDept}:${sourceLanguage}`;
      let baseInbox = await kvService.get(inboxKey);

      // Fallback to 'en' if source language inbox not found
      if (!baseInbox && sourceLanguage !== 'en-gb') {
        logger.info('No inbox found for source language, trying fallback to en-gb', { sourceLanguage });
        const fallbackKey = `ml:${microlearningId}:inbox:${normalizedDept}:en-gb`;
        baseInbox = await kvService.get(fallbackKey);
        if (baseInbox) {
          logger.info('Found fallback inbox in en-gb');
        }
      }

      if (baseInbox) {
        logger.debug('Found base inbox', { sample: JSON.stringify(baseInbox).substring(0, STRING_TRUNCATION.JSON_SAMPLE_LENGTH) });

        // Check for corruption in base inbox before translation
        const corruptionIssues = detectJsonCorruption(baseInbox);
        if (corruptionIssues.length > 0) {
          logger.warn('Detected corruption in base inbox', { issues: corruptionIssues.join(', ') });
          logger.warn('Translation may produce incomplete results due to source corruption');
        }

        if (!inboxTranslateJsonTool.execute) {
          throw new Error('inboxTranslateJsonTool is not executable');
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
    const { microlearningId, analysis, microlearningStructure } = translateLanguage;
    const targetLanguage = analysis.language;
    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';
    const hasInbox = (translateLanguage as any).hasInbox;

    // Check if translation succeeded
    if (!translateLanguage.success) {
      throw new Error('Language translation failed - cannot generate training URL');
    }

    // Verify KV consistency before returning URL to UI
    const expectedKeys = buildExpectedKVKeys(microlearningId, targetLanguage, normalizedDept);
    await waitForKVConsistency(microlearningId, expectedKeys);

    // Generate training URL
    const baseUrl = encodeURIComponent(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
    const langUrl = encodeURIComponent(`lang/${targetLanguage}`);

    let trainingUrl: string;
    let filesGenerated: string[];
    let message = `🌐 Language translation completed successfully!`;

    // Check if inbox was required and if it succeeded
    if (hasInbox && updateInbox.success) {
      // Both language and inbox successful
      const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
      trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;
      filesGenerated = [
        `${microlearningId}/${targetLanguage}.json`,
        ...(updateInbox.filesGenerated || [])
      ];
    } else if (hasInbox && !updateInbox.success) {
      // Language succeeded but inbox failed - graceful degradation
      logger.warn('Inbox translation failed, but language content is available');
      trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&isEditMode=true`;
      filesGenerated = [`${microlearningId}/${targetLanguage}.json`];
      message = `🌐 Language translation completed! Note: Inbox translation failed but training content is ready.`;
    } else {
      // No inbox needed
      trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&isEditMode=true`;
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