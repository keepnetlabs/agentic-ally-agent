import { createStep, createWorkflow } from '@mastra/core/workflows';

import { analyzeUserPromptTool } from '../tools/analysis';
import { generateMicrolearningJsonTool, generateLanguageJsonTool } from '../tools/generation';
import { createInboxStructureTool } from '../tools/inbox';
import { getModelWithOverride } from '../model-providers';
import { MicrolearningService } from '../services/microlearning-service';
import { KVService } from '../services/kv-service';
import { generateMicrolearningId, normalizeDepartmentName } from '../utils/language/language-utils';
import { API_ENDPOINTS } from '../constants';
import {
  createStepInputSchema,
  promptAnalysisSchema,
  microlearningSchema,
  microlearningLanguageContentSchema,
  microlearningFinalResultSchema,
  saveToKVInputSchema
} from '../schemas/create-microlearning-schemas';
import { getLogger } from '../utils/core/logger';
import { waitForKVConsistency, buildExpectedKVKeys } from '../utils/kv-consistency';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { withRetry } from '../utils/core/resilience-utils';
import { summarizeForLog } from '../utils/core/log-redaction-utils';

const logger = getLogger('CreateMicrolearningWorkflow');

// Input/Output Schemas


// Step 1: Analyze Prompt
export const analyzePromptStep = createStep({
  id: 'analyze-prompt',
  description: 'Analyze user prompt and extract learning requirements',
  // v1: Use step schema with resolved types (defaults applied)
  inputSchema: createStepInputSchema,
  outputSchema: promptAnalysisSchema,
  execute: async ({ inputData }) => {
    if (!inputData.prompt || inputData.prompt.trim() === '') {
      throw new Error('Missing prompt for new microlearning generation');
    }

    if (!analyzeUserPromptTool.execute) {
      throw new Error('Analyze user prompt tool is not executable');
    }

    // Pass model provider, model, and policy context to analyze step
    // v1: execute(inputData, ctx) - writer goes in ctx
    const analysisRes = await analyzeUserPromptTool.execute({
      userPrompt: inputData.prompt,
      additionalContext: inputData.additionalContext,
      suggestedDepartment: inputData.department,
      suggestedLevel: inputData.level,
      customRequirements: inputData.customRequirements,
      suggestedLanguage: inputData.language,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      policyContext: inputData.policyContext,
    }, { writer: inputData.writer } as any);

    // v1: Check for ValidationError or failure
    if (('error' in analysisRes && analysisRes.error) || !analysisRes.success) {
      const errorMsg = ('error' in analysisRes && analysisRes.error) ? String(analysisRes.error) : 'Unknown error';
      const errorInfo = errorService.external(`Prompt analysis failed: ${errorMsg}`, { step: 'analyze-user-prompt' });
      logErrorInfo(logger, 'error', 'Prompt analysis failed', errorInfo);
      throw new Error(errorInfo.message);
    }
    logger.debug('Additional context received', {
      additionalContext: summarizeForLog(inputData.additionalContext),
    });
    return {
      success: analysisRes.success,
      data: {
        ...analysisRes.data,
        additionalContext: inputData.additionalContext // Explicitly pass context to next steps
      },
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      writer: inputData.writer,
      policyContext: inputData.policyContext,
    };
  }
});

