import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { analyzeUserPromptTool } from '../tools/analysis';
import { generateMicrolearningJsonTool, generateLanguageJsonTool } from '../tools/generation';
import { createInboxStructureTool } from '../tools/inbox';
import { getModelWithOverride } from '../model-providers';
import { MicrolearningService } from '../services/microlearning-service';
import { KVService } from '../services/kv-service';
import { generateMicrolearningId, normalizeDepartmentName } from '../utils/language/language-utils';
import { MODEL_PROVIDERS, TRAINING_LEVELS, DEFAULT_TRAINING_LEVEL, PRIORITY_LEVELS, DEFAULT_PRIORITY } from '../constants';
import { StreamWriterSchema } from '../types/stream-writer';
import { getLogger } from '../utils/core/logger';
import { waitForKVConsistency, buildExpectedKVKeys } from '../utils/kv-consistency';
import { normalizeError } from '../utils/core/error-utils';

const logger = getLogger('CreateMicrolearningWorkflow');

// Input/Output Schemas
const createInputSchema = z.object({
  prompt: z.string().describe('User prompt in any language'),
  additionalContext: z.string().optional(),
  customRequirements: z.string().optional(),
  department: z.string().optional().default('All'),
  level: z.enum(TRAINING_LEVELS).optional().default(DEFAULT_TRAINING_LEVEL),
  priority: z.enum(PRIORITY_LEVELS).default(DEFAULT_PRIORITY),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider (OPENAI, WORKERS_AI, GOOGLE)'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
  writer: StreamWriterSchema.optional(),
});

const promptAnalysisSchema = z.object({
  success: z.boolean(),
  data: z.object({
    topic: z.string(),
    title: z.string(),
    language: z.string(),
    department: z.string(),
    level: z.string(),
    category: z.string(),
    subcategory: z.string().optional(),
    learningObjectives: z.array(z.string()),
    keyTopics: z.array(z.string()).optional(),
    practicalApplications: z.array(z.string()).optional(),
    industries: z.array(z.string()).optional(),
    roles: z.array(z.string()).optional(),
    themeColor: z.string().optional(),
    additionalContext: z.string().optional(), // Added to carry context to next steps
  }),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
  model: z.string().optional(),
  writer: StreamWriterSchema.optional(),
});

const microlearningSchema = z.object({
  success: z.boolean(),
  data: z.any(), // Microlearning structure
  microlearningId: z.string(),
  analysis: z.any(),
  microlearningStructure: z.any(),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
  model: z.string().optional(),
  writer: StreamWriterSchema.optional(),
});

const languageContentSchema = z.object({
  success: z.boolean(),
  data: z.any(), // Language content
  microlearningId: z.string(),
  analysis: z.any(),
  microlearningStructure: z.any(),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
  model: z.string().optional(),
  writer: StreamWriterSchema.optional(),
});

const finalResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any(), // Inbox content (emails, texts)
  metadata: z.object({
    microlearningId: z.string(),
    title: z.string(),
    language: z.string(),
    department: z.string(),
    trainingUrl: z.string(),
    filesGenerated: z.array(z.string()),
  }).optional()
});

// Step 1: Analyze Prompt
const analyzePromptStep = createStep({
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

    // Pass model provider, model, and writer to analyze step
    const analysisRes = await analyzeUserPromptTool.execute({
      userPrompt: inputData.prompt,
      additionalContext: inputData.additionalContext,
      suggestedDepartment: inputData.department,
      suggestedLevel: inputData.level,
      customRequirements: inputData.customRequirements,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      writer: inputData.writer,
    });

    if (!analysisRes?.success) throw new Error(`Prompt analysis failed: ${analysisRes?.error}`);
    logger.debug('Additional context received', { additionalContext: inputData.additionalContext });
    return {
      success: analysisRes.success,
      data: {
        ...analysisRes.data,
        additionalContext: inputData.additionalContext // Explicitly pass context to next steps
      },
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      writer: inputData.writer,
    };
  }
});

// Step 2: Generate Microlearning Structure
const generateMicrolearningStep = createStep({
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
      analysis, microlearningId, model
    });

    if (!genRes?.success) throw new Error(`Microlearning generation failed: ${genRes?.error}`);

    const microlearningService = new MicrolearningService();
    await microlearningService.storeMicrolearning(genRes.data);

    return {
      success: true,
      data: genRes.data,
      microlearningId,
      analysis,
      microlearningStructure: genRes.data,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
      writer: inputData.writer,
    } as any;
  }
});

// Step 3: Generate Language Content
const generateLanguageStep = createStep({
  id: 'generate-language-content',
  description: 'Generate language-specific training content',
  inputSchema: microlearningSchema,
  outputSchema: languageContentSchema,
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
      writer: inputData.writer
    });

    if (!result?.success) throw new Error(`Language content generation failed: ${result?.error}`);

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
    } as any;
  }
});

// Step 4: Create Inbox Assignment
const createInboxStep = createStep({
  id: 'create-inbox-assignment',
  description: 'Create inbox structure and finalize training',
  inputSchema: z.object({
    success: z.boolean(),
    data: z.any(), // language content
    microlearningId: z.string(),
    analysis: z.any(),
    microlearningStructure: z.any(),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
    writer: StreamWriterSchema.optional(),
  }),
  outputSchema: finalResultSchema,
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

    if (!inboxResult?.success) throw new Error(`Inbox creation failed: ${inboxResult?.error}`);


    const baseUrl = encodeURIComponent(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
    const langUrl = encodeURIComponent(`lang/${analysis.language}`);
    const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
    const trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;

    // Verify KV consistency before returning URL to UI
    const expectedKeys = buildExpectedKVKeys(microlearningId, analysis.language, normalizedDept);
    await waitForKVConsistency(microlearningId, expectedKeys);

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
const saveToKVStep = createStep({
  id: 'save-to-kv',
  description: 'Extract inbox result from parallel execution',
  inputSchema: z.object({
    'create-inbox-assignment': finalResultSchema,
    'generate-language-content': languageContentSchema
  }),
  outputSchema: finalResultSchema,
  execute: async ({ inputData }) => {
    const inboxResult = inputData['create-inbox-assignment'];
    const languageResult = inputData['generate-language-content'];

    // Now save to KV with both results available
    try {
      const kvService = new KVService();
      const { microlearningId, analysis, microlearningStructure } = languageResult;
      const normalizedDept = analysis.department ? normalizeDepartmentName(analysis.department) : 'all';

      try {
        await kvService.saveMicrolearning(
          microlearningId,
          {
            microlearning: microlearningStructure,
            languageContent: languageResult.data,
            inboxContent: inboxResult.data
          },
          analysis.language,
          normalizedDept
        );
        logger.info('Microlearning saved to KV successfully', { microlearningId });
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
  outputSchema: finalResultSchema,
})
  .then(analyzePromptStep)
  .then(generateMicrolearningStep)
  .parallel([createInboxStep, generateLanguageStep])
  .then(saveToKVStep)

// Commit workflow
// Workflow chain: analyze → generate → (language + inbox paralel)
createMicrolearningWorkflow.commit();

export { createMicrolearningWorkflow };