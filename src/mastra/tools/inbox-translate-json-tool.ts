import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import * as parse5 from 'parse5';
import { getModelWithOverride } from '../model-providers';
import { cleanResponse } from '../utils/content-processors/json-cleaner';
import { LOCALIZER_PARAMS } from '../utils/llm-generation-params';
import { buildSystemPrompt } from '../utils/localization-language-rules';

/* =========================================================
 * Schemas
 * =======================================================*/
const InboxTranslateInputSchema = z.object({
    json: z.any(),
    sourceLanguage: z.string().optional().default('English'),
    targetLanguage: z.string(),
    topic: z.string().optional(),
    doNotTranslateKeys: z.array(z.string()).optional(),
    modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional().describe('Model provider'),
    model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
});

const InboxTranslateOutputSchema = z.object({
    success: z.boolean(),
    data: z.any(),
    error: z.string().optional()
});

/* =========================================================
 * HTML: auto-fix (parse5) + protect/restore
 * =======================================================*/

/** Bozuk/eksik kapanışlı HTML'i tarayıcı standardına göre normalize eder. */
function autoFixHtml(html: string): string {
    try {
        // Fragment kullan: <p>..</p> gibi gömülü HTML'lerde <html><body> sarmalaması eklenmez
        const frag = parse5.parseFragment(html);
        return parse5.serialize(frag);
    } catch (error) {
        console.warn('⚠️ Failed to normalize HTML, returning original', {
            error: error instanceof Error ? error.message : String(error),
            htmlLength: html.length,
        });
        return html; // graceful fallback
    }
}

/** Tag'leri token'layıp koru (LLM dokunmasın). */
function protectHtmlTags(text: string): { protectedText: string; tagMap: Map<number, string> } {
    const tagMap = new Map<number, string>();
    let index = 0;
    const protectedText = text.replace(/<[^>]+>/g, (tag) => {
        const token = `__HTML${index}__`;
        tagMap.set(index, tag);
        index++;
        return token;
    });
    return { protectedText, tagMap };
}

/** Token'lanmış tag'leri geri yükle. */
function restoreHtmlTags(text: string, tagMap: Map<number, string>): string {
    let out = text;
    tagMap.forEach((tag, idx) => {
        out = out.split(`__HTML${idx}__`).join(tag);
    });
    return out;
}

/* =========================================================
 * Extraction (yol + hafif bağlam) — HTML bulunan her string: auto-fix + protect
 * =======================================================*/
interface ExtractedString {
    path: string;
    value: string;
    context: string;
    tagMap?: Map<number, string>;
}

function extractStringsWithPaths(obj: any, protectedKeys: string[], currentPath = ''): ExtractedString[] {
    const results: ExtractedString[] = [];

    const isProtectedKey = (key: string) =>
        protectedKeys.some(pk => key.toLowerCase().includes(pk.toLowerCase())) ||
        /^(icon(Name)?|id(s)?|url|src|scene_type|type|difficulty|headers|sender)$/i.test(key);

    function traverse(current: any, path: string) {
        if (typeof current === 'string') {
            const parts = path.split('.');
            const lastKey = parts[parts.length - 1];
            if (isProtectedKey(lastKey)) return;

            let context = 'text';
            const lk = lastKey.toLowerCase();
            if (lk.includes('title')) context = 'title';
            else if (lk.includes('subject')) context = 'email_subject';
            else if (lk.includes('description')) context = 'description';
            else if (lk.includes('content')) context = 'content';
            else if (lk.includes('message')) context = 'message';
            else if (lk.includes('explanation')) context = 'explanation';

            const hasHtml = current.includes('<') && current.includes('>');
            if (hasHtml) {
                const fixed = autoFixHtml(current);                    // ← önce onar
                const { protectedText, tagMap } = protectHtmlTags(fixed); // ← sonra koru
                results.push({ path, value: protectedText, context, tagMap });
            } else {
                results.push({ path, value: current, context });
            }
        } else if (Array.isArray(current)) {
            current.forEach((item, i) => traverse(item, path ? `${path}[${i}]` : `[${i}]`));
        } else if (current && typeof current === 'object') {
            Object.keys(current).forEach((k) => traverse(current[k], path ? `${path}.${k}` : k));
        }
    }

    traverse(obj, currentPath);
    return results;
}

/* =========================================================
 * Bind back
 * =======================================================*/
