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
  createInputSchema,
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
  inputSchema: createInputSchema,
  outputSchema: promptAnalysisSchema,
  execute: async ({ inputData }) => {
    if (!inputData.prompt || inputData.prompt.trim() === '') {
      throw new Error('Missing prompt for new microlearning generation');
    }

    if (!analyzeUserPromptTool.execute) {
      throw new Error('Analyze user prompt tool is not executable');
    }

    // Pass model provider, model, writer, and policy context to analyze step
    const analysisRes = await analyzeUserPromptTool.execute({
      userPrompt: inputData.prompt,
      additionalContext: inputData.additionalContext,
      suggestedDepartment: inputData.department,
      suggestedLevel: inputData.level,
      customRequirements: inputData.customRequirements,
      suggestedLanguage: inputData.language,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      writer: inputData.writer,
      policyContext: inputData.policyContext,
    });

    if (!analysisRes?.success) {
      const errorInfo = errorService.external(`Prompt analysis failed: ${analysisRes?.error}`, { step: 'analyze-user-prompt' });
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

    const genRes = await generateMicrolearningJsonTool.execute({
      analysis, microlearningId, model, policyContext: inputData.policyContext
    });

    if (!genRes?.success) {
      const errorInfo = errorService.external(`Microlearning generation failed: ${genRes?.error}`, { step: 'generate-microlearning-json' });
      // Cast to any to allow extra context properties
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

    return {
      success: true,
      data: enrichedMicrolearning,
      microlearningId,
      analysis,
      microlearningStructure: enrichedMicrolearning,
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

    const result = await generateLanguageJsonTool.execute({
      analysis,
      microlearning: microlearningStructure,
      model,
      writer: inputData.writer,
      policyContext: inputData.policyContext
    });

    if (!result?.success) {
      const errorInfo = errorService.external(`Language content generation failed: ${result?.error}`, { step: 'generate-language-json' });
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

    const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';

    if (!createInboxStructureTool.execute) {
      throw new Error('Create inbox structure tool is not executable');
    }

    const inboxResult = await createInboxStructureTool.execute({
      department: normalizedDept,
      languageCode: analysis.language,
      microlearningId,
      microlearning: microlearningStructure,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      additionalContext: analysis.additionalContext // Pass user context to inbox generation
    })

    if (!inboxResult?.success) {
      const errorInfo = errorService.external(`Inbox creation failed: ${inboxResult?.error}`, { step: 'create-inbox-structure' });
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
                inboxContent: inboxResult.data
              },
              analysis.language,
              normalizedDept
            ),
          `KV save microlearning ${microlearningId}`
        );
        logger.info('Microlearning saved to KV successfully', { microlearningId });

        // Verify KV consistency after save
        const expectedKeys = buildExpectedKVKeys(microlearningId, analysis.language, normalizedDept);
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
  inputSchema: createInputSchema,
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