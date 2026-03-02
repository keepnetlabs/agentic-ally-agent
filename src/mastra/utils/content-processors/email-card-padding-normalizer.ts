/**
 * Email card padding normalizer (Outlook-safe)
 *
 * Problem:
 * - LLM sometimes outputs a "card" table (white background + border radius + shadow)
 *   but forgets to add padding to the inner content <td> (e.g., padding:0).
 * - Corporate Letter layout or other structures may have content <td> with no horizontal padding,
 *   causing text to stick to the left edge (ugly, cramped appearance).
 *
 * Goal:
 * - Ensure the primary content <td> inside a card table has a reasonable padding (default 24px).
 * - Also ensure ALL content-like <td> (in any table) have minimum horizontal padding (24px left/right),
 *   so text never sticks to edges regardless of layout strategy.
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

/**
 * Extracts the horizontal (left/right) padding value from a shorthand padding declaration.
 * Returns 0 if shorthand is not found or value cannot be parsed.
 * CSS shorthand rules: 1 value = all sides; 2 = top/bottom + left/right;
 * 3 = top + left/right + bottom; 4 = top right bottom left.
 */
function getShorthandHorizontalPx(parts: string[]): number {
  const shorthand = parts.find(p => p.split(':')[0]?.trim().toLowerCase() === 'padding');
  if (!shorthand) return 0;
  const val = shorthand.split(':').slice(1).join(':').trim();
  const values = val.split(/\s+/).map(v => parseFloat(v));
  if (values.some(isNaN)) return 0;
  if (values.length === 1) return values[0];                          // all sides
  if (values.length === 2) return values[1];                          // left/right
  if (values.length === 3) return values[1];                          // left/right
  if (values.length === 4) return Math.min(values[1], values[3]);     // right, left
  return 0;
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

/** Check if td contains text content (p, span, or has font-related styles) */
function isContentTd(td: HtmlNode): boolean {
  const style = (getAttr(td, 'style') ?? '').toLowerCase();
  const hasFontStyle =
    style.includes('font-family') || style.includes('line-height') || style.includes('font-size');
  if (hasFontStyle) return true;
  const children = Array.isArray(td.childNodes) ? td.childNodes : [];
  for (const c of children) {
    if (!isElement(c)) continue;
    const name = nodeName(c);
    if (name === 'p' || name === 'span' || name === 'div') return true;
  }
  return false;
}

const MIN_HORIZONTAL_PADDING_PX = 20;

function ensureTdHorizontalPadding(td: HtmlNode, defaultPaddingPx: number): boolean {
  const style = getAttr(td, 'style') ?? '';
  const parts = splitStyle(style);
  const hasLeft = hasDecl(parts, 'padding-left');
  const hasRight = hasDecl(parts, 'padding-right');
  const hasShorthand = hasDecl(parts, 'padding');

  let needsLeft = !hasLeft;
  let needsRight = !hasRight;

  if (hasShorthand) {
    const horiz = getShorthandHorizontalPx(parts);
    if (horiz >= MIN_HORIZONTAL_PADDING_PX) return false;
    needsLeft = needsRight = true;
  }

  if (!needsLeft && !needsRight) return false;

  const newDecls: string[] = [];
  if (needsLeft) newDecls.push(`padding-left: ${defaultPaddingPx}px`);
  if (needsRight) newDecls.push(`padding-right: ${defaultPaddingPx}px`);
  const nextParts = [...parts, ...newDecls];
  setAttr(td, 'style', joinStyle(nextParts));
  return true;
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
            // Fix horizontal padding only when the shorthand has zero horizontal component:
            // 1. "padding: 0"      → replacePaddingZero → "padding: 24px" (all sides fixed)
            // 2. "padding: 12px 0" → shorthandHoriz=0  → append padding-left/right overrides
            // 3. "padding: 20px"   → shorthandHoriz=20 → leave untouched (already has horizontal)
            nextParts = replacePaddingZero(parts, defaultPaddingPx);

            const shorthandHoriz = getShorthandHorizontalPx(nextParts);
            if (!hasLeft && shorthandHoriz === 0) nextParts.push(`padding-left: ${defaultPaddingPx}px`);
            if (!hasRight && shorthandHoriz === 0) nextParts.push(`padding-right: ${defaultPaddingPx}px`);
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

      // Pass 2: Ensure ALL content td (in any table) have minimum horizontal padding.
      // Fixes Corporate Letter layout and other structures where text sticks to left edge.
      if (nodeName(child) === 'table') {
        const tds = findAllTdDescendants(child);
        for (const td of tds) {
          if (!isContentTd(td)) continue;
          if (ensureTdHorizontalPadding(td, defaultPaddingPx)) changed = true;
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
