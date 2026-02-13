/**
 * Email centering normalizer (Outlook-safe, minimal)
 *
 * Why this exists:
 * - Some email clients (notably Outlook) ignore CSS centering (e.g., margin: 0 auto).
 * - LLM outputs sometimes omit align='center' wrappers.
 *
 * Approach:
 * - Add `align='center'` to the first <td> that wraps a <table>.
 * - Add/ensure `align='center'` + `margin: 0 auto;` on the first "main container" table
 *   (heuristic: has max-width:600px or width=600).
 *
 * Never throws: 3-level fallback.
 */

import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('EmailCenteringNormalizer');

function upsertAttr(attrs: string, name: string, value: string): string {
  const re = new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, 'i');
  if (re.test(attrs)) {
    return attrs.replace(re, `${name}='${value}'`);
  }
  return `${attrs} ${name}='${value}'`.trim();
}

function upsertStyle(attrs: string, decl: string): string {
  const re = /\bstyle\s*=\s*(['"])(.*?)\1/i;
  if (!re.test(attrs)) {
    return `${attrs} style='${decl};'`.trim();
  }

  return attrs.replace(re, (_m, _q, style: string) => {
    const lower = String(style).toLowerCase();
    const key = decl.split(':')[0]?.trim().toLowerCase();
    if (!key || lower.includes(key)) return `style='${style}'`;
    const sep = String(style).trim().endsWith(';') || String(style).trim().length === 0 ? '' : '; ';
    return `style='${style}${sep}${decl};'`;
  });
}

function centerWrapperTd(html: string): string {
  // Add align='center' to the first <td> that directly contains a <table>
  return html.replace(/<td\b([^>]*)>(\s*<table\b)/i, (m, attrs, next) => {
    if (/\balign\s*=\s*['"]center['"]/i.test(String(attrs))) return m;
    const nextAttrs = upsertAttr(String(attrs), 'align', 'center');
    return `<td ${nextAttrs}>${next}`;
  });
}

function centerMainContainerTable(html: string): string {
  let done = false;
  return html.replace(/<table\b([^>]*)>/gi, (m, attrs) => {
    if (done) return m;
    const lower = String(attrs).toLowerCase();
    const looksMain =
      lower.includes('max-width: 600px') ||
      lower.includes('max-width:600px') ||
      /\bwidth\s*=\s*['"]?\s*600\s*['"]?/i.test(String(attrs));
    if (!looksMain) return m;

    done = true;
    let nextAttrs = String(attrs);
    nextAttrs = upsertAttr(nextAttrs, 'align', 'center');
    nextAttrs = upsertStyle(nextAttrs, 'margin: 0 auto');
    return `<table ${nextAttrs}>`;
  });
}

function conservativeFallback(html: string): string {
  // Keep it extremely small: only wrapper td centering.
  return centerWrapperTd(html);
}

export function normalizeEmailCentering(html: string): string {
  if (!html || typeof html !== 'string') return html;
  if (!html.includes('<table') || !html.includes('<td')) return html;

  try {
    // Level 1: targeted transforms
    let out = html;
    out = centerWrapperTd(out);
    out = centerMainContainerTable(out);

    if (out !== html) logger.info('✅ Normalized email centering (minimal, Outlook-safe)');
    return out;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('⚠️ Primary email centering normalization failed, using fallback', { error: err.message });
    try {
      // Level 2: conservative fallback
      return conservativeFallback(html);
    } catch (e2) {
      const err2 = normalizeError(e2);
      logger.warn('⚠️ Fallback email centering normalization failed, returning original', { error: err2.message });
      // Level 3: guaranteed
      return html;
    }
  }
}
