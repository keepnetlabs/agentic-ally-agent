/**
 * Translate Language JSON Tool – input and output schemas
 *
 * Input: json, microlearningStructure, sourceLanguage, targetLanguage, topic, etc.
 * Output: success, data, error.
 */

import { z } from 'zod';
import { MODEL_PROVIDERS } from '../../constants';
import { LanguageCodeSchema, validateLanguagesDifferent } from '../../utils/validation/language-validation';

export const TranslateJsonInputSchema = z
    .object({
        json: z.any(),
        microlearningStructure: z.any().describe('Base microlearning structure with scenes metadata'),
        sourceLanguage: LanguageCodeSchema.optional().default('en-gb'),
        targetLanguage: LanguageCodeSchema,
        topic: z
            .string()
            .max(500, 'Topic must not exceed 500 characters')
            .optional(),
        doNotTranslateKeys: z.array(z.string()).optional(),
        modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
        model: z
            .string()
            .max(100, 'Model name must not exceed 100 characters')
            .optional()
            .describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
    })
    .refine(
        (data) => validateLanguagesDifferent(data.sourceLanguage, data.targetLanguage),
        {
            message: 'Source and target languages must be different',
            path: ['targetLanguage'],
        }
    );

export type TranslateJsonInput = z.infer<typeof TranslateJsonInputSchema>;

export const TranslateJsonOutputSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional(),
});
