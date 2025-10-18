import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModel, Model, ModelProvider } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';


const TranslateJsonInputSchema = z.object({
    json: z.any(),
    targetLanguage: z.string(),
    topic: z.string().optional(),
    doNotTranslateKeys: z.array(z.string()).optional(),
});

const TranslateJsonOutputSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional()
});

// Helper: Extract strings with paths and context
interface ExtractedString {
    path: string;
    value: string;
    context: string;
}

function extractStringsWithPaths(obj: any, protectedKeys: string[], currentPath = ''): ExtractedString[] {
    const results: ExtractedString[] = [];

    const isProtectedKey = (key: string) => {
        return protectedKeys.some(pk => key.toLowerCase().includes(pk.toLowerCase())) ||
               /^(icon(Name)?|id(s)?|url|src|scene_type|type|difficulty|headers|timestamp)$/i.test(key);
    };

    function traverse(current: any, path: string) {
        if (typeof current === 'string') {
            const pathParts = path.split('.');
            const lastKey = pathParts[pathParts.length - 1];

            // Skip protected keys
            if (isProtectedKey(lastKey)) return;

            // Determine context from path
            let context = 'text';
            if (lastKey.includes('title') || lastKey.includes('Title')) context = 'title';
            else if (lastKey.includes('subject') || lastKey.includes('Subject')) context = 'email_subject';
            else if (lastKey.includes('description') || lastKey.includes('Description')) context = 'description';
            else if (lastKey.includes('content') || lastKey.includes('Content')) context = 'content';
            else if (lastKey.includes('message') || lastKey.includes('Message')) context = 'message';
            else if (lastKey.includes('explanation')) context = 'explanation';

            results.push({ path, value: current, context });
        } else if (Array.isArray(current)) {
            current.forEach((item, index) => {
                traverse(item, path ? `${path}[${index}]` : `[${index}]`);
            });
        } else if (current && typeof current === 'object') {
            Object.keys(current).forEach(key => {
                const newPath = path ? `${path}.${key}` : key;
                traverse(current[key], newPath);
            });
        }
    }

    traverse(obj, currentPath);
    return results;
}

// Helper: Bind translated strings back to structure
function bindTranslatedStrings(original: any, extracted: ExtractedString[], translated: string[]): any {
    if (extracted.length !== translated.length) {
        throw new Error(`Mismatch: extracted ${extracted.length} strings but got ${translated.length} translations`);
    }

    const result = JSON.parse(JSON.stringify(original)); // Deep clone

    extracted.forEach((item, index) => {
        const translatedValue = translated[index];
        const pathParts = item.path.split(/\.|\[|\]/).filter(p => p);

        let current = result;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            const isArrayIndex = !isNaN(Number(part));
            current = current[isArrayIndex ? Number(part) : part];
        }

        const lastPart = pathParts[pathParts.length - 1];
        const isArrayIndex = !isNaN(Number(lastPart));
        current[isArrayIndex ? Number(lastPart) : lastPart] = translatedValue;
    });

    return result;
}

