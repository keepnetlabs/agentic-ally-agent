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

export async function rewriteAppTexts(appTexts: any, context: RewriteContext): Promise<any> {
    const { sourceLanguage, targetLanguage, model, department } = context;
    const languageRules = getLanguagePrompt(targetLanguage);

    if (!appTexts || Object.keys(appTexts).length === 0) {
        return appTexts;
    }

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

Output only valid JSON.`;

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
