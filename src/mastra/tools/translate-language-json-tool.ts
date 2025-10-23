import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModel, Model, ModelProvider } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';


const TranslateJsonInputSchema = z.object({
    json: z.any(),
    sourceLanguage: z.string().optional().default('English'),
    targetLanguage: z.string(),
    topic: z.string().optional(),
    doNotTranslateKeys: z.array(z.string()).optional(),
});

const TranslateJsonOutputSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional()
});

// Helper: Protect HTML tags during translation (industrial standard approach)
function protectHtmlTags(text: string): { protectedText: string; tagMap: Map<number, string> } {
    const tagMap = new Map<number, string>();
    let index = 0;

    // Replace HTML tags with unique tokens
    const protectedText = text.replace(/<[^>]+>/g, (tag) => {
        const token = `__HTML${index}__`;
        tagMap.set(index, tag);
        index++;
        return token;
    });

    return { protectedText, tagMap };
}

// Helper: Restore HTML tags after translation
function restoreHtmlTags(text: string, tagMap: Map<number, string>): string {
    let restored = text;
    tagMap.forEach((tag, index) => {
        // Use global replace to handle potential duplicates (edge case)
        const token = `__HTML${index}__`;
        restored = restored.split(token).join(tag);  // Safer than .replaceAll() for older JS
    });
    return restored;
}

// Helper: Extract strings with paths and context
interface ExtractedString {
    path: string;
    value: string;
    context: string;
    tagMap?: Map<number, string>;  // Store tag map for HTML content
}

