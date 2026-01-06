/**
 * Centralized post-processors for LLM-generated phishing HTML.
 *
 * Why:
 * - We use multiple small, focused normalizers (industry-standard guardrails).
 * - Having a single, ordered postProcess function per output type keeps pipelines consistent.
 *
 * Never throws: 3-level fallback.
 */

import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';
import { sanitizeHtml } from './html-sanitizer';
import { normalizeEmailNestedTablePadding } from './email-table-padding-normalizer';
import { normalizeEmailCentering } from './email-centering-normalizer';
import { normalizeEmailCardContentPadding } from './email-card-padding-normalizer';
import { repairHtml } from '../validation/json-validation-utils';
import { normalizeLandingCentering, ensureLandingFullHtmlDocument } from '../landing-page';

const logger = getLogger('PhishingHtmlPostprocessors');

export interface PostProcessEmailHtmlParams {
    html: string;
}

export function postProcessPhishingEmailHtml(params: PostProcessEmailHtmlParams): string {
    const { html } = params;
    if (!html || typeof html !== 'string') return html;

    try {
        // Level 1: ordered, deterministic processing
        let out = sanitizeHtml(html);
        out = normalizeEmailNestedTablePadding(out);
        out = normalizeEmailCentering(out);
        out = normalizeEmailCardContentPadding(out, 24);
        return out;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('⚠️ Email post-process failed, using fallback', { error: err.message });
        try {
            // Level 2: minimal sanitize only
            return sanitizeHtml(html);
        } catch {
            // Level 3: guaranteed
            return html;
        }
    }
}

export interface PostProcessLandingHtmlParams {
    html: string;
    title?: string;
}

export function postProcessPhishingLandingHtml(params: PostProcessLandingHtmlParams): string {
    const { html, title } = params;
    if (!html || typeof html !== 'string') return html;

    try {
        // Level 1: sanitize + repair, then UX normalizers
        let out = sanitizeHtml(html);
        out = repairHtml(out);
        out = normalizeLandingCentering(out);
        out = ensureLandingFullHtmlDocument(out, title ?? 'Secure Portal');
        return out;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('⚠️ Landing post-process failed, using fallback', { error: err.message });
        try {
            // Level 2: best-effort wrapper only
            return ensureLandingFullHtmlDocument(html, title ?? 'Secure Portal');
        } catch {
            // Level 3: guaranteed
            return html;
        }
    }
}


