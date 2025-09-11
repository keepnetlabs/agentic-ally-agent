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
        console.log('🔍 Translation tool context:', JSON.stringify(context, null, 2));
        const { json, targetLanguage, doNotTranslateKeys = [] } = context as z.infer<typeof TranslateJsonInputSchema>;
        
        // Always add scene_type to protected keys
        const protectedKeys = [...doNotTranslateKeys, 'scene_type'];
        console.log('🔒 Protected keys:', protectedKeys);
        console.log('🔍 Extracted values:', { targetLanguage, jsonKeys: Object.keys(json || {}), doNotTranslateKeys });

        const system = `You are a localization engine. CRITICAL: Return ONLY valid JSON, no explanations, no markdown, no text before or after.

Task: localize only string values in the provided JSON to ${targetLanguage}. 
CRITICAL:
Always perform full localization, not direct translation.
- Localization must adapt:
  - Tone (professional, culture-appropriate)
  - Expressions (avoid literal phrases that sound rude, childish, or awkward)
  - Examples (use region/industry-relevant ones)
- Always check if common expressions in one language need cultural adaptation in the target

Rules:
- Do not change keys, IDs, numbers, booleans, arrays structure, object structure
- Do not translate iconName, id, ids, url, src, scene_type or keys listed in doNotTranslateKeys
- CRITICAL: NEVER translate scene_type values - they must remain exactly: intro, goal, scenario, actionable_content, quiz, survey, nudge, summary
- scene_type values are system constants and must stay in English
- Return EXACTLY the same JSON structure with translated string values
- NEVER add explanations or comments
- NEVER wrap in markdown \`\`\`json blocks
- Start response immediately with { and end with }`;

        const user = `doNotTranslateKeys: ${JSON.stringify(protectedKeys)}\n\nJSON:\n${JSON.stringify(json)}`;

        let res;
        try {
            console.log('🤖 Calling AI with system prompt length:', system.length);
            console.log('🤖 User prompt preview:', user.substring(0, 300) + '...');
            const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_NANO);
            console.log('🤖 Using model:', model);
            res = await generateText({
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ]
            });
            console.log('🤖 AI Response received, length:', res?.text?.length);
            const text = res.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
            console.log('🧹 Cleaned AI response preview:', text.substring(0, 500) + '...');
            const translated = JSON.parse(text);
            console.log('✅ Successfully parsed JSON, keys:', Object.keys(translated || {}));
            return { success: true, data: translated };
        } catch (error) {
            console.error('❌ Translation failed:', error);
            console.error('❌ Full AI response text:', res?.text);
            console.error('❌ Parsed text attempt:', res?.text?.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, ''));
            return { success: false, error: `Translation failed: ${error}`, data: json };
        }
    }
});
