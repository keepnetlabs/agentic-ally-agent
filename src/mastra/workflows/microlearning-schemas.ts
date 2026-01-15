import { z } from 'zod';

export const updatesSchema = z.object({
    theme: z.object({
        fontFamily: z.object({
            primary: z.string().optional(),
            secondary: z.string().optional(),
            monospace: z.string().optional()
        }).optional(),
        colors: z.object({
            background: z.string().optional()
        }).optional(),
        logo: z.object({
            src: z.string().optional().describe('Must be a full URL (http/s) or left empty. Do not provide filenames like logo.png'),
            darkSrc: z.string().optional(),
            minimizedSrc: z.string().optional(),
            minimizedDarkSrc: z.string().optional(),
            alt: z.string().optional()
        }).optional()
    }).optional(),
    useWhitelabelLogo: z.boolean().optional(),
    brandName: z.string().optional()
});

export const updateInputSchema = z.object({
    microlearningId: z.string().describe('ID of existing microlearning to update'),
    department: z.string().optional().default('All').describe('Department for context'),
    updates: updatesSchema.describe('Updates to apply'),
    modelProvider: z.string().optional().describe('Model provider override (OPENAI, WORKERS_AI, GOOGLE)'),
    model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
});

export const updateOutputSchema = z.object({
    success: z.boolean(),
    status: z.string(),
    metadata: z
        .object({
            microlearningId: z.string(),
            version: z.number(),
            changes: z.record(z.any()).optional(),
            trainingUrl: z.string().optional(),
            timestamp: z.string(),
        })
        .optional(),
    error: z.string().optional(),
});
