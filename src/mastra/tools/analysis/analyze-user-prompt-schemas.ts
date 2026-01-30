/**
 * Analyze User Prompt Tool – input and output schemas
 *
 * Input: userPrompt, additionalContext, suggestedDepartment, suggestedLevel, etc.
 * Output: success, data (language, topic, title, …), policyContext, error.
 */

import { z } from 'zod';
import {
  PROMPT_ANALYSIS,
  TRAINING_LEVELS,
  DEFAULT_TRAINING_LEVEL,
  MODEL_PROVIDERS,
} from '../../constants';

// Helper to convert null to undefined (LLM returns null but TypeScript expects undefined)
const nullToUndefined = <T>(schema: z.ZodType<T | null>) =>
  schema.transform(v => v ?? undefined);

export const AnalyzeUserPromptSchema = z.object({
  userPrompt: z
    .string()
    .min(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH, `Prompt must be at least ${PROMPT_ANALYSIS.MIN_PROMPT_LENGTH} characters`)
    .max(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH, `Prompt must not exceed ${PROMPT_ANALYSIS.MAX_PROMPT_LENGTH} characters`),
  additionalContext: z
    .string()
    .max(PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH, `Additional context must not exceed ${PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH} characters`)
    .optional(),
  suggestedDepartment: z
    .string()
    .max(PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH, `Department name must not exceed ${PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH} characters`)
    .optional(),
  suggestedLevel: z.enum(TRAINING_LEVELS).optional().default(DEFAULT_TRAINING_LEVEL),
  customRequirements: z
    .string()
    .max(PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH, `Custom requirements must not exceed ${PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH} characters`)
    .optional(),
  suggestedLanguage: z.string().optional().describe('Suggested target language (BCP-47)'),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
  policyContext: z
    .string()
    .max(PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH, `Policy context must not exceed ${PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH} characters`)
    .optional()
    .describe('Company policy context'),
});

export type AnalyzeUserPromptInput = z.infer<typeof AnalyzeUserPromptSchema>;

export const AnalyzeUserPromptOutputSchema = z.object({
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
    assessmentAreas: z.array(z.string()),
    regulationCompliance: nullToUndefined(z.array(z.string()).nullable()).optional(),
    themeColor: nullToUndefined(z.string().nullable()).optional(),
    hasRichContext: nullToUndefined(z.boolean().nullable()).optional(),
    additionalContext: nullToUndefined(z.string().nullable()).optional(),
    customRequirements: nullToUndefined(z.string().nullable()).optional(),
    isCodeTopic: nullToUndefined(z.boolean().nullable()).optional(),
    isVishing: nullToUndefined(z.boolean().nullable()).optional(),
    isSmishing: nullToUndefined(z.boolean().nullable()).optional(),
  }),
  policyContext: z.string().optional(),
  error: z.string().optional(),
});

export type AnalyzeUserPromptOutput = z.infer<typeof AnalyzeUserPromptOutputSchema>;