function bindTranslatedStrings(original: any, extracted: ExtractedString[], translated: string[]): any {
    if (extracted.length !== translated.length) {
        throw new Error(`Mismatch: extracted ${extracted.length} strings but got ${translated.length} translations`);
    }
    const result = JSON.parse(JSON.stringify(original));
    extracted.forEach((item, idx) => {
        let val = translated[idx];
        if (item.tagMap && item.tagMap.size > 0) {
            val = restoreHtmlTags(val, item.tagMap);
        }
        const parts = item.path.split(/\.|\[|\]/).filter(Boolean);
        let cur = result;
        for (let i = 0; i < parts.length - 1; i++) {
            const p = parts[i];
            cur = cur[isNaN(Number(p)) ? p : Number(p)];
        }
        const last = parts[parts.length - 1];
        cur[isNaN(Number(last)) ? last : Number(last)] = val;
    });
    return result;
}

/* =========================================================
 * Robustness helpers (placeholder/ICU/URL/email/whitespace)
 * =======================================================*/
const ICU_TOKEN_RE = /\{[^}]*,(\s*plural|\s*select)[^}]*\}/g;
const SIMPLE_PLACEHOLDER_RE = /%[sd]|{{\s*[\w.-]+\s*}}|\{[\w.-]+\}/g;
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

function collectPlaceholders(s: string): string[] {
    return [
        ...(s.match(ICU_TOKEN_RE) || []),
        ...(s.match(SIMPLE_PLACEHOLDER_RE) || []),
    ].sort();
}
function placeholdersEqual(src: string, tgt: string): boolean {
    const a = collectPlaceholders(src);
    const b = collectPlaceholders(tgt);
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}
function stringsEqualSet(a: string[], b: string[]) {
    const A = new Set(a.map((x) => x.toLowerCase()));
    const B = new Set(b.map((x) => x.toLowerCase()));
    if (A.size !== B.size) return false;
    for (const x of A) if (!B.has(x)) return false;
    return true;
}
function edgeWhitespaceSig(s: string) {
    const lead = s.match(/^\s*/)?.[0] ?? '';
    const tail = s.match(/\s*$/)?.[0] ?? '';
    return { lead, tail };
}
function isTrivialValue(s: string) {
    const trimmed = s.trim();
    if (trimmed === '') return true;
    if (/^({{[\w.-]+}}|%[sd]|\{[\w.-]+\})$/.test(trimmed)) return true;
    return false;
}

/* =========================================================
 * Chunking
 * =======================================================*/
function computeChunkSize(items: ExtractedString[], maxJsonChars = 28_000) {
    let size = 50;
    let sample = Object.fromEntries(items.slice(0, size).map((it, i) => [String(i), it.value]));
    let test = JSON.stringify(sample).length;
    while (test > maxJsonChars && size > 5) {
        size = Math.max(5, Math.floor(size * 0.7));
        sample = Object.fromEntries(items.slice(0, size).map((it, i) => [String(i), it.value]));
        test = JSON.stringify(sample).length;
    }
    return size;
}

/* =========================================================
 * Tool - Inbox Translation (Simple, chunk-based)
 * =======================================================*/
