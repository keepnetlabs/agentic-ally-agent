import { z } from 'zod';
import { MODEL_PROVIDERS, TRAINING_LEVELS, DEFAULT_TRAINING_LEVEL, PRIORITY_LEVELS, DEFAULT_PRIORITY } from '../constants';
import { StreamWriterSchema } from '../types/stream-writer';

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
    writer: StreamWriterSchema.optional(),
    policyContext: z.string().optional().describe('Company policy context (prepared at workflow start)'),
});

export const promptAnalysisSchema = z.object({
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
        mustKeepDetails: z.array(z.string()).optional(),
        industries: z.array(z.string()).optional(),
        roles: z.array(z.string()).optional(),
        themeColor: z.string().optional(),
        additionalContext: z.string().optional(), // Added to carry context to next steps
    }),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
    writer: StreamWriterSchema.optional(),
    policyContext: z.string().optional(),
});

export const microlearningSchema = z.object({
    success: z.boolean(),
    data: z.any(), // Microlearning structure
    microlearningId: z.string(),
    analysis: z.any(),
    microlearningStructure: z.any(),
    hasInbox: z.boolean().optional(),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
    writer: StreamWriterSchema.optional(),
    policyContext: z.string().optional(),
});

export const microlearningLanguageContentSchema = z.object({
    success: z.boolean(),
    data: z.any(), // Language content
    microlearningId: z.string(),
    analysis: z.any(),
    microlearningStructure: z.any(),
    hasInbox: z.boolean().optional(),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
    writer: StreamWriterSchema.optional(),
    policyContext: z.string().optional(),
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
