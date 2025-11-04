import { generateText } from 'ai';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { LOCALIZER_PARAMS } from '../../utils/llm-generation-params';

interface RewriteContext {
    sourceLanguage: string;
    targetLanguage: string;
    topic: string;
    model: any;
}

export async function rewriteAppTexts(appTexts: any, context: RewriteContext): Promise<any> {
    const { sourceLanguage, targetLanguage, model } = context;

    if (!appTexts || Object.keys(appTexts).length === 0) {
        return appTexts;
    }

    const systemPrompt = `You are a ${targetLanguage} UI/UX writer creating app interface FROM SCRATCH.

IMPORTANT: You will see a JSON in ${sourceLanguage}. DO NOT translate it. Instead:
1. UNDERSTAND the message and purpose
2. REWRITE ALL text values in the JSON in native ${targetLanguage}
3. Think like a native ${targetLanguage} app designer

What to rewrite:
- ALL string values in the JSON

What NOT to change:
- JSON keys
- URLs, IDs, booleans, numbers

Rules:
- Keep JSON structure identical
- Rewrite all text naturally - concise and action-oriented
- Return only valid JSON`;

    const userPrompt = `Reference JSON (${sourceLanguage}) - understand, don't translate:
${JSON.stringify(appTexts, null, 2)}

Rewrite ALL text values in native ${targetLanguage}. Use common UI patterns.

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

        const cleaned = cleanResponse(response.text, 'app-texts');
        const rewritten = JSON.parse(cleaned);

        return rewritten;
    } catch (error) {
        console.error('❌ App Texts rewrite failed:', error);
        throw error;
    }
}
