import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModel, Model, ModelProvider } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';


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
        const { json, targetLanguage, doNotTranslateKeys = [] } = context as z.infer<typeof TranslateJsonInputSchema>;

        // Always add scene_type to protected keys
        const protectedKeys = [...doNotTranslateKeys, 'scene_type'];
        console.log('🔒 Protected keys:', protectedKeys);
        console.log('🔍 Extracted values:', { targetLanguage, jsonKeys: Object.keys(json || {}), doNotTranslateKeys });

        const system = `
            You are a localization engine. CRITICAL: Return ONLY valid JSON, no explanations, no markdown, no text before or after.

            Task: Localize ONLY string values in the provided JSON to ${targetLanguage}. Output must read as if it were originally authored by a native professional instructional designer in ${targetLanguage}.

            🔒 ABSOLUTE REQUIREMENTS (FAILURE = REJECTED):
            - NEVER add, remove, or rename ANY keys in the JSON structure
            - NEVER change the data types of any values (string stays string, number stays number, etc.)
            - NEVER alter the nested structure or object hierarchy
            - NEVER change array lengths or positions
            - Output JSON must have IDENTICAL keys at ALL levels compared to input JSON
            - If input has key "emailReportedMessage", output must have exactly "emailReportedMessage" (not "emailReportedMessage_localized" or any variation)

            Localization Principles:
            - Perform full localization (not literal translation). Rewrite expressions in the way a native speaker would phrase them in professional training.
            - Titles and headings must read like authentic course names in ${targetLanguage}, not word-for-word renderings. Prefer concise, idiomatic forms.
            - Ensure natural flow, idiomatic word choice, and culturally appropriate phrasing. Avoid English word order if it feels unnatural in ${targetLanguage}.
            - Match the original formality level (T/V, professional vs casual). Maintain consistent terminology throughout.
            - Keep UI copy concise; when no explicit limits are given, keep length within ±20% of the source while preserving meaning.
            - Prohibit literal-sounding, machine-like phrasing. Output must feel like professionally written native training content.
            - The localized output must read as if the training was originally authored in ${targetLanguage}, not translated. Prioritize natural instructional style over literal fidelity.

            🚫 Do NOT localize these values:
            - Keys, IDs, numbers, booleans, arrays, or object structure
            - Values of keys listed in doNotLocalizeKeys: ${JSON.stringify(protectedKeys)}
            - Values of keys matching this regex (case-insensitive): ^(icon(Name)?|id(s)?|url|src|scene_type|type|difficulty)$
            - Any placeholders/tokens: {name}, {{variable}}, %s, %d, $amount, :emoji:, <TAG>…</TAG>, inline code \`like_this\`. Localize only surrounding text.
            - Email addresses, URLs, phone numbers, file paths, version strings, code/CLI commands
            - CRITICAL: scene_type values must remain exactly: intro, goal, scenario, actionable_content, quiz, survey, nudge, summary
            - File extensions: .pdf, .doc, .xlsx, .jpg, .png, .zip, .txt
            - HTML attributes and CSS classes: class="...", style="...", id="..."

            Special Handling:
            - Transcripts: Preserve all line breaks and timestamps exactly (e.g., "00:12:34"). Localize only textual content; keep \\n and timing intact.
            - File names: Localize descriptive parts but keep extensions (e.g., "security_report.pdf" → "informe_seguridad.pdf")
            - Formatting: Use target language's standard word order, capitalization, and punctuation
            - HTML Content: When translating HTML content fields, preserve ALL HTML tags, attributes, and structure. Only translate text between tags, never modify or truncate HTML markup.
            - Long Content: NEVER truncate or cut off content mid-sentence. Always complete the full translation of every field, no matter how long.

            🎯 Validation Rules:
            - Return EXACTLY the same JSON structure with localized string values
            - Every key that exists in input must exist in output with same name
            - Every key that doesn't exist in input must NOT exist in output  
            - If a string cannot be safely localized without breaking placeholders/structure, keep the original string
            - Ensure output is valid JSON: escape quotes properly; do not add trailing commas
            - Start response immediately with { and end with }

            Example of CORRECT behavior:
            Input: {"title": "Security Training", "difficulty": "MEDIUM", "isPhishing": true}
            Output: {"title": "Formación en Seguridad", "difficulty": "MEDIUM", "isPhishing": true}

            Example of WRONG behavior (NEVER do this):
            Input: {"title": "Security Training"}
            Wrong Output: {"titulo": "Formación en Seguridad"} // ❌ Key changed
            Wrong Output: {"title": "Formación en Seguridad", "language": "es"} // ❌ Added new key
            `.trim()

        // Use our robust cleanResponse method for input JSON
        const jsonString = JSON.stringify(json);
        const cleanedJsonString = cleanResponse(jsonString, 'localize-input');
        const cleanedJson = JSON.parse(cleanedJsonString);
        console.log('🧹 Cleaned input JSON using our cleanResponse method');
        const user = `doNotTranslateKeys: ${JSON.stringify(protectedKeys)}\n\nJSON:\n${JSON.stringify(cleanedJson)}`;


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

            // Use our robust cleanResponse method for AI output
            const cleanedText = cleanResponse(res.text, 'localize-output');
            console.log('🧹 Cleaned AI response using our cleanResponse method');

            // Try to parse the cleaned JSON
            const translated = JSON.parse(cleanedText);
            console.log('✅ Successfully parsed JSON, keys:', Object.keys(translated || {}));
            return { success: true, data: translated };
        } catch (error) {
            console.error('❌ Localization failed:', error);
            console.error('❌ Full AI response text:', res?.text);

            // Retry localization with fresh AI call
            console.warn('⚠️ First localization failed, attempting retry...');
            try {
                const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_NANO);

                // Use stronger system prompt for retry
                const retrySystem = `
                ${system}
                
                ⚠️ CRITICAL: Previous attempt FAILED. This is your FINAL chance.

                MANDATORY RULES FOR THIS RETRY:
                - Copy EVERY SINGLE key from input JSON to output JSON with EXACT same name
                - Do NOT add any new keys that don't exist in input
                - Do NOT remove any keys that exist in input
                - Do NOT rename any keys (keep exact spelling, capitalization, punctuation)
                - Only change the VALUES of string fields, never the key names
                - NEVER truncate HTML content - complete every single HTML field fully
                - Preserve ALL HTML tags and attributes exactly as they appear
                - Count input fields and ensure output has same number of fields
                - Double-check your output has identical structure before responding
                `.trim();

                const retryRes = await generateText({
                    model,
                    messages: [
                        { role: 'system', content: retrySystem },
                        { role: 'user', content: user }
                    ]
                });

                console.log('🤖 Retry AI Response received, length:', retryRes?.text?.length);

                // Use our robust cleanResponse method for retry output  
                const retryCleanedText = cleanResponse(retryRes.text, 'localize-retry');
                console.log('🧹 Cleaned retry response using our cleanResponse method');

                const retryTranslated = JSON.parse(retryCleanedText);
                console.log('✅ Successfully parsed JSON on retry, keys:', Object.keys(retryTranslated || {}));
                return { success: true, data: retryTranslated };

            } catch (retryError) {
                console.error('❌ Localization failed after retry:', retryError);
                return { success: false, error: `Localization failed after retry: ${retryError}`, data: null };
            }
        }
    }
});