// Step 2: Generate Microlearning Structure
export const generateMicrolearningStep = createStep({
  id: 'generate-microlearning',
  description: 'Generate microlearning JSON structure',
  inputSchema: promptAnalysisSchema,
  outputSchema: microlearningSchema,
  execute: async ({ inputData }) => {
    const analysis = inputData.data;
    const microlearningId = generateMicrolearningId(analysis.topic);
    const model = getModelWithOverride(inputData.modelProvider, inputData.model);
    logger.info('Generating microlearning structure', { analysis });
    if (!generateMicrolearningJsonTool.execute) {
      throw new Error('Generate microlearning JSON tool is not executable');
    }

    // v1: execute now takes (inputData, context)
    const genRes = await generateMicrolearningJsonTool.execute({
      analysis, microlearningId, model, policyContext: inputData.policyContext
    }, {});

    // v1: Check for ValidationError or failure
    if (('error' in genRes && genRes.error) || !genRes.success) {
      const errorMsg = ('error' in genRes && genRes.error) ? String(genRes.error) : 'Unknown error';
      const errorInfo = errorService.external(`Microlearning generation failed: ${errorMsg}`, { step: 'generate-microlearning-json' });
      logErrorInfo(logger, 'error', 'Microlearning generation failed', {
        ...errorInfo,
        topic: analysis.topic
      } as any);
      throw new Error(errorInfo.message);
    }

    const normalizedDepartment = analysis.department
      ? normalizeDepartmentName(analysis.department)
      : normalizeDepartmentName('all');
    const enrichedMicrolearning = {
      ...genRes.data,
      microlearning_metadata: {
        ...(genRes.data?.microlearning_metadata || {}),
        department_relevance: Array.isArray(genRes.data?.microlearning_metadata?.department_relevance)
          ? genRes.data.microlearning_metadata.department_relevance
          : [analysis.department || 'all'],
      },
    };
    if (!enrichedMicrolearning.microlearning_metadata.department_relevance.includes(normalizedDepartment)) {
      enrichedMicrolearning.microlearning_metadata.department_relevance.push(normalizedDepartment);
    }

    const microlearningService = new MicrolearningService();
    await microlearningService.storeMicrolearning(enrichedMicrolearning);

    const scenes = enrichedMicrolearning.scenes || [];
    const hasCodeReview = scenes.some((scene: { metadata?: { scene_type?: string } }) => scene?.metadata?.scene_type === 'code_review');
    const hasVishing = scenes.some((scene: { metadata?: { scene_type?: string } }) => scene?.metadata?.scene_type === 'vishing_simulation');
    const hasSmishing = scenes.some((scene: { metadata?: { scene_type?: string } }) => scene?.metadata?.scene_type === 'smishing_simulation');
    const hasInbox = !(hasCodeReview || hasVishing || hasSmishing);
    if (!hasInbox) {
      logger.info('Inbox will be skipped for this training type', {
        hasCodeReview,
        hasVishing,
        hasSmishing
      });
    }

    return {
      success: true,
      data: enrichedMicrolearning,
      microlearningId,
      analysis,
      microlearningStructure: enrichedMicrolearning,
      hasInbox,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      writer: inputData.writer,
      policyContext: inputData.policyContext,
    } as any;
  }
});

// Step 3: Generate Language Content
export const generateLanguageStep = createStep({
  id: 'generate-language-content',
  description: 'Generate language-specific training content',
  inputSchema: microlearningSchema,
  outputSchema: microlearningLanguageContentSchema, // Updated schema name
  execute: async ({ inputData }) => {
    const microlearningStructure = inputData.data;
    const analysis = inputData.analysis;
    const microlearningId = inputData.microlearningId;

    const model = getModelWithOverride(inputData.modelProvider, inputData.model);
    if (!generateLanguageJsonTool.execute) {
      throw new Error('Generate language JSON tool is not executable');
    }

    // v1: execute(inputData, ctx) - writer goes in ctx
    const result = await generateLanguageJsonTool.execute({
      analysis,
      microlearning: microlearningStructure,
      model,
      policyContext: inputData.policyContext
    }, { writer: inputData.writer } as any);

    // v1: Check for ValidationError or failure
    if (('error' in result && result.error) || !result.success) {
      const errorMsg = ('error' in result && result.error) ? String(result.error) : 'Unknown error';
      const errorInfo = errorService.external(`Language content generation failed: ${errorMsg}`, { step: 'generate-language-json' });
      logErrorInfo(logger, 'error', 'Language content generation failed', {
        ...errorInfo,
        microlearningId,
        language: analysis.language
      } as any);
      throw new Error(errorInfo.message);
    }

    const microlearningService = new MicrolearningService();
    await microlearningService.storeLanguageContent(
      microlearningId,
      analysis.language,
      result.data
    );

    return {
      ...result,
      microlearningId,
      analysis,
      microlearningStructure,
      hasInbox: (inputData as any).hasInbox,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      writer: inputData.writer,
      policyContext: inputData.policyContext,
    } as any;
  }
});

