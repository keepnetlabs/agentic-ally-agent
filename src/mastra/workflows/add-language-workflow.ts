import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { translateLanguageJsonTool } from '../tools/translate-language-json-tool';
import { RemoteStorageService } from '../services/remote-storage-service';
import { KVService } from '../services/kv-service';
import { normalizeDepartmentName } from '../utils/language-utils';
import { validateInboxStructure, correctInboxStructure, detectJsonCorruption } from '../utils/json-validation-utils';

// Input/Output Schemas
const addLanguageInputSchema = z.object({
  existingMicrolearningId: z.string().describe('ID of existing microlearning'),
  targetLanguage: z.string().describe('Target language code (e.g., tr, de, fr)'),
  sourceLanguage: z.string().optional().default('en').describe('Source language to translate from'),
  department: z.string().optional().default('All'),
});

const existingContentSchema = z.object({
  success: z.boolean(),
  data: z.any(), // existing microlearning
  microlearningId: z.string(),
  analysis: z.any(), // minimal analysis for target language
  sourceLanguage: z.string(), // source language to translate from
  targetLanguage: z.string(), // target language for parallel steps
  department: z.string(), // department for parallel steps
});

const languageContentSchema = z.object({
  success: z.boolean(),
  data: z.any(), // translated language content
  microlearningId: z.string(),
  analysis: z.any(),
  microlearningStructure: z.any()
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
    const { existingMicrolearningId, targetLanguage, sourceLanguage, department } = inputData;

    // Validate language parameters
    if (targetLanguage === sourceLanguage) {
      throw new Error(`Target language (${targetLanguage}) cannot be the same as source language (${sourceLanguage}). Please check your parameters.`);
    }

    console.log(`🔍 Step 1: Loading existing microlearning ${existingMicrolearningId} for ${sourceLanguage} → ${targetLanguage} translation`);

    // Try KVService first, fallback to MicrolearningService
    let existing = null;

    try {
      const kvService = new KVService();
      console.log(`📦 Using KVService to load microlearning ${existingMicrolearningId}`);
      const kvResult = await kvService.getMicrolearning(existingMicrolearningId);
      existing = kvResult?.base;

      if (existing) {
        console.log(`✅ Found microlearning in KV: ${existing.microlearning_id}`);
      }
    } catch (kvError) {
      console.warn('KVService failed to load microlearning:', kvError);
    }

    // No fallback needed - only use KVService in worker environment
    if (!existing) {
      console.error(`❌ Microlearning not found in KVService: ${existingMicrolearningId}`);
    }

    if (!existing) {
      throw new Error(`Microlearning not found with ID: "${existingMicrolearningId}". Please ensure the microlearning exists and provide the correct ID.`);
    }

    const meta = (existing as any).microlearning_metadata || {};
    const analysis = {
      language: targetLanguage,
      topic: meta.topic || (existing as any).title || 'Training',
      title: meta.title || (existing as any).title || 'Training',
      department: department || meta.department || 'All',
      level: meta.level || 'beginner',
      category: meta.category || 'General',
      subcategory: meta.subcategory,
      learningObjectives: meta.learning_objectives || [],
    } as any;

    // Detect actual source language from microlearning metadata
    const actualSourceLanguage = meta.language || meta.primary_language || sourceLanguage;

    console.log(`✅ Step 1 completed: Found microlearning "${analysis.title}" (${analysis.category})`);
    console.log(`📋 Translation details: ${actualSourceLanguage} → ${targetLanguage} for ${analysis.department} department`);

    return {
      success: true,
      data: existing,
      microlearningId: (existing as any).microlearning_id,
      analysis,
      sourceLanguage: actualSourceLanguage, // Use detected source language
      targetLanguage, // Pass to parallel steps
      department // Pass to parallel steps
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

    console.log(`🔄 Step 2: Starting translation from ${sourceLanguage} to ${targetLanguage}`);

    // Try to get base language content from KVService first
    let baseContent = null;

    try {
      const kvService = new KVService();
      console.log(`📦 Using KVService to get language content directly: ${microlearningId}/${sourceLanguage}`);
      const langKey = `ml:${microlearningId}:lang:${sourceLanguage}`;
      baseContent = await kvService.get(langKey);

      if (baseContent) {
        console.log(`✅ Found base content in KV: ${microlearningId}/${sourceLanguage}`);
      }
    } catch (kvError) {
      console.warn('KVService failed to load language content:', kvError);
    }

    // No fallback needed - only use KVService in worker environment  
    if (!baseContent) {
      console.error(`❌ Base content not found in KVService: ${microlearningId}/${sourceLanguage}`);
    }

    if (!baseContent) {
      console.error(`No base content found for ${microlearningId}/${sourceLanguage}`);
      throw new Error(`Base language content (${sourceLanguage}) not found for translation. Make sure the base language content exists.`);
    }

    console.log(`✅ Found base content for ${microlearningId}/${sourceLanguage}, translating to ${targetLanguage}`);
    console.log(`📄 Base content sample:`, JSON.stringify(baseContent).substring(0, 50) + '...');

    if (!translateLanguageJsonTool.execute) {
      throw new Error('translateLanguageJsonTool is not executable');
    }

    console.log('🔍 targetLanguage variable:', targetLanguage, typeof targetLanguage);
    console.log('🔍 sourceLanguage variable:', sourceLanguage, typeof sourceLanguage);
    console.log('🔍 baseContent keys:', Object.keys(baseContent || {}));
    console.log('🔍 microlearningId:', microlearningId);

    const translationParams = {
      json: baseContent,
      targetLanguage: targetLanguage,
      topic: analysis.topic, // Pass topic for context-aware translation
      doNotTranslateKeys: ['iconName', 'id', 'ids', 'url', 'src']
    };



    const translated = await translateLanguageJsonTool.execute(translationParams);

    if (!translated?.success) {
      console.error('Translation tool response:', translated);
      throw new Error(`Language translation failed: ${translated?.error || 'Unknown error'}`);
    }

    // Store translated content using KVService
    let storageSuccess = false;

    try {
      const kvService = new KVService();

      // Store language content
      console.log(`💾 About to store translated content for: ${microlearningId}/${targetLanguage}`);
      console.log(`📊 Translated data sample:`, JSON.stringify(translated.data).substring(0, 200) + '...');

      const langSuccess = await kvService.storeLanguageContent(
        microlearningId,
        targetLanguage,
        translated.data
      );

      console.log(`📝 Language content storage result: ${langSuccess ? 'SUCCESS' : 'FAILED'} for ${microlearningId}/${targetLanguage}`);

      // DEBUG: Verify what was actually stored
      const verifyKey = `ml:${microlearningId}:lang:${targetLanguage}`;
      const storedData = await kvService.get(verifyKey);
      if (storedData) {
        console.log(`🔍 DEBUG: Stored data keys:`, Object.keys(storedData || {}));
        console.log(`🔍 DEBUG: First stored item:`, JSON.stringify(storedData['1'] || storedData[Object.keys(storedData)[0]]).substring(0, 100) + '...');
      } else {
        console.error(`❌ DEBUG: No data found at key ${verifyKey}`);
      }

      // Update language_availability in microlearning metadata
      const updatedMicrolearning = { ...microlearningStructure };
      if (updatedMicrolearning.microlearning_metadata) {
        const currentLanguages = updatedMicrolearning.microlearning_metadata.language_availability || [];
        const newLanguage = targetLanguage.toLowerCase();

        // Add new language if not already present
        if (!currentLanguages.includes(newLanguage)) {
          updatedMicrolearning.microlearning_metadata.language_availability = [...currentLanguages, newLanguage];

          // Store updated microlearning structure
          const baseSuccess = await kvService.updateMicrolearning(updatedMicrolearning);
          console.log(`✅ Updated language_availability: [${updatedMicrolearning.microlearning_metadata.language_availability.join(', ')}]`);

          storageSuccess = langSuccess && baseSuccess;
        } else {
          storageSuccess = langSuccess;
        }
      }

    } catch (kvError) {
      console.error('❌ KVService storage failed in worker environment:', kvError);
      throw new Error(`Translation completed but storage failed: ${kvError}`);
    }

    console.log(`✅ Step 2 completed: Translation to ${targetLanguage} successful`);
    console.log(`💾 Language content stored: ${microlearningId}/${targetLanguage}.json`);

    return {
      success: true,
      data: translated.data,
      microlearningId,
      analysis,
      microlearningStructure
    } as any;
  }
});