function extractStringsWithPaths(obj: any, protectedKeys: string[], currentPath = ''): ExtractedString[] {
    const results: ExtractedString[] = [];

    const isProtectedKey = (key: string) => {
        return protectedKeys.some(pk => key.toLowerCase().includes(pk.toLowerCase())) ||
            /^(icon(Name)?|id(s)?|url|src|scene_type|type|difficulty|headers|timestamp|sender)$/i.test(key);
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

            // Apply HTML tag protection for content fields with HTML
            const hasHtml = current.includes('<') && current.includes('>');
            if (hasHtml && (context === 'content' || lastKey === 'content')) {
                const { protectedText, tagMap } = protectHtmlTags(current);
                results.push({ path, value: protectedText, context, tagMap });
            } else {
                results.push({ path, value: current, context });
            }
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
        let translatedValue = translated[index];

        // Restore HTML tags if they were protected
        if (item.tagMap && item.tagMap.size > 0) {
            translatedValue = restoreHtmlTags(translatedValue, item.tagMap);
        }

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
        const { json, sourceLanguage = 'English', targetLanguage, topic, doNotTranslateKeys = [] } = context as z.infer<typeof TranslateJsonInputSchema>;

        // Always add scene_type to protected keys
        const protectedKeys = [...doNotTranslateKeys, 'scene_type'];
        console.log('🔒 Protected keys:', protectedKeys);
        console.log('📝 Source language:', sourceLanguage);
        console.log('🎯 Topic:', topic || 'General');
        console.log('🌍 Target language:', targetLanguage);

        // Step 1: Extract strings with context
        const extracted = extractStringsWithPaths(json, protectedKeys);
        const htmlCount = extracted.filter(e => e.tagMap && e.tagMap.size > 0).length;
        console.log(`📦 Extracted ${extracted.length} strings for translation (${htmlCount} with HTML protection)`);

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
            
            TASK: Localize JSON values from ${sourceLanguage} to ${targetLanguage} ONLY, producing fluent, culturally natural, native-quality output.
            
            ---
            
            ## CRITICAL RULES
            
            ### 1️⃣ LANGUAGE PURITY
            - Output ONLY in ${targetLanguage}.  
            - Do not mix with other languages.  
            - Keep proper nouns/acronyms that are globally standard in cybersecurity (phishing, CEO, MFA, SPF, DMARC, DKIM, AI).  
            - If no direct equivalent exists, keep the English term and localize surrounding grammar naturally.
            
            ---
            
            ### 2️⃣ CONTEXT-AWARE LOCALIZATION (NOT LITERAL)
            - Focus on **meaning, tone, and natural phrasing**—not word-for-word translation.  
            - Adapt to the communication style of ${targetLanguage}.  
            - Avoid robotic, academic, or overly formal tone.  
            
            **Content Type Guidance:**
            - **Titles:** Action-oriented, clear, motivating.  
            - **Warnings/Alerts:** Direct statement + impact + awareness.  
            - **Descriptions:** Verb + what + why (practical and concise).  
            - **Actions/Commands:** Simple active verbs, natural imperatives.  
            - **Informational Text:** Professional, conversational, never textbook-like.
            
            **Localization Patterns (apply to all languages):**
            1. **Warnings/Threats:** Direct statement → relevant threat → personal impact → awareness call.  
            2. **Actions:** Simple verb + clear context (active voice).  
            3. **Descriptions:** Verb + what + why (highlight benefit or purpose).
            
            Use direct address where natural (e.g., your / tu / su / vos / 您 / vous), depending on the ${targetLanguage}’s convention.
            
            ---
            
            ### 3️⃣ STRUCTURE PRESERVATION
            - Preserve all JSON keys exactly ("0", "1", ..., "${extracted.length - 1}").  
            - Keep HTML tags and attributes unchanged (same count and order).  
            - Preserve placeholders and variables:  
              \`{…}\`, \`{{…}}\`, \`%s\`, \`%d\`, \`{{name}}\`, URLs, emails, timestamps, \`\\n\`, capitalization.  
            - Never add or remove any tags, placeholders, or extra sentences.  
            - Example:  
              <p>Hello <strong>world</strong></p> → <p>[localized]<strong>[localized]</strong></p>
            
            ---
            
            ### 4️⃣ STYLE (AUTO-ADAPT TO TARGET LANGUAGE)
            - Automatically adapt sentence rhythm, tone, and idioms to ${targetLanguage} norms.  
            - Prefer short, natural sentences (approx. 8–18 words).  
            - Follow native punctuation, date, and number formats.  
            - Maintain professional but conversational tone.  
            - Rewrite unnatural literal phrases to sound native while preserving meaning.
            
            ---
            #### 🎯 TONE ADAPTATION (MOTIVATIONAL & PROFESSIONAL)
            - Adapt motivational or congratulatory phrases (e.g., "Well done", "Great job", "Nice work")
            to sound natural and culturally appropriate in ${targetLanguage}.  
            - Preserve a professional, confident, and encouraging tone suitable for adult learning.  
            - Avoid childish or exaggerated expressions that sound like teacher–student speech.  
            - Use tone that fits workplace microlearning: respectful, motivating, professional.  
          
            ---

            ### 5️⃣ TERMINOLOGY
            - Use **standard cybersecurity terminology** used in ${targetLanguage}.  
            - Do NOT invent new terms.  
            - Keep global acronyms (MFA, SPF, DMARC, DKIM) as is unless a localized standard exists.  
            - When uncertain, choose the most common enterprise security usage in ${targetLanguage}.  
            
            ---
            
            ### 6️⃣ FEW-SHOT SCAFFOLD (ILLUSTRATIVE)
            *(Adapt these patterns to ${targetLanguage}; they define tone, not wording.)*
            
            **[Warning]**  
            SRC: "Phishing alert: Do not open unexpected attachments — they may install malware."  
            TGT: "[Natural ${targetLanguage} equivalent: clear, direct, professional warning]"
            
            **[Action]**  
            SRC: "Verify the sender’s address before clicking any link."  
            TGT: "[Natural ${targetLanguage} equivalent: polite imperative in active voice]"
            
            **[Description]**  
            SRC: "Report suspicious emails so we can block similar attacks."  
            TGT: "[Natural ${targetLanguage} equivalent: concise call to action with benefit]"
            
            ---
            
            ### 7️⃣ VALIDATION BEFORE OUTPUT
            1. JSON keys must match source exactly (0…${extracted.length - 1}).  
            2. Text fully localized in ${targetLanguage} (no mixed fragments).  
            3. HTML tags, placeholders, and capitalization identical in structure.  
            4. Meaning preserved — no omissions or additions.  
            5. Output strictly valid JSON (no comments or metadata).  
            
            ---
            
            ### ✅ OUTPUT FORMAT (STRICT)
            Return ONLY this JSON object:
            {
              "0": "localized value in ${targetLanguage}",
              "1": "localized value in ${targetLanguage}"
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

                    const user = `Localize these ${sourceLanguage} values to ${targetLanguage} ONLY. Follow all system rules above.

CRITICAL: Localize ONLY text content INSIDE HTML tags. Do NOT change tags themselves.
Example: "<p>Hello world</p>" → "<p>[localized text]</p>" (tags unchanged)

INPUT (${sourceLanguage} values):
${JSON.stringify(numberedInput, null, 2)}

OUTPUT (${targetLanguage} ONLY, native quality, exact HTML structure):`;

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

                    // Convert to array and validate with retry logic for HTML mismatches
                    const translatedChunk: string[] = [];
                    let hasHtmlMismatch = false;

                    for (let i = 0; i < chunk.length; i++) {
                        const translatedValue = translatedObject[i.toString()];
                        if (translatedValue === undefined) {
                            throw new Error(`Missing index ${i}`);
                        }

                        // Validate HTML tags preservation (skip if using tag protection tokens)
                        const hasProtectionTokens = chunk[i].value.includes('__HTML') || translatedValue.includes('__HTML');

                        if (!hasProtectionTokens) {
                            // Only validate raw HTML (not protected content)
                            const originalTags = countHtmlTags(chunk[i].value);
                            const translatedTags = countHtmlTags(translatedValue);

                            if (originalTags !== translatedTags) {
                                console.warn(`⚠️ HTML tag mismatch in index ${i} (attempt ${attempt}/${MAX_RETRIES}): original=${originalTags}, translated=${translatedTags}`);
                                hasHtmlMismatch = true;
                            }
                        }
                        // Protected content: tags will be validated after restoration

                        translatedChunk.push(translatedValue);
                    }

                    // If HTML mismatches found and retries remaining, retry this chunk
                    if (hasHtmlMismatch && attempt < MAX_RETRIES) {
                        console.warn(`⚠️ Chunk ${chunkNumber} has HTML mismatches, retrying...`);
                        continue;
                    }

                    // If HTML mismatches remain after all retries, use original content as fallback
                    if (hasHtmlMismatch && attempt === MAX_RETRIES) {
                        console.warn(`⚠️ Chunk ${chunkNumber} has persistent HTML mismatches - using original content as fallback`);
                        return chunk.map(item => item.value);  // Graceful degradation
                    }

                    console.log(`✅ Chunk ${chunkNumber} done (${translatedChunk.length} strings)`);
                    return translatedChunk;

                } catch (error) {
                    if (attempt === MAX_RETRIES) {
                        console.error(`❌ Chunk ${chunkNumber} failed after ${MAX_RETRIES} attempts:`, error);
                        console.warn(`⚠️ Using original content as fallback for chunk ${chunkNumber}`);
                        return chunk.map(item => item.value);  // Graceful degradation on error
                    }
                    console.warn(`⚠️ Chunk ${chunkNumber} attempt ${attempt} failed, retrying...`);
                }
            }

            // Final fallback if all retries exhausted
            console.warn(`⚠️ Chunk ${chunkNumber} exhausted retries - returning original content`);
            return chunk.map(item => item.value);
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