// Step 4: Create Inbox Assignment
export const createInboxStep = createStep({
  id: 'create-inbox-assignment',
  description: 'Create inbox structure and finalize training',
  inputSchema: microlearningLanguageContentSchema, // Updated input schema to match previous step output
  outputSchema: microlearningFinalResultSchema, // Updated output schema name
  execute: async ({ inputData }) => {
    const { analysis, microlearningStructure, microlearningId } = inputData;
    const hasInbox = (inputData as any).hasInbox !== false;

    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';

    if (!hasInbox) {
      const langUrl = encodeURIComponent(`lang/${analysis.language}`);
      const trainingUrl = `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?courseId=${microlearningId}&langUrl=${langUrl}&isEditMode=true`;
      return {
        success: true,
        message: `🎉 New microlearning created successfully! Training URL: ${trainingUrl}`,
        data: null,
        metadata: {
          microlearningId,
          title: analysis.title,
          language: analysis.language,
          department: normalizedDept,
          trainingUrl,
          filesGenerated: [
            `${microlearningId}.json`,
            `${microlearningId}/${analysis.language}.json`,
          ]
        }
      };
    }

    if (!createInboxStructureTool.execute) {
      throw new Error('Create inbox structure tool is not executable');
    }

    // v1: execute now takes (inputData, context)
    const inboxResult = await createInboxStructureTool.execute({
      department: normalizedDept,
      languageCode: analysis.language,
      microlearningId,
      microlearning: microlearningStructure,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      additionalContext: analysis.additionalContext // Pass user context to inbox generation
    }, {});

    // v1: Check for ValidationError or failure
    if (('error' in inboxResult && inboxResult.error) || !inboxResult.success) {
      const errorMsg = ('error' in inboxResult && inboxResult.error) ? String(inboxResult.error) : 'Unknown error';
      const errorInfo = errorService.external(`Inbox creation failed: ${errorMsg}`, { step: 'create-inbox-structure' });
      logErrorInfo(logger, 'error', 'Inbox creation failed', errorInfo);
      throw new Error(errorInfo.message);
    }


    const langUrl = encodeURIComponent(`lang/${analysis.language}`);
    const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
    const trainingUrl = `${API_ENDPOINTS.FRONTEND_MICROLEARNING_URL}/?courseId=${microlearningId}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;

    return {
      success: true,
      message: `🎉 New microlearning created successfully! Training URL: ${trainingUrl}`,
      data: inboxResult.data, // Return actual inbox content (emails, texts)
      metadata: {
        microlearningId,
        title: analysis.title,
        language: analysis.language,
        department: normalizedDept,
        trainingUrl,
        filesGenerated: [
          `${microlearningId}.json`,
          `${microlearningId}/${analysis.language}.json`,
          `inbox/${normalizedDept}/${analysis.language}.json`
        ]
      }
    };
  }
});

// Create Microlearning Workflow - With parallel language generation and inbox creation
// Step to extract inbox result from parallel results
export const saveToKVStep = createStep({
  id: 'save-to-kv',
  description: 'Extract inbox result from parallel execution',
  inputSchema: saveToKVInputSchema,
  outputSchema: microlearningFinalResultSchema, // Updated schema name
  execute: async ({ inputData }) => {
    const inboxResult = inputData['create-inbox-assignment'];
    const languageResult = inputData['generate-language-content'];
    const hasInbox = (languageResult as any).hasInbox !== false;

    // Now save to KV with both results available
    try {
      const kvService = new KVService();
      const { microlearningId, analysis, microlearningStructure } = languageResult;
      const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';

      try {
        await withRetry(
          () =>
            kvService.saveMicrolearning(
              microlearningId,
              {
                microlearning: microlearningStructure,
                languageContent: languageResult.data,
                inboxContent: hasInbox ? inboxResult.data : undefined
              },
              analysis.language,
              normalizedDept
            ),
          `KV save microlearning ${microlearningId}`
        );
        logger.info('Microlearning saved to KV successfully', { microlearningId });

        // Verify KV consistency after save
        const expectedKeys = buildExpectedKVKeys(
          microlearningId,
          analysis.language,
          hasInbox ? normalizedDept : undefined
        );
        await waitForKVConsistency(microlearningId, expectedKeys);
      } catch (saveError) {
        const err = normalizeError(saveError);
        logger.warn('KV save failed but continuing', { error: err.message, stack: err.stack, microlearningId });
      }
    } catch (error) {
      const err = normalizeError(error);
      logger.warn('KV initialization error', { error: err.message, stack: err.stack });
    }

    // Return only the inbox result from parallel execution
    return inboxResult;
  }
});

const createMicrolearningWorkflow = createWorkflow({
  id: 'create-microlearning-workflow',
  description: 'Create new microlearning with parallel language and inbox processing',
  // v1: Use step schema with resolved types for consistent type flow
  inputSchema: createStepInputSchema,
  outputSchema: microlearningFinalResultSchema,
})
  .then(analyzePromptStep)
  .then(generateMicrolearningStep)
  .parallel([createInboxStep, generateLanguageStep])
  .then(saveToKVStep)

// Commit workflow
// Workflow chain: analyze → generate → (language + inbox paralel)
createMicrolearningWorkflow.commit();

export { createMicrolearningWorkflow };