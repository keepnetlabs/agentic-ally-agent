import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModel, Model, ModelProvider } from '../model-providers';

const TranslateJsonInputSchema = z.object({
    json: z.any(),
    targetLanguage: z.string(),
    doNotTranslateKeys: z.array(z.string()).optional(),
});

const TranslateJsonOutputSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional()
});

export const translateLanguageJsonTool = new Tool({
    id: 'translate_language_json',
    description: 'Translate only string values in a JSON while preserving structure, keys and non-string types',
    inputSchema: TranslateJsonInputSchema,
    outputSchema: TranslateJsonOutputSchema,
    execute: async (context: any) => {
        const input = context?.inputData || context?.input || context;
        const { json, targetLanguage, doNotTranslateKeys = [] } = input as z.infer<typeof TranslateJsonInputSchema>;

        const system = `You are a localization engine. CRITICAL: Return ONLY valid JSON, no explanations, no markdown, no text before or after.

Task: translate only string values in the provided JSON to ${targetLanguage}. 

Rules:
- Do not change keys, IDs, numbers, booleans, arrays structure, object structure
- Do not translate iconName, id, ids, url, src or keys listed in doNotTranslateKeys
- Return EXACTLY the same JSON structure with translated string values
- NEVER add explanations or comments
- NEVER wrap in markdown \`\`\`json blocks
- Start response immediately with { and end with }`;

        const user = `doNotTranslateKeys: ${JSON.stringify(doNotTranslateKeys)}\n\nJSON:\n${JSON.stringify(json)}`;

        let res;
        try {
            const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_NANO);
            res = await generateText({
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ]
            });
            const text = res.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
            const translated = JSON.parse(text);
            return { success: true, data: translated };
        } catch (error) {
            console.error('Translation failed:', error);
            console.error('AI response text:', res?.text?.substring(0, 500) + '...');
            return { success: false, error: `Translation failed: ${error}`, data: json };
        }
    }
});