export const translateLanguageJsonTool = new Tool({
    id: 'translate_language_json',
    description: 'Translate only string values in a JSON while preserving structure, keys and non-string types',
    inputSchema: TranslateJsonInputSchema,
    outputSchema: TranslateJsonOutputSchema,
    execute: async (context: any) => {
        const { json, targetLanguage, topic, doNotTranslateKeys = [] } = context as z.infer<typeof TranslateJsonInputSchema>;

        // Always add scene_type to protected keys
        const protectedKeys = [...doNotTranslateKeys, 'scene_type'];
        console.log('🔒 Protected keys:', protectedKeys);
        console.log('🎯 Topic:', topic || 'General');
        console.log('🌍 Target language:', targetLanguage);

        // Step 1: Extract strings with context
        const extracted = extractStringsWithPaths(json, protectedKeys);
        console.log(`📦 Extracted ${extracted.length} strings for translation`);

        // Chunk size: 50 strings per request (manageable for AI)
        const CHUNK_SIZE = 50;
        const chunks: ExtractedString[][] = [];
        for (let i = 0; i < extracted.length; i += CHUNK_SIZE) {
            chunks.push(extracted.slice(i, i + CHUNK_SIZE));
        }
        console.log(`📦 Split into ${chunks.length} chunks of ~${CHUNK_SIZE} strings`);

        // Step 2: Build topic-aware prompt
        const topicContext = topic
            ? `You are localizing content for a ${topic} security training. Use appropriate terminology for this security topic.`
            : 'You are localizing general security training content.';

        const system = `
${topicContext}

TASK: Localize JSON values to ${targetLanguage}. Write like a native ${targetLanguage} speaker.

RULES:
1. Keep same keys - only change values
2. Keep technical terms: phishing, deepfake, malware, CEO, IT, AI

3. HTML TAGS - CRITICAL:
   - NEVER remove, add, or modify ANY HTML tag
   - Copy ALL tags exactly: <div>, </div>, <p>, </p>, <strong>, </strong>, <br>, <a>, etc.
   - Count input tags = count output tags (MUST be equal)
   - Only translate TEXT between tags
   - Example: "<p>Hello <strong>world</strong></p>" → "<p>Merhaba <strong>dünya</strong></p>"

4. Keep formatting: \\n stays \\n, timestamps unchanged
5. Write natural ${targetLanguage} - adapt grammar and sentence structure
6. Use appropriate tone for security training content

HOW TO LOCALIZE:
- Read the meaning, not individual words
- Write how a ${targetLanguage} native would express this idea
- Keep sentences clear and professional
- Match natural ${targetLanguage} sentence patterns
- Remove punctuation from labels/titles if unnatural in ${targetLanguage}
- Keep capitalization style consistent with original text
- Make imperative commands sound natural, not harsh

OUTPUT FORMAT:
{
  "0": "localized value",
  "1": "localized value"
}

Keep all keys "0" to "${extracted.length - 1}".
`.trim()

        // Step 3: Translate each chunk with parallel processing and retry
        const model = getModel(ModelProvider.WORKERS_AI, Model.WORKERS_AI_GPT_OSS_120B);
        const BATCH_SIZE = 3; // Process 3 chunks in parallel
        const MAX_RETRIES = 2;

        // Helper function to translate a single chunk with retry
        async function translateChunk(chunk: ExtractedString[], chunkIndex: number): Promise<string[]> {
            const chunkNumber = chunkIndex + 1;

            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    console.log(`🔄 Translating chunk ${chunkNumber}/${chunks.length} (${chunk.length} strings)${attempt > 1 ? ` - Retry ${attempt}/${MAX_RETRIES}` : ''}`);

                    // Convert chunk to numbered object
                    const numberedInput: Record<string, string> = {};
                    chunk.forEach((item, index) => {
                        numberedInput[index.toString()] = item.value;
                    });

                    const user = `Localize values to native ${targetLanguage}. Sound natural, not literal.

CRITICAL HTML RULES:
- If input has "<p>Hello</p>", output MUST be "<p>[translated]</p>"
- NEVER remove closing tags like </p>, </div>, </strong>
- Copy HTML structure exactly, only change text
- Count tags: input 8 tags = output 8 tags

INPUT:
${JSON.stringify(numberedInput, null, 2)}

OUTPUT (same keys, exact HTML structure, natural ${targetLanguage} text):`;

                    const res = await generateText({
                        model,
                        messages: [
                            { role: 'system', content: system },
                            { role: 'user', content: user }
                        ]
                    });

                    const cleanedText = cleanResponse(res.text, `chunk-${chunkNumber}`);
                    const translatedObject = JSON.parse(cleanedText);

                    if (typeof translatedObject !== 'object' || Array.isArray(translatedObject)) {
                        throw new Error(`Expected object, got ${typeof translatedObject}`);
                    }

                    // Helper: Count HTML tags in a string
                    function countHtmlTags(str: string): number {
                        return (str.match(/<[^>]+>/g) || []).length;
                    }

                    // Convert to array and validate
                    const translatedChunk: string[] = [];
                    for (let i = 0; i < chunk.length; i++) {
                        const translatedValue = translatedObject[i.toString()];
                        if (translatedValue === undefined) {
                            throw new Error(`Missing index ${i}`);
                        }

                        // Validate HTML tags preservation
                        const originalTags = countHtmlTags(chunk[i].value);
                        const translatedTags = countHtmlTags(translatedValue);

                        if (originalTags !== translatedTags) {
                            console.warn(`⚠️ HTML tag mismatch in index ${i}: original=${originalTags}, translated=${translatedTags}`);
                            console.warn(`   Original: "${chunk[i].value}"`);
                            console.warn(`   Translated: "${translatedValue}"`);
                            // Don't throw, just warn - let it continue but log the issue
                        }

                        translatedChunk.push(translatedValue);
                    }

                    console.log(`✅ Chunk ${chunkNumber} done (${translatedChunk.length} strings)`);
                    return translatedChunk;

                } catch (error) {
                    if (attempt === MAX_RETRIES) {
                        console.error(`❌ Chunk ${chunkNumber} failed after ${MAX_RETRIES} attempts:`, error);
                        throw new Error(`Chunk ${chunkNumber} failed: ${error}`);
                    }
                    console.warn(`⚠️ Chunk ${chunkNumber} attempt ${attempt} failed, retrying...`);
                }
            }
            throw new Error(`Chunk ${chunkNumber} failed after all retries`);
        }

        // Process chunks in batches (parallel within batch, sequential across batches)
        const allTranslatedStrings: string[] = [];

        for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
            const batchChunks = chunks.slice(batchStart, batchEnd);

            console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${batchChunks.length} chunks in parallel)`);

            try {
                // Process batch chunks in parallel
                const batchResults = await Promise.all(
                    batchChunks.map((chunk, idx) => translateChunk(chunk, batchStart + idx))
                );

                // Flatten and add to results
                batchResults.forEach(result => {
                    allTranslatedStrings.push(...result);
                });

                console.log(`✅ Batch done: ${allTranslatedStrings.length}/${extracted.length} total strings`);

            } catch (batchError) {
                console.error(`❌ Batch failed:`, batchError);
                return { success: false, error: `Translation failed: ${batchError}`, data: null };
            }
        }

        // Step 4: Validate total count
        if (allTranslatedStrings.length !== extracted.length) {
            throw new Error(`Total mismatch: expected ${extracted.length}, got ${allTranslatedStrings.length}`);
        }

        console.log(`✅ All chunks translated successfully: ${allTranslatedStrings.length} strings`);
        console.log(`📝 Sample: "${extracted[0].value}" → "${allTranslatedStrings[0]}"`);

        // Step 5: Bind translations back to original structure
        const result = bindTranslatedStrings(json, extracted, allTranslatedStrings);
        console.log('✅ Successfully bound translations to original structure');

        return { success: true, data: result };
    }
});