export const inboxTranslateJsonTool = new Tool({
    id: 'inbox_translate_json',
    description: 'Translate inbox content (emails, texts) using simple chunk-based translation. Cost-effective approach for non-critical content.',
    inputSchema: InboxTranslateInputSchema,
    outputSchema: InboxTranslateOutputSchema,
    execute: async (context: any) => {
        const {
            json,
            sourceLanguage = 'English',
            targetLanguage,
            topic,
            doNotTranslateKeys = [],
            modelProvider,
            model: modelOverride
        } = context as z.infer<typeof InboxTranslateInputSchema>;

        const model = getModelWithOverride(modelProvider, modelOverride);

        const protectedKeys = [...doNotTranslateKeys, 'scene_type'];
        console.log('🔒 [INBOX] Protected keys:', protectedKeys);
        console.log('📝 [INBOX] Source language:', sourceLanguage);
        console.log('🎯 [INBOX] Topic:', topic || 'General');
        console.log('🌍 [INBOX] Target language:', targetLanguage);

        // 1) Extract
        const extracted = extractStringsWithPaths(json, protectedKeys);
        const htmlCount = extracted.filter(e => e.tagMap && e.tagMap.size > 0).length;
        console.log(`📦 [INBOX] Extracted ${extracted.length} strings (${htmlCount} with HTML protection)`);

        if (extracted.length === 0) {
            return { success: true, data: json };
        }

        // 2) Chunking
        const CHUNK_SIZE = computeChunkSize(extracted);
        const chunks: ExtractedString[][] = [];
        for (let i = 0; i < extracted.length; i += CHUNK_SIZE) {
            chunks.push(extracted.slice(i, i + CHUNK_SIZE));
        }
        console.log(`📦 [INBOX] Split into ${chunks.length} chunks (≈${CHUNK_SIZE} each)`);

        // 3) Prompt
        const topicContext = topic
            ? `You are localizing content for a ${topic} security training. Use appropriate terminology for this security topic.`
            : 'You are localizing general security training content.';

        const system = buildSystemPrompt({
            topicContext,
            sourceLanguage,
            targetLanguage,
            extractedLength: extracted.length
        });

        // 4) Translate
        const BATCH_SIZE = 3;
        const issues: string[] = [];

        async function translateChunk(chunk: ExtractedString[], chunkIndex: number): Promise<string[]> {
            const chunkNumber = chunkIndex + 1;
            const trivialMask = chunk.map(it => isTrivialValue(it.value));

            try {
                const numberedInput: Record<string, string> = {};
                chunk.forEach((item, i) => numberedInput[String(i)] = item.value);

                const user =
                    `Localize these ${sourceLanguage} values to ${targetLanguage} ONLY. Follow all system rules above.
                    Do NOT modify HTML tokens (__HTML#__) or placeholders.

                    INPUT:
                    ${JSON.stringify(numberedInput, null, 2)}

                    OUTPUT (${targetLanguage} ONLY, valid JSON object with keys "0".."${chunk.length - 1}"):`;

                const res = await generateText({
                    model,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user }
                    ],
                    ...LOCALIZER_PARAMS,
                });

                const cleaned = cleanResponse(res.text, `inbox-chunk-${chunkNumber}`);
                const obj = JSON.parse(cleaned);

                const out: string[] = [];
                for (let i = 0; i < chunk.length; i++) {
                    const src = chunk[i].value;
                    let tgt = trivialMask[i] ? src : obj[String(i)];
                    if (tgt === undefined) throw new Error(`Missing key "${i}" in translation output`);

                    // Placeholders / URL / email / whitespace koru
                    if (!placeholdersEqual(src, tgt)) {
                        issues.push(`chunk ${chunkNumber} index ${i}: placeholder mismatch`);
                    }
                    const srcUrls = src.match(URL_RE) || [];
                    const tgtUrls = tgt.match(URL_RE) || [];
                    if (!stringsEqualSet(srcUrls, tgtUrls)) {
                        issues.push(`chunk ${chunkNumber} index ${i}: url mismatch`);
                    }
                    const srcEmails = src.match(EMAIL_RE) || [];
                    const tgtEmails = tgt.match(EMAIL_RE) || [];
                    if (!stringsEqualSet(srcEmails, tgtEmails)) {
                        issues.push(`chunk ${chunkNumber} index ${i}: email mismatch`);
                    }

                    const sSig = edgeWhitespaceSig(src);
                    const tSig = edgeWhitespaceSig(tgt);
                    if (sSig.lead.length !== tSig.lead.length || sSig.tail.length !== tSig.tail.length) {
                        tgt = sSig.lead + tgt.trim() + sSig.tail;
                    }

                    out.push(tgt);
                }
                return out;

            } catch (e) {
                console.warn(`⚠️ [INBOX] Chunk ${chunkNumber} failed, using originals (error: ${String(e)})`);
                return chunk.map(c => c.value);
            }
        }

        const allTranslated: string[] = [];
        for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
            const batch = chunks.slice(start, Math.min(start + BATCH_SIZE, chunks.length));
            const results = await Promise.all(batch.map((ch, idx) => translateChunk(ch, start + idx)));
            results.forEach(r => allTranslated.push(...r));
        }

        if (allTranslated.length !== extracted.length) {
            throw new Error(`Total mismatch: expected ${extracted.length}, got ${allTranslated.length}`);
        }

        const result = bindTranslatedStrings(json, extracted, allTranslated);
        return { success: true, data: result, error: issues.length ? `Completed with ${issues.length} soft issues` : undefined };
    }
});
