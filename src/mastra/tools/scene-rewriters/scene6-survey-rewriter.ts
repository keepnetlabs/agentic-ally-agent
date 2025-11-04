import { generateText } from 'ai';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { LOCALIZER_PARAMS } from '../../utils/llm-generation-params';

interface RewriteContext {
    sourceLanguage: string;
    targetLanguage: string;
    topic: string;
    model: any;
}

export async function rewriteScene6Survey(scene: any, context: RewriteContext): Promise<any> {
    const { sourceLanguage, targetLanguage, topic, model } = context;

    const systemPrompt = `You are a ${targetLanguage} training feedback specialist creating survey FROM SCRATCH.

IMPORTANT: You will see a JSON in ${sourceLanguage}. DO NOT translate it. Instead:
1. UNDERSTAND the message and purpose
2. REWRITE ALL text values in the JSON in native ${targetLanguage}
3. Think like a native ${targetLanguage} survey designer

What to rewrite:
- ALL string values in the JSON

What NOT to change:
- JSON keys
- URLs, IDs, booleans, numbers, scene_type

Rules:
- Keep JSON structure identical
- Rewrite all text naturally - neutral and clear
- Return only valid JSON`;

    const userPrompt = `Topic: ${topic}

Reference JSON (${sourceLanguage}) - understand, don't translate:
${JSON.stringify(scene, null, 2)}

Rewrite ALL text values in native ${targetLanguage}. Make questions neutral and clear.

Output (JSON only):`;

    try {
        const response = await generateText({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            ...LOCALIZER_PARAMS,
        });

        const cleaned = cleanResponse(response.text, 'scene6-survey');
        const rewritten = JSON.parse(cleaned);

        return rewritten;
    } catch (error) {
        console.error('❌ Scene 6 (Survey) rewrite failed:', error);
        throw error;
    }
}
