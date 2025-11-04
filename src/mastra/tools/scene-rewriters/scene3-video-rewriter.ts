import { generateText } from 'ai';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { LOCALIZER_PARAMS } from '../../utils/llm-generation-params';

interface RewriteContext {
    sourceLanguage: string;
    targetLanguage: string;
    topic: string;
    model: any;
}

export async function rewriteScene3Video(scene: any, context: RewriteContext): Promise<any> {
    const { sourceLanguage, targetLanguage, topic, model } = context;

    const systemPrompt = `You are a ${targetLanguage} cybersecurity trainer creating video scene FROM SCRATCH.

IMPORTANT: You will see a JSON with video scene in ${sourceLanguage}. DO NOT translate it. Instead:
1. UNDERSTAND the message and purpose
2. REWRITE ALL text values in the JSON in native ${targetLanguage}
3. Think like a native ${targetLanguage} speaker

What to rewrite:
- ALL string values in the JSON (titles, descriptions, messages, etc.)

What NOT to change:
- JSON keys (keep "title", "subtitle", etc. as is)
- URLs, IDs, booleans, numbers
- Timestamps in transcript (00:00:00, 00:00:04, etc.)
- \\n line breaks in transcript

TRANSCRIPT SPECIAL RULE:
- Format: "00:00:00 text\\n00:00:04 text\\n..."
- Keep timestamps EXACTLY
- Only rewrite the TEXT after each timestamp

Rules:
- Keep JSON structure identical
- Rewrite all text content naturally as if writing from scratch
- Return only valid JSON`;

    const userPrompt = `Topic: ${topic}

Reference JSON (${sourceLanguage}) - understand, don't translate:
${JSON.stringify(scene, null, 2)}

Rewrite ALL text values in native ${targetLanguage}. Keep JSON structure, keys, timestamps.

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

        const cleaned = cleanResponse(response.text, 'scene3-video');
        const rewritten = JSON.parse(cleaned);

        return rewritten;
    } catch (error) {
        console.error('❌ Scene 3 (Video) rewrite failed:', error);
        throw error;
    }
}
