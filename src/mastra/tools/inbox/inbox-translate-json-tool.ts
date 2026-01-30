import { Tool } from '@mastra/core/tools';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { LOCALIZER_PARAMS } from '../../utils/config/llm-generation-params';
import { buildSystemPrompt } from '../../utils/language/localization-language-rules';
import { getLogger } from '../../utils/core/logger';
import { TRANSLATION_CONFIG } from '../../constants';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';
import { repairHtml } from '../../utils/validation/json-validation-utils';
import { InboxTranslateInputSchema, InboxTranslateOutputSchema, type InboxTranslateInput } from './inbox-translate-json-schemas';

/* =========================================================
 * HTML: protect/restore
 * Note: HTML repair is handled by repairHtml() from json-validation-utils
 * =======================================================*/

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

function extractStringsWithPaths(obj: unknown, protectedKeys: string[], currentPath = ''): ExtractedString[] {
    const results: ExtractedString[] = [];

    const isProtectedKey = (key: string) =>
        protectedKeys.some(pk => key.toLowerCase().includes(pk.toLowerCase())) ||
        /^(icon(Name)?|id(s)?|url|src|scene_type|type|difficulty|headers|sender)$/i.test(key);

    function traverse(current: unknown, path: string) {
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
                const fixed = repairHtml(current);                    // ← önce onar (shared utility)
                const { protectedText, tagMap } = protectHtmlTags(fixed); // ← sonra koru
                results.push({ path, value: protectedText, context, tagMap });
            } else {
                results.push({ path, value: current, context });
            }
        } else if (Array.isArray(current)) {
            current.forEach((item, i) => traverse(item, path ? `${path}[${i}]` : `[${i}]`));
        } else if (current && typeof current === 'object') {
            const currentObj = current as Record<string, unknown>;
            Object.keys(currentObj).forEach((k) => traverse(currentObj[k], path ? `${path}.${k}` : k));
        }
    }

    traverse(obj, currentPath);
    return results;
}

/* =========================================================
 * Bind back
 * =======================================================*/
