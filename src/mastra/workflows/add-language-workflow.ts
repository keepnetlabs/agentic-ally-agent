import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { translateLanguageJsonTool } from '../tools/translate-language-json-tool';
import { MicrolearningService } from '../services/microlearning-service';
import { RemoteStorageService } from '../services/remote-storage-service';
import { KVService } from '../services/kv-service';
import { normalizeDepartmentName } from '../utils/language-utils';

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
  data: z.any() // translated language content
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
    
    console.log(`🔍 Step 1: Loading existing microlearning ${existingMicrolearningId} for ${targetLanguage} translation`);

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
      console.warn('KVService failed, trying MicrolearningService fallback:', kvError);
    }

    // Fallback to MicrolearningService if KV fails
    if (!existing) {
      console.log(`📄 Fallback: Using MicrolearningService for ${existingMicrolearningId}`);
      const microlearningService = new MicrolearningService();
      existing = await microlearningService.getMicrolearningById(existingMicrolearningId);
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
      console.warn('KVService failed for language content, trying MicrolearningService fallback:', kvError);
    }

    // Fallback to MicrolearningService
    if (!baseContent) {
      console.log(`📄 Fallback: Using MicrolearningService for language content ${microlearningId}/${sourceLanguage}`);
      const service = new MicrolearningService();
      baseContent = await service.getLanguageContent(microlearningId, sourceLanguage);
    }

    if (!baseContent) {
      console.error(`No base content found for ${microlearningId}/${sourceLanguage}`);
      throw new Error(`Base language content (${sourceLanguage}) not found for translation. Make sure the base language content exists.`);
    }

    console.log(`✅ Found base content for ${microlearningId}/${sourceLanguage}, translating to ${targetLanguage}`);
    console.log(`📄 Base content sample:`, JSON.stringify(baseContent).substring(0, 200) + '...');

    if (!translateLanguageJsonTool.execute) {
      throw new Error('translateLanguageJsonTool is not executable');
    }

    const translated = await translateLanguageJsonTool.execute({
      inputData: {
        json: baseContent,
        targetLanguage: targetLanguage, // Use workflow input instead of targetLanguage
        doNotTranslateKeys: ['iconName', 'id', 'ids', 'url', 'src']
      }
    });

    if (!translated?.success) {
      console.error('Translation tool response:', translated);
      throw new Error(`Language translation failed: ${translated?.error || 'Unknown error'}`);
    }

    // Store translated content using KVService
    let storageSuccess = false;
    
    try {
      const kvService = new KVService();
      
      // Store language content
      const langSuccess = await kvService.storeLanguageContent(
        microlearningId,
        targetLanguage,
        translated.data
      );
      
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
      console.warn('KVService storage failed, using MicrolearningService fallback:', kvError);
      
      // Fallback to MicrolearningService
      const service = new MicrolearningService();
      await service.storeLanguageContent(
        microlearningId,
        targetLanguage,
        translated.data
      );

      // Update language_availability with fallback
      const updatedMicrolearning = { ...microlearningStructure };
      if (updatedMicrolearning.microlearning_metadata) {
        const currentLanguages = updatedMicrolearning.microlearning_metadata.language_availability || [];
        const newLanguage = targetLanguage.toLowerCase();
        
        if (!currentLanguages.includes(newLanguage)) {
          updatedMicrolearning.microlearning_metadata.language_availability = [...currentLanguages, newLanguage];
          await service.storeMicrolearning(updatedMicrolearning);
          console.log(`✅ Updated language_availability: [${updatedMicrolearning.microlearning_metadata.language_availability.join(', ')}]`);
        }
      }
      
      storageSuccess = true; // Assume fallback worked
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
  inputSchema: existingContentSchema, // Use existingContentSchema which has targetLanguage field
  outputSchema: finalResultSchema,
  execute: async ({ inputData }) => {
    const { data: languageContent, analysis, microlearningId, targetLanguage, department } = inputData;

    console.log(`📥 Step 3: Creating inbox for ${targetLanguage} language`);
    
    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';
    const remote = new RemoteStorageService();

    // Try to translate existing inbox first (base 'en')
    try {
      const service = new MicrolearningService();
      const baseInbox = await service.getDepartmentInbox(microlearningId, normalizedDept, 'en');

      if (baseInbox) {
        if (!translateLanguageJsonTool.execute) {
          throw new Error('translateLanguageJsonTool is not executable');
        }

        const translatedInbox = await translateLanguageJsonTool.execute({
          inputData: {
            json: baseInbox,
            targetLanguage: targetLanguage, // Use workflow input instead of targetLanguage
            doNotTranslateKeys: ['id', 'ids']
          }
        });

        if (translatedInbox?.success) {
          await remote.upsertInbox(normalizedDept, targetLanguage, microlearningId, translatedInbox.data);
          console.log(`✅ Inbox translated and stored: inbox/${normalizedDept}/${targetLanguage}.json`);
        } else {
          throw new Error('Inbox translation failed');
        }
      } else {
        throw new Error('No base inbox to translate');
      }
    } catch (error) {
      console.error('Inbox translation failed:', error);
      throw new Error(`Failed to update inbox: ${error}`);
    }

    await remote.saveLanguageFile(microlearningId, targetLanguage, languageContent);

    const baseUrl = encodeURIComponent(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
    const langUrl = encodeURIComponent(`lang/${targetLanguage}`);
    const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
    const trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;

    console.log(`✅ Step 3 completed: Inbox setup finished`);
    console.log(`🎯 Training URL generated: ${trainingUrl}`);
    console.log(`🎉 Add-language workflow completed successfully for ${targetLanguage}`);

    return {
      success: true,
      message: `🌐 Language translation completed successfully! Training URL: ${trainingUrl}`,
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

// Add Language Workflow
// Final step to extract translation result from parallel execution
const finalizeResultsStep = createStep({
  id: 'finalize-results',
  description: 'Extract translation result from parallel execution',
  inputSchema: z.object({
    'translate-language-content': languageContentSchema,
    'update-inbox': finalResultSchema
  }),
  outputSchema: finalResultSchema,
  execute: async ({ inputData }) => {
    // Return the inbox result which contains the complete response
    return inputData['update-inbox'];
  }
});

const addLanguageWorkflow = createWorkflow({
  id: 'add-language-workflow',
  description: 'Add new language to existing microlearning with parallel processing',
  inputSchema: addLanguageInputSchema,
  outputSchema: finalResultSchema,
})
  .then(loadExistingStep)
  .parallel([translateLanguageStep, updateInboxStep])
  .then(finalizeResultsStep);

// Commit workflow
addLanguageWorkflow.commit();

export { addLanguageWorkflow };