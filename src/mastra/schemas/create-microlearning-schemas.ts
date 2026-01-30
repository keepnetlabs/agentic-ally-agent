import { z } from 'zod';
import { MODEL_PROVIDERS, TRAINING_LEVELS, DEFAULT_TRAINING_LEVEL, PRIORITY_LEVELS, DEFAULT_PRIORITY } from '../constants';

export const createInputSchema = z.object({
    prompt: z.string().describe('User prompt in any language'),
    additionalContext: z.string().optional(),
    customRequirements: z.string().optional(),
    department: z.string().optional().default('All'),
    level: z.enum(TRAINING_LEVELS).optional().default(DEFAULT_TRAINING_LEVEL),
    priority: z.enum(PRIORITY_LEVELS).default(DEFAULT_PRIORITY),
    language: z.string().optional().describe('Target language code (BCP-47)'),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider (OPENAI, WORKERS_AI, GOOGLE)'),
    model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
    // Note: writer is passed via requestContext to bypass Zod validation
    policyContext: z.string().optional().describe('Company policy context (prepared at workflow start)'),
});

/**
 * v1 Migration: Step input schema with resolved types (defaults applied)
 * Use this for step inputSchema to match workflow's output type
 */
export type CreateMicrolearningInput = z.output<typeof createInputSchema>;
export const createStepInputSchema = createInputSchema as z.ZodType<CreateMicrolearningInput>;

// Helper to convert null to undefined (LLM returns null but TypeScript expects undefined)
const nullToUndefined = <T>(schema: z.ZodType<T | null>) =>
    schema.transform(v => v ?? undefined);

export const promptAnalysisSchema = z.object({
    success: z.boolean(),
    data: z.object({
        topic: z.string(),
        title: z.string(),
        language: z.string(),
        department: z.string(),
        level: z.string(),
        category: z.string(),
        subcategory: nullToUndefined(z.string().nullable()).optional(),
        learningObjectives: z.array(z.string()),
        keyTopics: nullToUndefined(z.array(z.string()).nullable()).optional(),
        practicalApplications: nullToUndefined(z.array(z.string()).nullable()).optional(),
        industries: nullToUndefined(z.array(z.string()).nullable()).optional(),
        roles: nullToUndefined(z.array(z.string()).nullable()).optional(),
        themeColor: nullToUndefined(z.string().nullable()).optional(),
        additionalContext: nullToUndefined(z.string().nullable()).optional(),
    }),
    modelProvider: nullToUndefined(z.enum(MODEL_PROVIDERS.NAMES).nullable()).optional(),
    model: nullToUndefined(z.string().nullable()).optional(),
    // Note: writer removed from output - use getInitData() to get original writer
    policyContext: nullToUndefined(z.string().nullable()).optional(),
});

export const microlearningSchema = z.object({
    success: z.boolean(),
    data: z.any(), // Microlearning structure
    microlearningId: z.string(),
    analysis: z.any(),
    microlearningStructure: z.any(),
    hasInbox: nullToUndefined(z.boolean().nullable()).optional(),
    modelProvider: nullToUndefined(z.enum(MODEL_PROVIDERS.NAMES).nullable()).optional(),
    model: nullToUndefined(z.string().nullable()).optional(),
    // Note: writer removed from output - use getInitData() to get original writer
    policyContext: nullToUndefined(z.string().nullable()).optional(),
});

export const microlearningLanguageContentSchema = z.object({
    success: z.boolean(),
    data: z.any(), // Language content
    microlearningId: z.string(),
    analysis: z.any(),
    microlearningStructure: z.any(),
    hasInbox: nullToUndefined(z.boolean().nullable()).optional(),
    modelProvider: nullToUndefined(z.enum(MODEL_PROVIDERS.NAMES).nullable()).optional(),
    model: nullToUndefined(z.string().nullable()).optional(),
    // Note: writer removed from output - use getInitData() to get original writer
    policyContext: nullToUndefined(z.string().nullable()).optional(),
});

export const microlearningFinalResultSchema = z.object({
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

export const saveToKVInputSchema = z.object({
    'create-inbox-assignment': microlearningFinalResultSchema,
    'generate-language-content': microlearningLanguageContentSchema
});