function bindTranslatedStrings(original: unknown, extracted: ExtractedString[], translated: string[]): unknown {
    if (extracted.length !== translated.length) {
        const logger = getLogger('BindTranslatedStrings');
        const errorInfo = errorService.validation(`Mismatch: extracted ${extracted.length} strings but got ${translated.length} translations`, { extracted: extracted.length, translated: translated.length });
        logErrorInfo(logger, 'error', 'Translation binding failed', errorInfo);
        throw new Error(errorInfo.message);
    }
    const result = JSON.parse(JSON.stringify(original));
    extracted.forEach((item, idx) => {
        let val = translated[idx];
        if (item.tagMap && item.tagMap.size > 0) {
            val = restoreHtmlTags(val, item.tagMap);
            // Repair HTML after restore (AI may have added broken HTML during translation)
            val = repairHtml(val);
        }
        const parts = item.path.split(/\.|\[|\]/).filter(Boolean);
        let cur: any = result;
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
function computeChunkSize(items: ExtractedString[], maxJsonChars = TRANSLATION_CONFIG.MAX_JSON_CHARS) {
    let size: number = TRANSLATION_CONFIG.INITIAL_CHUNK_SIZE;
    let sample = Object.fromEntries(items.slice(0, size).map((it, i) => [String(i), it.value]));
    let test = JSON.stringify(sample).length;
    while (test > maxJsonChars && size > TRANSLATION_CONFIG.MIN_CHUNK_SIZE) {
        size = Math.max(TRANSLATION_CONFIG.MIN_CHUNK_SIZE, Math.floor(size * TRANSLATION_CONFIG.SIZE_REDUCTION_FACTOR));
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
        const logger = getLogger('InboxTranslateJsonTool');
        try {
            const {
                json,
                sourceLanguage,
                targetLanguage,
                topic,
                doNotTranslateKeys = [],
                modelProvider,
                model: modelOverride
            } = context as InboxTranslateInput;

            const model = getModelWithOverride(modelProvider, modelOverride);

            const protectedKeys = [...doNotTranslateKeys, 'scene_type'];
            logger.debug('Translation configuration', { protectedKeys, sourceLanguage, topic: topic || 'General', targetLanguage });

            // 1) Extract
            const extracted = extractStringsWithPaths(json, protectedKeys);
            const htmlCount = extracted.filter(e => e.tagMap && e.tagMap.size > 0).length;
            logger.debug('Extracted strings from inbox', { count: extracted.length, htmlCount });

            if (extracted.length === 0) {
                return { success: true, data: json };
            }

            // 2) Chunking
            const CHUNK_SIZE = computeChunkSize(extracted);
            const chunks: ExtractedString[][] = [];
            for (let i = 0; i < extracted.length; i += CHUNK_SIZE) {
                chunks.push(extracted.slice(i, i + CHUNK_SIZE));
            }
            logger.debug('Split inbox strings into chunks', { chunkCount: chunks.length, chunkSize: CHUNK_SIZE });

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
            const BATCH_SIZE = TRANSLATION_CONFIG.BATCH_SIZE;
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

                    const res = await withRetry(
                        () => generateText({
                            model,
                            messages: [
                                { role: 'system', content: system },
                                { role: 'user', content: user }
                            ],
                            ...LOCALIZER_PARAMS,
                        }),
                        `Inbox chunk ${chunkNumber} translation`
                    );

                    const cleaned = cleanResponse(res.text, `inbox-chunk-${chunkNumber}`);
                    const obj = JSON.parse(cleaned);

                    const out: string[] = [];
                    for (let i = 0; i < chunk.length; i++) {
                        const src = chunk[i].value;
                        let tgt = trivialMask[i] ? src : obj[String(i)];
                        if (tgt === undefined) {
                            const errorInfo = errorService.aiModel(`Missing key "${i}" in translation output`, { chunkNumber, index: i });
                            throw new Error(errorInfo.message);
                        }

                        // Placeholders // URL // email // whitespace koru
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
                    const err = normalizeError(e);
                    logger.warn(`Chunk translation failed, using originals`, { chunkNumber, error: err.message, stack: err.stack });
                    return chunk.map(c => c.value);
                }
            }

            const allTranslated: string[] = [];
            for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
                const batch = chunks.slice(start, Math.min(start + BATCH_SIZE, chunks.length));
                const results = await Promise.allSettled(batch.map((ch, idx) => translateChunk(ch, start + idx)));
                results.forEach((result, idx) => {
                    if (result.status === 'fulfilled') {
                        allTranslated.push(...result.value);
                    } else {
                        logger.warn('Chunk translation promise rejected', { batchStart: start, chunkIndex: idx, error: result.reason });
                        // Fallback: add original strings
                        const chunkIdx = start + idx;
                        const chunk = chunks[chunkIdx];
                        allTranslated.push(...chunk.map(c => c.value));
                    }
                });
            }

            if (allTranslated.length !== extracted.length) {
                const errorInfo = errorService.validation(`Total mismatch: expected ${extracted.length}, got ${allTranslated.length}`, { expected: extracted.length, got: allTranslated.length });
                logErrorInfo(logger, 'error', 'Translation length mismatch', errorInfo);
                throw new Error(errorInfo.message);
            }

            const result = bindTranslatedStrings(json, extracted, allTranslated);
            return { success: true, data: result, error: issues.length ? `Completed with ${issues.length} soft issues` : undefined };
        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.aiModel(err.message, {
                sourceLanguage: context?.sourceLanguage,
                targetLanguage: context?.targetLanguage,
                step: 'inbox-translation',
                stack: err.stack
            });
            logErrorInfo(logger, 'error', 'Inbox translation failed', errorInfo);
            return createToolErrorResponse(errorInfo);
        }
    }
});
