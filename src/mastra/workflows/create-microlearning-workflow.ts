import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { analyzeUserPromptTool } from '../tools/analyze-user-prompt-tool';
import { generateMicrolearningJsonTool } from '../tools/generate-microlearning-json-tool';
import { generateLanguageJsonTool } from '../tools/generate-language-json-tool';
import { createInboxStructureTool } from '../tools/create-inbox-structure-tool';
import { getModelWithOverride } from '../model-providers';
import { MicrolearningService } from '../services/microlearning-service';
import { KVService } from '../services/kv-service';
import { generateMicrolearningId, normalizeDepartmentName } from '../utils/language-utils';

// Input/Output Schemas
const createInputSchema = z.object({
  prompt: z.string().describe('User prompt in any language'),
  additionalContext: z.string().optional(),
  customRequirements: z.string().optional(),
  department: z.string().optional().default('All'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional().default('Intermediate'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional().describe('Model provider (OPENAI, WORKERS_AI, GOOGLE)'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
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
  }),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional(),
  model: z.string().optional(),
});

const microlearningSchema = z.object({
  success: z.boolean(),
  data: z.any(), // Microlearning structure
  microlearningId: z.string(),
  analysis: z.any(),
  microlearningStructure: z.any(),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional(),
  model: z.string().optional(),
});

const languageContentSchema = z.object({
  success: z.boolean(),
  data: z.any(), // Language content
  microlearningId: z.string(),
  analysis: z.any(),
  microlearningStructure: z.any(),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional(),
  model: z.string().optional(),
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

    // Pass model provider and model to analyze step
    const analysisRes = await analyzeUserPromptTool.execute({
      userPrompt: inputData.prompt,
      additionalContext: inputData.additionalContext,
      suggestedDepartment: inputData.department,
      suggestedLevel: inputData.level,
      customRequirements: inputData.customRequirements,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
    });

    if (!analysisRes?.success) throw new Error(`Prompt analysis failed: ${analysisRes?.error}`);

    return {
      success: analysisRes.success,
      data: analysisRes.data,
      modelProvider: inputData.modelProvider,
      model: inputData.model,
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
    console.log('🔍 Generating microlearning structure for:', analysis);
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
      model
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
    modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional(),
    model: z.string().optional(),
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
      model: inputData.model
    })

    if (!inboxResult?.success) throw new Error(`Inbox creation failed: ${inboxResult?.error}`);


    const baseUrl = encodeURIComponent(`https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning/${microlearningId}`);
    const langUrl = encodeURIComponent(`lang/${analysis.language}`);
    const inboxUrl = encodeURIComponent(`inbox/${normalizedDept}`);
    const trainingUrl = `https://microlearning.pages.dev/?baseUrl=${baseUrl}&langUrl=${langUrl}&inboxUrl=${inboxUrl}&isEditMode=true`;

    // Wait 5 seconds to ensure Cloudflare KV data is consistent before returning URL to UI
    console.log('⏳ Waiting 5 seconds for Cloudflare KV consistency...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ KV consistency check complete, returning training URL');

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

      // Fire and forget for better performance - don't wait for KV save
      kvService.saveMicrolearning(
        microlearningId,
        {
          microlearning: microlearningStructure,
          languageContent: languageResult.data,
          inboxContent: inboxResult.data
        },
        analysis.language,
        normalizedDept
      ).catch((error) => {
        console.error('KV save failed:', error);
      });
    } catch (error) {
      console.warn('KV initialization error:', error);
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