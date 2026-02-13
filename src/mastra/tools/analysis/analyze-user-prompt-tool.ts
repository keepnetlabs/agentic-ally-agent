import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { getModelWithOverride } from '../../model-providers';
import { PROMPT_ANALYSIS, TRAINING_LEVELS, DEFAULT_TRAINING_LEVEL, MODEL_PROVIDERS } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { analyzeUserPromptWithAI, getFallbackAnalysis } from './utils/prompt-analyzer';

const AnalyzeUserPromptSchema = z.object({
  userPrompt: z
    .string()
    .min(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH, `Prompt must be at least ${PROMPT_ANALYSIS.MIN_PROMPT_LENGTH} characters`)
    .max(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH, `Prompt must not exceed ${PROMPT_ANALYSIS.MAX_PROMPT_LENGTH} characters`),
  additionalContext: z
    .string()
    .max(
      PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH,
      `Additional context must not exceed ${PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH} characters`
    )
    .optional(),
  suggestedDepartment: z
    .string()
    .max(
      PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH,
      `Department name must not exceed ${PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH} characters`
    )
    .optional(),
  suggestedLevel: z.enum(TRAINING_LEVELS).optional().default(DEFAULT_TRAINING_LEVEL),
  customRequirements: z
    .string()
    .max(
      PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH,
      `Custom requirements must not exceed ${PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH} characters`
    )
    .optional(),
  suggestedLanguage: z.string().optional().describe('Suggested target language (BCP-47)'),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
  policyContext: z
    .string()
    .max(
      PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH,
      `Policy context must not exceed ${PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH} characters`
    )
    .optional()
    .describe('Company policy context'),
});

const AnalyzeUserPromptOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    language: z.string(),
    topic: z.string(),
    title: z.string(),
    department: z.string(),
    level: z.string(),
    category: z.string(),
    subcategory: z.string(),
    learningObjectives: z.array(z.string()),
    duration: z.number(),
    industries: z.array(z.string()),
    roles: z.array(z.string()),
    keyTopics: z.array(z.string()),
    practicalApplications: z.array(z.string()),
    mustKeepDetails: z.array(z.string()).optional(),
    assessmentAreas: z.array(z.string()),
    regulationCompliance: z.array(z.string()).optional(),
    themeColor: z.string().optional(),
    hasRichContext: z.boolean().optional(),
    additionalContext: z.string().optional(),
    customRequirements: z.string().optional(),
    isCodeTopic: z.boolean().optional(),
    isVishing: z.boolean().optional(),
    isSmishing: z.boolean().optional(),
  }),
  policyContext: z.string().optional(),
  error: z.string().optional(),
});

export const analyzeUserPromptTool = new Tool({
  id: 'analyze_user_prompt',
  description: 'AI-powered analysis of user prompt with rich context processing and semantic hints',
  inputSchema: AnalyzeUserPromptSchema,
  outputSchema: AnalyzeUserPromptOutputSchema,
  execute: async (context: any) => {
    const logger = getLogger('AnalyzeUserPromptTool');
    const input = context?.inputData || context?.input || context;
    const {
      userPrompt,
      additionalContext,
      suggestedDepartment,
      customRequirements,
      modelProvider,
      model: modelOverride,
      policyContext,
      suggestedLevel,
      suggestedLanguage,
    } = input;
    const writer = input?.writer; // Get writer for streaming

    const model = getModelWithOverride(modelProvider, modelOverride);

    logger.debug('Starting user prompt analysis', { promptLength: userPrompt.length, hasContext: !!additionalContext });

    try {
      return await analyzeUserPromptWithAI({
        userPrompt,
        additionalContext,
        suggestedDepartment,
        suggestedLevel,
        customRequirements,
        suggestedLanguage,
        policyContext,
        model,
        writer,
      });
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        userPrompt: userPrompt?.substring(0, 100),
        step: 'prompt-analysis',
        stack: err.stack,
      });
      logErrorInfo(logger, 'error', 'Prompt analysis failed, using fallback', errorInfo);

      const fallbackData = await getFallbackAnalysis({
        userPrompt,
        suggestedDepartment,
        additionalContext,
        customRequirements,
        model,
      });

      return {
        success: true,
        data: fallbackData,
        policyContext,
        error: JSON.stringify(errorInfo),
      };
    }
  },
});

export type AnalyzeUserPromptInput = z.infer<typeof AnalyzeUserPromptSchema>;
export type AnalyzeUserPromptOutput = z.infer<typeof AnalyzeUserPromptOutputSchema>;
