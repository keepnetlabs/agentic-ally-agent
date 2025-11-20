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

export async function rewriteScene4Actionable(scene: any, context: RewriteContext): Promise<any> {
    const { sourceLanguage, targetLanguage, topic, model, department } = context;
    const languageRules = getLanguagePrompt(targetLanguage);

    const systemPrompt = `You are a native ${targetLanguage} cybersecurity trainer specializing in *semantic localization* of microlearning content.

=== CRITICAL: NOT TRANSLATION, NOT SUMMARY ===

You are NOT:
- translating word-by-word (robotically)
- summarizing or shortening the content
- adding your own generic cybersecurity advice

You MUST:
- keep ALL information, details, specific examples, and scenarios from the source
- keep roughly the same length and level of detail
- ONLY adapt the *phrasing* and *tone* for the ${targetLanguage} workplace context

=== PROCESS: UNDERSTAND → MAP → REWRITE ===

1. Understand the specific lesson/risk in ${sourceLanguage}

2. Map that meaning to natural, professional ${targetLanguage} norms

3. Rewrite it as if a native expert wrote it originally in ${targetLanguage} (re-authoring, NOT summarizing)

=== PRESERVE CONTENT & LOGICAL FLOW ===

- Do NOT add new risks or remove existing details
- Do NOT change the logical flow (Idea A → Idea B → Conclusion)

=== UI/UX CONSTRAINTS (CRITICAL) ===

- Keep the exact same number of list items (If source has 3 bullets, output must have 3 bullets).
- Keep similar visual text length (do not make it much shorter or 3x longer).
- Preserve JSON structure, IDs, URLs, booleans, numbers, scene_type.
- Preserve inline formatting (keep **bold** emphasis, line breaks, etc.).

=== STYLE: NATIVE PROFESSIONAL ===

- Tone: professional, engaging, and direct (microlearning / instructional design).
- Context: ${topic} for ${department || 'General'} employees.
- Scene Type: Actionable Content - Make actions practical and clear.
- Grammar: use natural ${targetLanguage} sentence structures, NOT the source language's grammar.

=== AVOID (THE "TRANSLATIONESE" TRAP) ===

❌ Literal translations of idioms.
❌ Keeping the source language's sentence rhythm (Subject-Verb order mirroring).
❌ Using passive voice if active voice is more natural in ${targetLanguage}.

${languageRules}

=== OUTPUT FORMAT (STRICT) ===

- Output only valid JSON.
- Keys must remain exactly the same.
- Do NOT add or remove any fields.
- Only text values change.
- No conversational filler ("Here is the JSON...", explanations, comments).

FINAL CHECK (MENTAL):

- Did I keep all original technical and scenario details?
- Does every sentence sound like it was naturally written in ${targetLanguage}, not translated?`;

    const userPrompt = `Topic: ${topic}

=== RAW CONTENT CONCEPTS (Source) ===

${JSON.stringify(scene, null, 2)}

INSTRUCTION: Re-author the content above into native ${targetLanguage}.

Focus on natural flow while keeping all technical details and UI structure exactly as is.

Output (JSON only):`;

    try {
        const response = await generateText({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            ...LOCALIZER_PARAMS,
            temperature: 0.4,
        });

        const cleaned = cleanResponse(response.text, 'scene4-actionable');
        const rewritten = JSON.parse(cleaned);

        return rewritten;
    } catch (error) {
        console.error('❌ Scene 4 (Actionable) rewrite failed:', error);
        throw error;
    }
}
