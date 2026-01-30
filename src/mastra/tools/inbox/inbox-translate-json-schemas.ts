/**
 * Inbox Translate JSON Tool – input and output schemas
 *
 * Input: json, sourceLanguage, targetLanguage, topic, doNotTranslateKeys, modelProvider, model.
 * Output: success, data, error.
 */

import { z } from 'zod';
import { MODEL_PROVIDERS } from '../../constants';
import { LanguageCodeSchema, validateLanguagesDifferent } from '../../utils/validation/language-validation';

// Internal schema with full validation
const InboxTranslateInputSchemaInternal = z
    .object({
        json: z.any(),
        sourceLanguage: LanguageCodeSchema.optional().default('en-gb'),
        targetLanguage: LanguageCodeSchema,
        topic: z.string().optional(),
        doNotTranslateKeys: z.array(z.string()).optional(),
        modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
        model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
    })
    .refine(
        (data) => validateLanguagesDifferent(data.sourceLanguage, data.targetLanguage),
        {
            message: 'Source and target languages must be different',
            path: ['targetLanguage'],
        }
    );

// Export with type assertion for Mastra v1 compatibility
// The .refine() and .default() cause ZodEffects which needs casting
export type InboxTranslateInput = z.output<typeof InboxTranslateInputSchemaInternal>;
export const InboxTranslateInputSchema = InboxTranslateInputSchemaInternal as z.ZodType<InboxTranslateInput>;

export const InboxTranslateOutputSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional(),
});
