/**
 * Email card padding normalizer (Outlook-safe)
 *
 * Problem:
 * - LLM sometimes outputs a "card" table (white background + border radius + shadow)
 *   but forgets to add padding to the inner content <td> (e.g., padding:0).
 * - This makes the content visually stick to the card border in many clients.
 *
 * Goal:
 * - Ensure the primary content <td> inside a card table has a reasonable padding (default 24px),
 *   without changing overall structure.
 *
 * Never throws: 3-level fallback.
 */

import * as parse5 from 'parse5';
import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

interface HtmlAttr {
  name: string;
  value: string;
}

interface HtmlNode {
  nodeName?: string;
  attrs?: HtmlAttr[];
  childNodes?: HtmlNode[];
}

const logger = getLogger('EmailCardPaddingNormalizer');

function isElement(node: unknown): node is HtmlNode {
  return !!node && typeof node === 'object' && 'nodeName' in (node as Record<string, unknown>);
}

function nodeName(node: HtmlNode): string {
  return (node.nodeName ?? '').toLowerCase();
}

function getAttr(node: HtmlNode, name: string): string | undefined {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  const found = attrs.find(a => a.name.toLowerCase() === name.toLowerCase());
  return found?.value;
}

function setAttr(node: HtmlNode, name: string, value: string): void {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  const idx = attrs.findIndex(a => a.name.toLowerCase() === name.toLowerCase());
  if (idx >= 0) attrs[idx] = { name, value };
  else attrs.push({ name, value });
  node.attrs = attrs;
}

function splitStyle(style: string): string[] {
  return style
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);
}

function joinStyle(parts: string[]): string {
  if (parts.length === 0) return '';
  return parts.join('; ') + ';';
}

function hasDecl(parts: string[], key: string): boolean {
  const k = key.toLowerCase();
  return parts.some(p => p.split(':')[0]?.trim().toLowerCase() === k);
}

function replacePaddingZero(parts: string[], toPx: number): string[] {
  return parts.map(p => {
    const [kRaw, vRaw] = p.split(':');
    const k = (kRaw ?? '').trim().toLowerCase();
    const v = (vRaw ?? '').trim().toLowerCase();
    if (k === 'padding' && (v === '0' || v === '0px' || v === '0 0' || v === '0 0 0 0')) {
      return `padding: ${toPx}px`;
    }
    return p;
  });
}

function isCardTable(table: HtmlNode): boolean {
  const style = (getAttr(table, 'style') ?? '').toLowerCase();
  // Heuristic: white-ish background + rounded corners
  const hasWhiteBg =
    style.includes('background:#ffffff') ||
    style.includes('background-color:#ffffff') ||
    style.includes('#fff') ||
    style.includes('white');
  const hasRadius = style.includes('border-radius');
  return hasWhiteBg && hasRadius;
}

function findAllTdDescendants(node: HtmlNode): HtmlNode[] {
  const out: HtmlNode[] = [];
  const visit = (n: HtmlNode): void => {
    const children = Array.isArray(n.childNodes) ? n.childNodes : [];
    for (const child of children) {
      if (!isElement(child)) continue;
      if (nodeName(child) === 'td') out.push(child);
      visit(child);
    }
  };
  visit(node);
  return out;
}

