/**
 * Landing page form centering normalizer
 *
 * Problem:
 * - LLM sometimes outputs <form style="width:100%; max-width:400px;"> but forgets margin: 0 auto;
 * - In non-flex layouts this can render left-aligned.
 *
 * Goal:
 * - If a <form> has max-width in its inline style but does NOT specify margin, add `margin: 0 auto;`.
 * - Conservative: do not override an explicit margin already present.
 *
 * Never throws: 3-level fallback.
 */

import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('FormCenteringNormalizer');

function hasMaxWidth(style: string): boolean {
    return /max-width\s*:\s*\d+/i.test(style);
}

function hasMargin(style: string): boolean {
    return /\bmargin\s*:/i.test(style);
}

function hasWidth100(style: string): boolean {
    return /\bwidth\s*:\s*100%/i.test(style);
}

function hasAutoMargin(style: string): boolean {
    return /\bmargin\s*:\s*[^;]*\bauto\b/i.test(style);
}

function ensureTrailingSemicolon(style: string): string {
    const trimmed = style.trim();
    if (!trimmed) return '';
    return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
}

export function normalizeLandingFormCentering(html: string): string {
    if (!html || typeof html !== 'string') return html;
    if (!html.toLowerCase().includes('<form')) return html;

    try {
        // Level 1: attribute-aware replacement
        let changed = false;
        const out = html.replace(/<form\b([^>]*)>/gi, (full, attrsRaw) => {
            const attrs = String(attrsRaw ?? '');
            const styleMatch = attrs.match(/\bstyle\s*=\s*(['"])(.*?)\1/i);
            if (!styleMatch) return full;

            const style = String(styleMatch[2] ?? '');
            if (!hasMaxWidth(style)) return full;
            if (hasMargin(style)) return full;

            const nextStyle = `margin: 0 auto; ${ensureTrailingSemicolon(style)}`.trim();
            const nextAttrs = attrs.replace(/\bstyle\s*=\s*(['"])(.*?)\1/i, `style='${nextStyle}'`);
            changed = true;
            return `<form${nextAttrs}>`;
        });

        if (changed) logger.info('✅ Normalized landing form centering (added margin:0 auto)');
        return out;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('⚠️ Primary landing form centering normalization failed, using fallback', { error: err.message });
        try {
            // Level 2: simple regex best-effort (only style="...max-width..." without margin)
            return html.replace(/(<form\b[^>]*\bstyle=)(['"])([^'"]*)(\2)/gi, (m, p1, q, style, p4) => {
                const s = String(style);
                if (!hasMaxWidth(s) || hasMargin(s)) return m;
                const next = `margin: 0 auto; ${ensureTrailingSemicolon(s)}`.trim();
                return `${p1}${q}${next}${p4}`;
            });
        } catch (e2) {
            const err2 = normalizeError(e2);
            logger.warn('⚠️ Fallback landing form centering normalization failed, returning original', { error: err2.message });
            // Level 3: guaranteed
            return html;
        }
    }
}

/**
 * Center max-width containers that mistakenly use fixed horizontal margins like `margin: 0 16px;`.
 * This commonly appears on the card wrapper div and causes left alignment when width is capped.
 */
export function normalizeLandingMaxWidthCentering(html: string): string {
    if (!html || typeof html !== 'string') return html;
    if (!html.toLowerCase().includes('max-width')) return html;

    try {
        let changed = false;

        // Replace only on elements where style contains max-width + width:100% and margin uses px on the sides (no auto)
        const out = html.replace(/<(div|section|main|form)\b([^>]*)>/gi, (full, tag, attrsRaw) => {
            const attrs = String(attrsRaw ?? '');
            const styleMatch = attrs.match(/\bstyle\s*=\s*(['"])(.*?)\1/i);
            if (!styleMatch) return full;

            const style = String(styleMatch[2] ?? '');
            const lower = style.toLowerCase();

            if (!hasMaxWidth(lower) || !hasWidth100(lower)) return full;
            if (hasAutoMargin(lower)) return full;

            // If a max-width + width:100% container has NO margin at all, add margin:0 auto for centering.
            // This is a common LLM omission on minimal layouts and causes left-aligned containers.
            if (!hasMargin(lower)) {
                const nextStyle = `margin: 0 auto; ${ensureTrailingSemicolon(style)}`.trim();
                const nextAttrs = attrs.replace(/\bstyle\s*=\s*(['"])(.*?)\1/i, `style='${nextStyle}'`);
                changed = true;
                return `<${tag}${nextAttrs}>`;
            }

            // Only change common "gutter margin" patterns that break centering with max-width
            // Examples: "margin: 0 16px" or "margin:0 16px 0 16px"
            const marginPattern = /\bmargin\s*:\s*0\s+\d+px(?:\s+0\s+\d+px)?\s*;/i;
            if (!marginPattern.test(style)) return full;

            const nextStyle = style.replace(marginPattern, 'margin: 0 auto;');
            const nextAttrs = attrs.replace(/\bstyle\s*=\s*(['"])(.*?)\1/i, `style='${ensureTrailingSemicolon(nextStyle)}'`);
            changed = true;
            return `<${tag}${nextAttrs}>`;
        });

        if (changed) logger.info('✅ Normalized landing max-width container centering (margin:0 auto)');
        return out;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('⚠️ Primary landing max-width centering normalization failed, returning original', { error: err.message });
        return html;
    }
}

/**
 * ENFORCE max-width on form elements that are missing it entirely.
 * This handles the case where LLM omits max-width completely (not just margin).
 * Critical for MINIMAL layouts where max-width is mandatory.
 */
export function enforceMinimalLayoutMaxWidth(html: string): string {
    if (!html || typeof html !== 'string') return html;
    if (!html.toLowerCase().includes('<form')) return html;

    try {
        let changed = false;
        const out = html.replace(/<form\b([^>]*)>/gi, (full, attrsRaw) => {
            const attrs = String(attrsRaw ?? '');
            const styleMatch = attrs.match(/\bstyle\s*=\s*(['"])(.*?)\1/i);

            // If no style attribute at all, add one
            if (!styleMatch) {
                const newStyle = "style='max-width: 400px; width: 100%; margin: 0 auto;'";
                changed = true;
                return `<form${attrs} ${newStyle}>`;
            }

            const style = String(styleMatch[2] ?? '');
            const lower = style.toLowerCase();

            // Already has max-width, skip
            if (/max-width\s*:/i.test(lower)) return full;

            // Form has inline style but missing max-width - add it
            const nextStyle = `max-width: 400px; width: 100%; margin: 0 auto; ${ensureTrailingSemicolon(style)}`.trim();
            const nextAttrs = attrs.replace(/\bstyle\s*=\s*(['"])(.*?)\1/i, `style='${nextStyle}'`);
            changed = true;
            return `<form${nextAttrs}>`;
        });

        if (changed) logger.info('✅ Enforced max-width on form elements (MINIMAL layout fix)');
        return out;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('⚠️ Form max-width enforcement failed, continuing', { error: err.message });
        return html;
    }
}

/**
 * One-shot helper: apply all landing centering normalizations (container + form).
 */
export function normalizeLandingCentering(html: string): string {
    // 1. Enforce max-width on forms that are missing it
    let out = enforceMinimalLayoutMaxWidth(html);
    // 2. Container centering for existing max-width declarations
    out = normalizeLandingMaxWidthCentering(out);
    // 3. Form centering for existing max-width declarations
    return normalizeLandingFormCentering(out);
}