// Step 3: Update Inbox
const updateInboxStep = createStep({
  id: 'update-inbox',
  description: 'Translate and update department inbox for new language',
  inputSchema: languageContentSchema, // Now receives translated content from previous step
  outputSchema: finalResultSchema,
  execute: async ({ inputData }) => {
    const { data: translatedLanguageContent, analysis, microlearningId, microlearningStructure } = inputData;
    const targetLanguage = analysis.language;
    const sourceLanguage = microlearningStructure.microlearning_metadata?.language || 'en';

    console.log(`📥 Step 3: Creating inbox for ${targetLanguage} language`);
    console.log(`🔍 Source language for inbox: ${sourceLanguage}`);
    console.log(`🔍 Target language for inbox: ${targetLanguage}`);

    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';
    const remote = new RemoteStorageService();

    // Try to translate existing inbox using KVService
    try {
      const kvService = new KVService();
      console.log(`📦 Looking for base inbox in KV: ${microlearningId}/${normalizedDept}/${sourceLanguage}`);

      // Try to get inbox from KVService
      const inboxKey = `ml:${microlearningId}:inbox:${normalizedDept}:${sourceLanguage}`;
      let baseInbox = await kvService.get(inboxKey);

      // Fallback to 'en' if source language inbox not found
      if (!baseInbox && sourceLanguage !== 'en') {
        console.log(`⚠️ No inbox found for ${sourceLanguage}, trying fallback to 'en'`);
        const fallbackKey = `ml:${microlearningId}:inbox:${normalizedDept}:en`;
        baseInbox = await kvService.get(fallbackKey);
        if (baseInbox) {
          console.log(`✅ Found fallback inbox in 'en'`);
        }
      }

      if (baseInbox) {
        console.log(`✅ Found base inbox, sample:`, JSON.stringify(baseInbox).substring(0, 200) + '...');

        // Check for corruption in base inbox before translation
        const corruptionIssues = detectJsonCorruption(baseInbox);
        if (corruptionIssues.length > 0) {
          console.warn('⚠️ Detected corruption in base inbox:', corruptionIssues.join(', '));
          console.warn('⚠️ Translation may produce incomplete results due to source corruption');
        }

        if (!translateLanguageJsonTool.execute) {
          throw new Error('translateLanguageJsonTool is not executable');
        }

        const inboxTranslationParams = {
          json: baseInbox,
          targetLanguage: targetLanguage,
          topic: analysis.topic, // Pass topic for context-aware translation
          doNotTranslateKeys: ['id', 'ids']
        };


        const translatedInbox = await translateLanguageJsonTool.execute(inboxTranslationParams);

        if (translatedInbox?.success) {
          console.log(`✅ Inbox translation successful, sample:`, JSON.stringify(translatedInbox.data).substring(0, 200) + '...');

          // Validate JSON structure before storing
          const isValidStructure = validateInboxStructure(baseInbox, translatedInbox.data);
          if (!isValidStructure) {
            console.warn('⚠️ Translation structure validation failed, attempting re-translation...');

            // Try re-translation with enhanced parameters
            const reTranslationParams = {
              json: baseInbox,
              targetLanguage: targetLanguage,
              topic: analysis.topic,
              doNotTranslateKeys: ['id', 'ids', 'isPhishing', 'difficulty', 'size', 'type', 'timestamp', 'headers', 'attachments']
            };

            const reTranslatedInbox = await translateLanguageJsonTool.execute(reTranslationParams);

            if (reTranslatedInbox?.success && validateInboxStructure(baseInbox, reTranslatedInbox.data)) {
              console.log(`✅ Re-translation successful with correct structure`);
              await remote.upsertInbox(normalizedDept, targetLanguage, microlearningId, reTranslatedInbox.data);
              console.log(`✅ Re-translated inbox stored: inbox/${normalizedDept}/${targetLanguage}.json`);
            } else {
              console.warn('⚠️ Re-translation also failed, using corrected version...');
              const correctedInbox = correctInboxStructure(baseInbox, translatedInbox.data);
              await remote.upsertInbox(normalizedDept, targetLanguage, microlearningId, correctedInbox);
              console.log(`✅ Inbox corrected and stored: inbox/${normalizedDept}/${targetLanguage}.json`);
            }
          } else {
            await remote.upsertInbox(normalizedDept, targetLanguage, microlearningId, translatedInbox.data);
            console.log(`✅ Inbox translated and stored: inbox/${normalizedDept}/${targetLanguage}.json`);
          }
        } else {
          console.warn('⚠️ First inbox translation failed, attempting retry...');

          try {
            // Retry translation with same parameters
            const retryTranslatedInbox = await translateLanguageJsonTool.execute(inboxTranslationParams);

            if (retryTranslatedInbox?.success) {
              // Validate retry translation structure
              const isRetryValidStructure = validateInboxStructure(baseInbox, retryTranslatedInbox.data);
              if (!isRetryValidStructure) {
                console.warn('⚠️ Retry translation structure validation failed, attempting final re-translation...');

                // Final attempt with maximum protection
                const finalTranslationParams = {
                  json: baseInbox,
                  targetLanguage: targetLanguage,
                  topic: analysis.topic,
                  doNotTranslateKeys: ['id', 'ids', 'isPhishing', 'difficulty', 'size', 'type', 'timestamp', 'headers', 'attachments', 'Return-Path', 'SPF', 'DMARC']
                };

                const finalTranslatedInbox = await translateLanguageJsonTool.execute(finalTranslationParams);

                if (finalTranslatedInbox?.success && validateInboxStructure(baseInbox, finalTranslatedInbox.data)) {
                  console.log(`✅ Final re-translation successful with correct structure`);
                  await remote.upsertInbox(normalizedDept, targetLanguage, microlearningId, finalTranslatedInbox.data);
                  console.log(`✅ Final re-translated inbox stored: inbox/${normalizedDept}/${targetLanguage}.json`);
                } else {
                  console.warn('⚠️ All translation attempts failed, using corrected version...');
                  const correctedRetryInbox = correctInboxStructure(baseInbox, retryTranslatedInbox.data);
                  await remote.upsertInbox(normalizedDept, targetLanguage, microlearningId, correctedRetryInbox);
                  console.log(`✅ Final corrected inbox stored: inbox/${normalizedDept}/${targetLanguage}.json`);
                }
              } else {
                await remote.upsertInbox(normalizedDept, targetLanguage, microlearningId, retryTranslatedInbox.data);
                console.log(`✅ Inbox translated and stored on retry: inbox/${normalizedDept}/${targetLanguage}.json`);
              }
            } else {
              throw new Error('Retry also failed');
            }
          } catch (retryError) {
            console.error('❌ Inbox translation failed after retry');
            throw new Error(`Inbox translation failed after retry. Please regenerate inbox from scratch for ${targetLanguage} language.`);
          }
        }
      } else {
        throw new Error('No base inbox to translate');
      }
    } catch (error) {
      console.error('Inbox translation failed:', error);
      throw new Error(`Failed to update inbox: ${error}`);
    }

    await remote.saveLanguageFile(microlearningId, targetLanguage, translatedLanguageContent);

    const baseUrl = encodeURIComponent(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
    const langUrl = encodeURIComponent(`lang/${targetLanguage}`);
    const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
    const trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;

    console.log(`✅ Step 3 completed: Inbox setup finished`);
    console.log(`🎯 Training URL generated: ${trainingUrl}`);
    console.log(`🎉 Add-language workflow completed successfully for ${targetLanguage}`);

    return {
      success: true,
      message: `🌐 Language translation completed successfully!`,
      data: {
        microlearningId,
        title: analysis.title,
        sourceLanguage: 'en',
        targetLanguage: targetLanguage,
        department: analysis.department,
        trainingUrl,
        filesGenerated: [
          `${microlearningId}/${targetLanguage}.json`,
          `inbox/${normalizedDept}/${targetLanguage}.json`
        ]
      }
    };
  }
});

// Add Language Workflow - Sequential processing

const addLanguageWorkflow = createWorkflow({
  id: 'add-language-workflow',
  description: 'Add new language to existing microlearning with sequential processing',
  inputSchema: addLanguageInputSchema,
  outputSchema: finalResultSchema,
})
  .then(loadExistingStep)
  .then(translateLanguageStep)
  .then(updateInboxStep);

// Commit workflow
addLanguageWorkflow.commit();

export { addLanguageWorkflow };