function primaryNormalize(html: string, defaultPaddingPx: number): { html: string; changed: boolean } {
  const fragment = parse5.parseFragment(html);
  const root = fragment as unknown as HtmlNode;
  let changed = false;

  const visit = (node: HtmlNode): void => {
    const children = Array.isArray(node.childNodes) ? node.childNodes : [];
    for (const child of children) {
      if (!isElement(child)) continue;

      if (nodeName(child) === 'table' && isCardTable(child)) {
        // Look for the first "content-like" td inside the card.
        // Heuristic: has font-family or line-height (text container), and padding is missing or set to 0.
        const tds = findAllTdDescendants(child);
        for (const td of tds) {
          const style = getAttr(td, 'style') ?? '';
          const lower = style.toLowerCase();
          const isContentLike =
            lower.includes('font-family') || lower.includes('line-height') || lower.includes('font-size');
          if (!isContentLike) continue;

          const parts = splitStyle(style);
          const before = joinStyle(parts);

          // Logic update: We want to ensure specific horizontal padding exists.
          // If padding: shorthand exists, we trust it (or replace if 0).
          // If padding-top exists but no padding-left/right/shorthand, we should inject padding-left/right.

          const hasShorthand = hasDecl(parts, 'padding');
          const hasLeft = hasDecl(parts, 'padding-left');
          const hasRight = hasDecl(parts, 'padding-right');

          let nextParts = parts;

          if (hasShorthand) {
            // Even if shorthand exists (e.g. "padding: 0" or "padding: 12px 0"), we want to enforce horizontal padding if it looks like 0.
            // Simplest safety: replace "padding: 0..." patterns AND blindly append padding-left/right if not specifically set.
            // But if user set "padding: 20px", we don't want to override with 24px.
            // However, "padding: 12px 0" is the bug.
            // Strategy: If shorthand exists, replace strict 0.
            // THEN, if specific left/right are missing, append them as safety overrides IF the shorthand might be zero-ish?
            // Actually, relying on "padding-left: 24px" at the end is safe because:
            // 1. If shorthand was "padding: 20px" -> result "padding: 20px; padding-left: 24px" -> 24px horizontal. Close enough.
            // 2. If shorthand was "padding: 12px 0" -> result "padding: 12px 0; padding-left: 24px" -> Fixed!
            // 3. If shorthand was "padding: 0" -> result "padding: 24px" (via replacePaddingZero) -> Fixed!

            // So, simpler strategy:
            // 1. Run replacePaddingZero (fixes explicit padding:0).
            // 2. Append padding-left/right if NOT specifically present as "padding-left" key.

            nextParts = replacePaddingZero(parts, defaultPaddingPx);

            // Append specific horizontal overrides if missing specific keys
            // This fixes "padding: 12px 0" case by trumping it with specific declaration
            if (!hasLeft) nextParts.push(`padding-left: ${defaultPaddingPx}px`);
            if (!hasRight) nextParts.push(`padding-right: ${defaultPaddingPx}px`);
          } else {
            // No shorthand. Check specific sides.
            const newDecls: string[] = [];
            if (!hasLeft) newDecls.push(`padding-left: ${defaultPaddingPx}px`);
            if (!hasRight) newDecls.push(`padding-right: ${defaultPaddingPx}px`);
            if (newDecls.length > 0) {
              nextParts = [...parts, ...newDecls];
            }
          }

          const after = joinStyle(nextParts);
          if (after !== before) {
            setAttr(td, 'style', after);
            changed = true;
          }

          // REMOVED break; to process ALL rows in the card (e.g. multiple paragraphs)
        }
      }

      visit(child);
    }
  };

  if (isElement(root)) visit(root);

  return { html: parse5.serialize(fragment), changed };
}

function regexFallback(html: string, defaultPaddingPx: number): string {
  // Best-effort: only fix td with font-family and padding:0
  return html.replace(/<td\b([^>]*)style=['"]([^'"]*)['"]([^>]*)>/gi, (m, pre, style, post) => {
    const s = String(style);
    const lower = s.toLowerCase();
    if (!lower.includes('font-family')) return m;
    if (!lower.includes('padding:0') && !lower.includes('padding: 0')) return m;
    const next = s.replace(/padding\s*:\s*0(px)?/i, `padding: ${defaultPaddingPx}px`);
    return `<td${pre}style='${next}'${post}>`;
  });
}

export function normalizeEmailCardContentPadding(html: string, defaultPaddingPx = 24): string {
  if (!html || typeof html !== 'string') return html;
  if (!html.includes('<table') || !html.includes('<td')) return html;

  try {
    // Level 1: parse5-based deterministic fix
    const result = primaryNormalize(html, defaultPaddingPx);
    if (result.changed) logger.info('✅ Normalized email card content padding', { defaultPaddingPx });
    return result.html;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('⚠️ Primary email card padding normalization failed, using fallback', { error: err.message });
    try {
      // Level 2: regex-based best-effort
      return regexFallback(html, defaultPaddingPx);
    } catch (e2) {
      const err2 = normalizeError(e2);
      logger.warn('⚠️ Fallback email card padding normalization failed, returning original', { error: err2.message });
      // Level 3: guaranteed
      return html;
    }
  }
}
