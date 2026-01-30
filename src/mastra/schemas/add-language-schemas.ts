
import { z } from 'zod';
import { LanguageCodeSchema } from '../utils/validation/language-validation';
import { MODEL_PROVIDERS, LANGUAGE } from '../constants';

// --- Add Language Workflow Schemas ---

export const addLanguageInputSchema = z.object({
    existingMicrolearningId: z.string().min(1, 'Microlearning ID is required').describe('ID of existing microlearning'),
    targetLanguage: LanguageCodeSchema.describe('Target language code in BCP-47 format (e.g., tr-TR, de-DE, fr-FR, ja-JP, ko-KR, zh-CN, fr-CA)'),
    sourceLanguage: LanguageCodeSchema.optional().describe('Source language code in BCP-47 format (e.g., en-GB, tr-TR). If not provided, auto-detected from microlearning metadata'),
    department: z.string().optional().default(LANGUAGE.DEFAULT_DEPARTMENT),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider (OPENAI, WORKERS_AI, GOOGLE)'),
    model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
});

/**
 * v1 Migration: Step input schema with resolved types (defaults applied)
 * Use this for step inputSchema to match workflow's output type
 */
export type AddLanguageInput = z.output<typeof addLanguageInputSchema>;
export const addLanguageStepInputSchema = addLanguageInputSchema as z.ZodType<AddLanguageInput>;

export const existingContentSchema = z.object({
    success: z.boolean(),
    data: z.any(), // existing microlearning
    microlearningId: z.string(),
    analysis: z.any(), // minimal analysis for target language
    sourceLanguage: z.string(), // source language to translate from
    targetLanguage: z.string(), // target language for parallel steps
    department: z.string(), // department for parallel steps
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(), // model provider override
    model: z.string().optional(), // model override
    hasInbox: z.boolean(), // whether inbox is needed (false for code_review type)
});

export const languageContentSchema = z.object({
    success: z.boolean(),
    data: z.any(), // translated language content
    microlearningId: z.string(),
    analysis: z.any(),
    microlearningStructure: z.any(),
    hasInbox: z.boolean(), // pass through from previous step
});

export const updateInboxSchema = z.object({
    success: z.boolean(),
    microlearningId: z.string(),
    usedDepartment: z.string().optional(),
    filesGenerated: z.array(z.string()).optional(),
});

export const combineInputSchema = z.object({
    'translate-language-content': languageContentSchema,
    'update-inbox': updateInboxSchema,
});

export const finalResultSchema = z.object({
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

// --- Add Multiple Languages Workflow Schemas ---

export const addMultipleLanguagesInputSchema = z.object({
    existingMicrolearningId: z.string().describe('ID of existing microlearning'),
    targetLanguages: z.array(z.string()).min(1).describe('Array of target languages'),
    sourceLanguage: z.string().optional().describe('Source language code (optional)'),
    department: z.string().optional().default('All').describe('Target department'),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider override'),
    model: z.string().optional().describe('Model name override'),
});

export const finalMultiLanguageResultSchema = z.object({
    success: z.boolean(),
    successCount: z.number(),
    failureCount: z.number(),
    totalDuration: z.string(),
    languages: z.array(z.string()),
    results: z.array(z.object({
        language: z.string(),
        success: z.boolean(),
        trainingUrl: z.string().optional(),
        title: z.string().optional(),
        error: z.string().optional(),
        duration: z.number().optional(),
    })),
    status: z.enum(['success', 'partial', 'failed']),
});
