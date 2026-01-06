/**
 * Landing page form-control style preserver
 *
 * Use case:
 * - During localization/editing, LLMs sometimes drop or rewrite inline styles on form controls
 *   (<input>, <textarea>, <select>, <button>), causing the UI to look "broken".
 *
 * Goal:
 * - Preserve the original inline `style` attribute values from the source HTML and apply them
 *   back onto the edited HTML deterministically.
 *
 * Strategy (minimal, resilient):
 * - Extract per-element inline style values from the ORIGINAL HTML in document order (per tag).
 * - In the EDITED HTML, enforce the ORIGINAL inline styles for form controls. This is intentional:
 *   localization/edit operations should never alter form-control CSS, and allowing drift breaks UX.
 * - If counts differ, use the last known original style as fallback for remaining elements.
 *
 * Never throws: 3-level fallback.
 */

import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('LandingFormStylePreserver');

type FormTag = 'input' | 'textarea' | 'select' | 'button';

const FORM_TAGS: readonly FormTag[] = ['input', 'textarea', 'select', 'button'] as const;

function extractStyle(attrs: string): string | undefined {
    const m = attrs.match(/\bstyle\s*=\s*(['"])(.*?)\1/i);
    return m?.[2];
}

function replaceOrAddStyle(attrs: string, style: string): string {
    const hasStyle = /\bstyle\s*=\s*(['"])(.*?)\1/i.test(attrs);
    if (hasStyle) {
        return attrs.replace(/\bstyle\s*=\s*(['"])(.*?)\1/i, `style='${style}'`);
    }
    // Insert style at end of attrs (keep other attrs intact)
    return `${attrs} style='${style}'`.trim();
}

function extractOriginalStylesByTag(html: string): Record<FormTag, Array<string | undefined>> {
    const out: Record<FormTag, Array<string | undefined>> = {
        input: [],
        textarea: [],
        select: [],
        button: [],
    };

    const re = /<(input|textarea|select|button)\b([^>]*)>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
        const tag = String(m[1]).toLowerCase() as FormTag;
        const attrs = String(m[2] ?? '');
        if (!FORM_TAGS.includes(tag)) continue;
        const style = extractStyle(attrs)?.trim();
        out[tag].push(style && style.length > 0 ? style : undefined);
    }

    return out;
}

function applyOriginalStyles(
    editedHtml: string,
    originalStylesByTag: Record<FormTag, Array<string | undefined>>
): string {
    const counters: Record<FormTag, number> = { input: 0, textarea: 0, select: 0, button: 0 };

    return editedHtml.replace(/<(input|textarea|select|button)\b([^>]*)>/gi, (full, tagRaw, attrsRaw) => {
        const tag = String(tagRaw).toLowerCase() as FormTag;
        const attrs = String(attrsRaw ?? '');
        if (!FORM_TAGS.includes(tag)) return full;

        const idx = counters[tag] ?? 0;
        counters[tag] = idx + 1;

        const originals = originalStylesByTag[tag] ?? [];
        if (originals.length === 0) return full;

        const direct = originals[idx];
        const fallback = originals[originals.length - 1];
        const chosen = direct ?? fallback;
        if (!chosen) return full;

        const nextAttrs = replaceOrAddStyle(attrs, chosen);
        return `<${tag} ${nextAttrs}>`;
    });
}

/**
 * Preserve inline styles on form controls from `originalHtml` into `editedHtml`.
 */
export function preserveLandingFormControlStyles(originalHtml: string, editedHtml: string): string {
    if (!originalHtml || typeof originalHtml !== 'string') return editedHtml;
    if (!editedHtml || typeof editedHtml !== 'string') return editedHtml;
    if (!editedHtml.includes('<input') && !editedHtml.includes('<textarea') && !editedHtml.includes('<select') && !editedHtml.includes('<button')) {
        return editedHtml;
    }

    try {
        // Level 1: enforce original styles for form controls (localization-safe)
        const originalStylesByTag = extractOriginalStylesByTag(originalHtml);
        const out = applyOriginalStyles(editedHtml, originalStylesByTag);
        if (out !== editedHtml) logger.info('✅ Preserved landing page form-control styles');
        return out;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('⚠️ Primary style preservation failed, using fallback', { error: err.message });
        try {
            // Level 2: restore ALL INPUT styles using last known original input style
            const originalStylesByTag = extractOriginalStylesByTag(originalHtml);
            const lastInputStyle = originalStylesByTag.input[originalStylesByTag.input.length - 1];
            if (!lastInputStyle) return editedHtml;
            return editedHtml.replace(/<input\b([^>]*)>/gi, (full, attrsRaw) => {
                const attrs = String(attrsRaw ?? '');
                const nextAttrs = replaceOrAddStyle(attrs, lastInputStyle);
                return `<input ${nextAttrs}>`;
            });
        } catch (e2) {
            const err2 = normalizeError(e2);
            logger.warn('⚠️ Fallback style preservation failed, returning edited HTML', { error: err2.message });
            // Level 3: guaranteed
            return editedHtml;
        }
    }
}


