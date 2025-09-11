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
- CRITICAL: Preserve transcript formatting - keep line breaks (\\n) and timestamps intact
- For transcript fields: only translate text content, preserve timestamps and line structure
- Return EXACTLY the same JSON structure with translated string values
- NEVER add explanations or comments
- NEVER wrap in markdown \`\`\`json blocks
- Start response immediately with { and end with }`;

        // Clean the input JSON before sending to AI
        const cleanInputJson = (obj: any, path: string = ''): any => {
            if (typeof obj === 'string') {
                // Special handling for transcript field - preserve line breaks
                if (path.includes('transcript') || path.includes('video.transcript')) {
                    console.log('🎬 Preserving line breaks in transcript field');
                    // Only remove problematic control characters, keep newlines (\n = \u000A)
                    return obj.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '');
                } else {
                    // Clean all control characters from other string values
                    return obj.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                }
            } else if (Array.isArray(obj)) {
                return obj.map((item, index) => cleanInputJson(item, `${path}[${index}]`));
            } else if (obj && typeof obj === 'object') {
                const cleaned: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    const newPath = path ? `${path}.${key}` : key;
                    cleaned[key] = cleanInputJson(value, newPath);
                }
                return cleaned;
            }
            return obj;
        };

        const cleanedJson = cleanInputJson(json);
        console.log('🧹 Cleaned input JSON of control characters');
        
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
            
            // Enhanced cleaning for control characters and JSON issues
            let text = res.text.trim();
            
            // Remove markdown formatting
            text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
            console.log('📝 Removed markdown formatting');
            
            // Clean control characters that can break JSON parsing
            // But preserve newlines in transcript content
            const beforeClean = text.length;
            
            // Check if this response contains transcript content
            const hasTranscript = text.includes('"transcript"') || text.includes('transcript');
            
            if (hasTranscript) {
                console.log('🎬 Response contains transcript, preserving line breaks');
                // Only remove problematic control characters, keep newlines (\n = \u000A)
                text = text.replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, '');
            } else {
                // Clean all control characters from non-transcript content
                text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
            }
            
            if (text.length !== beforeClean) {
                console.log(`🧹 Removed ${beforeClean - text.length} control characters`);
            }
            
            // Fix common JSON issues
            text = text.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
            
            // Handle escaped newlines properly in transcript content
            text = text.replace(/\\\\n/g, '\\n'); // Convert double-escaped to single-escaped
            
            // Conservative fixes only - avoid aggressive HTML manipulation
            // Fix only the most basic JSON syntax issues
            text = text.replace(/\\\\\\/g, '\\'); // Fix triple backslashes
            text = text.replace(/\\\\"/g, '\\"'); // Fix double-escaped quotes
            
            console.log('🧹 Cleaned AI response preview:', text.substring(0, 500) + '...');
            
            // Try to parse the cleaned JSON
            const translated = JSON.parse(text);
            console.log('✅ Successfully parsed JSON, keys:', Object.keys(translated || {}));
            return { success: true, data: translated };
        } catch (error) {
            console.error('❌ Translation failed:', error);
            console.error('❌ Full AI response text:', res?.text);
            console.error('❌ Error position info:', error instanceof SyntaxError ? `Position: ${error.message}` : 'Not a syntax error');
            
            // Show the problematic area if it's a syntax error
            if (error instanceof SyntaxError && res?.text) {
                let cleanedText = res.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
                
                // Apply the same cleaning that was attempted
                cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1');
                cleanedText = cleanedText.replace(/class='([^']*)'/g, 'class="$1"');
                cleanedText = cleanedText.replace(/style='([^']*)'/g, 'style="$1"');
                
                const match = error.message.match(/position (\d+)/);
                if (match) {
                    const position = parseInt(match[1]);
                    const start = Math.max(0, position - 100);
                    const end = Math.min(cleanedText.length, position + 100);
                    
                    console.error('🔍 Character at error position:', cleanedText.charCodeAt(position), `"${cleanedText.charAt(position)}"`);
                    console.error('🔍 Problematic area around position:', cleanedText.substring(start, end));
                    
                    // Look for common issues around the error
                    const problemArea = cleanedText.substring(Math.max(0, position - 50), position + 50);
                    if (problemArea.includes("'")) {
                        console.error('🔍 Found single quotes near error - this might be the issue');
                    }
                    if (problemArea.includes('"}')) {
                        console.error('🔍 Found array element ending near error - might be missing comma');
                    }
                }
            }
            
            return { success: false, error: `Translation failed: ${error}`, data: json };
        }
    }
});
