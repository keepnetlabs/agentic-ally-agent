import { generateText } from 'ai';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { LOCALIZER_PARAMS } from '../../utils/llm-generation-params';
import { getLanguagePrompt } from '../../utils/localization-language-rules';

interface RewriteContext {
    sourceLanguage: string;
    targetLanguage: string;
    topic: string;
    model: any;
    department?: string;
}

export async function rewriteScene3Video(scene: any, context: RewriteContext): Promise<any> {
    const { sourceLanguage, targetLanguage, topic, model, department } = context;
    const languageRules = getLanguagePrompt(targetLanguage);

    const systemPrompt = `You are a ${targetLanguage} cybersecurity trainer.

You will see a JSON in ${sourceLanguage}. DO NOT translate it. Instead:
1. UNDERSTAND the message and purpose
2. REWRITE ALL text values in natural ${targetLanguage}
   - Write as if for workplace professionals (not students or children)
   - Use ${targetLanguage} workplace conventions and norms
   - Consider ${department || 'General'} context

Avoid common mistakes:
- Literal word-for-word mapping from source language
- Mixing English phrases into ${targetLanguage}
- Keeping phrasing patterns from source language

Before output:
- Verify all text is natural ${targetLanguage} (no English except technical terms)
- Check tone matches workplace professional
- If any text feels "translated", rewrite from scratch

3. Keep JSON structure identical
${languageRules}

What NOT to change:
- JSON keys, URLs, IDs, booleans, numbers
- Timestamps in transcript (00:00:00, 00:00:04, etc.)
- \\n line breaks in transcript

Output only valid JSON.`;

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
