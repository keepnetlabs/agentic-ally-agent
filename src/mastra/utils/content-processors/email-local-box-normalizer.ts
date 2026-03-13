/**
 * Email local box normalizer
 *
 * Fixes two recurring email-only issues from LLM output:
 * 1. Local logo/image background gets applied to a full-width outer <td>
 *    instead of the inner fixed-width box that actually owns it.
 * 2. Unsafe td margins are emitted instead of email-safe padding.
 *
 * Scope is intentionally narrow to avoid broad layout mutations.
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
  value?: string;
}

type BoxSides = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
};

const logger = getLogger('EmailLocalBoxNormalizer');
const MAX_LOCAL_BOX_WIDTH_PX = 320;

function isElement(node: unknown): node is HtmlNode {
  return !!node && typeof node === 'object' && 'nodeName' in (node as Record<string, unknown>);
}

function nodeName(node: HtmlNode): string {
  return (node.nodeName ?? '').toLowerCase();
}

function getAttr(node: HtmlNode, name: string): string | undefined {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  const found = attrs.find(attr => attr.name.toLowerCase() === name.toLowerCase());
  return found?.value;
}

function setAttr(node: HtmlNode, name: string, value: string): void {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  const index = attrs.findIndex(attr => attr.name.toLowerCase() === name.toLowerCase());
  if (index >= 0) {
    attrs[index] = { name, value };
  } else {
    attrs.push({ name, value });
  }
  node.attrs = attrs;
}

function removeAttr(node: HtmlNode, name: string): void {
  const attrs = Array.isArray(node.attrs) ? node.attrs : [];
  node.attrs = attrs.filter(attr => attr.name.toLowerCase() !== name.toLowerCase());
}

function splitStyle(style: string): string[] {
  return style
    .split(';')
    .map(part => part.trim())
    .filter(Boolean);
}

function joinStyle(parts: string[]): string {
  if (parts.length === 0) return '';
  return parts.join('; ') + ';';
}

function getDeclValue(parts: string[], key: string): string | undefined {
  const decl = parts.find(part => part.split(':')[0]?.trim().toLowerCase() === key.toLowerCase());
  return decl?.split(':').slice(1).join(':').trim();
}

function upsertDecl(parts: string[], key: string, value: string): string[] {
  const lowerKey = key.toLowerCase();
  const next = parts.filter(part => part.split(':')[0]?.trim().toLowerCase() !== lowerKey);
  next.push(`${key}: ${value}`);
  return next;
}

function removeDecls(parts: string[], keys: readonly string[]): string[] {
  const keySet = new Set(keys.map(key => key.toLowerCase()));
  return parts.filter(part => !keySet.has(part.split(':')[0]?.trim().toLowerCase() ?? ''));
}

function hasImageDescendant(node: HtmlNode): boolean {
  const children = Array.isArray(node.childNodes) ? node.childNodes : [];
  for (const child of children) {
    if (!isElement(child)) continue;
    if (nodeName(child) === 'img') return true;
    if (hasImageDescendant(child)) return true;
  }
  return false;
}

function findFirstTdDescendant(node: HtmlNode): HtmlNode | undefined {
  const children = Array.isArray(node.childNodes) ? node.childNodes : [];
  for (const child of children) {
    if (!isElement(child)) continue;
    if (nodeName(child) === 'td') return child;
    const found = findFirstTdDescendant(child);
    if (found) return found;
  }
  return undefined;
}

function findFirstLocalImageTable(node: HtmlNode): HtmlNode | undefined {
  const children = Array.isArray(node.childNodes) ? node.childNodes : [];
  for (const child of children) {
    if (!isElement(child)) continue;
    if (nodeName(child) === 'table') {
      const width = getExplicitWidthPx(child);
      if (width !== undefined && width <= MAX_LOCAL_BOX_WIDTH_PX && hasImageDescendant(child)) {
        return child;
      }
    }
    const found = findFirstLocalImageTable(child);
    if (found) return found;
  }
  return undefined;
}

function findFirstExistingLocalBoxOwner(node: HtmlNode): HtmlNode | undefined {
  const children = Array.isArray(node.childNodes) ? node.childNodes : [];
  for (const child of children) {
    if (!isElement(child)) continue;

    const name = nodeName(child);
    if (name !== 'img') {
      const width = getExplicitWidthPx(child);
      if (width !== undefined && width <= MAX_LOCAL_BOX_WIDTH_PX && hasImageDescendant(child)) {
        return child;
      }
    }

    const found = findFirstExistingLocalBoxOwner(child);
    if (found) return found;
  }
  return undefined;
}

function getExplicitWidthPx(node: HtmlNode): number | undefined {
  const widthAttr = getAttr(node, 'width');
  if (widthAttr && !widthAttr.includes('%')) {
    const parsed = parseFloat(widthAttr);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  const style = getAttr(node, 'style') ?? '';
  const widthMatch = style.match(/(?:^|;)\s*width\s*:\s*([0-9.]+)px/i);
  if (widthMatch?.[1]) return parseFloat(widthMatch[1]);

  const maxWidthMatch = style.match(/(?:^|;)\s*max-width\s*:\s*([0-9.]+)px/i);
  if (maxWidthMatch?.[1]) return parseFloat(maxWidthMatch[1]);

  return undefined;
}

function resolveShorthandBox(value: string): BoxSides {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length === 0) return {};
  if (tokens.length === 1) {
    return { top: tokens[0], right: tokens[0], bottom: tokens[0], left: tokens[0] };
  }
  if (tokens.length === 2) {
    return { top: tokens[0], right: tokens[1], bottom: tokens[0], left: tokens[1] };
  }
  if (tokens.length === 3) {
    return { top: tokens[0], right: tokens[1], bottom: tokens[2], left: tokens[1] };
  }
  return { top: tokens[0], right: tokens[1], bottom: tokens[2], left: tokens[3] };
}

function isAutoValue(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'auto';
}

function isZeroValue(value: string | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === '0' || normalized === '0px';
}

function migrateTdMarginsToPadding(td: HtmlNode): boolean {
  const style = getAttr(td, 'style');
  if (!style || !style.toLowerCase().includes('margin')) return false;

  let parts = splitStyle(style);
  const marginBox = resolveShorthandBox(getDeclValue(parts, 'margin') ?? '');

  const sides: BoxSides = {
    top: getDeclValue(parts, 'margin-top') ?? marginBox.top,
    right: getDeclValue(parts, 'margin-right') ?? marginBox.right,
    bottom: getDeclValue(parts, 'margin-bottom') ?? marginBox.bottom,
    left: getDeclValue(parts, 'margin-left') ?? marginBox.left,
  };

  // For <td> elements, margin-based centering (margin: auto) does NOT work in email clients.
  // Outlook and most email renderers ignore margins on <td> entirely.
  // So we always migrate top/bottom spacing to padding, even when auto margins are present.
  // The loop below already skips auto values (line: if isAutoValue → continue),
  // so only real spacing values (e.g. 30px) get converted to padding.

  parts = removeDecls(parts, ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left']);

  const mappings: Array<[keyof BoxSides, string]> = [
    ['top', 'padding-top'],
    ['right', 'padding-right'],
    ['bottom', 'padding-bottom'],
    ['left', 'padding-left'],
  ];

  for (const [sideKey, paddingKey] of mappings) {
    const marginValue = sides[sideKey];
    if (!marginValue || isAutoValue(marginValue)) continue;

    const existingPadding = getDeclValue(parts, paddingKey);
    if (!existingPadding || isZeroValue(existingPadding)) {
      parts = upsertDecl(parts, paddingKey, marginValue);
    }
  }

  const nextStyle = joinStyle(parts);
  if (nextStyle === style) return false;
  if (nextStyle) setAttr(td, 'style', nextStyle);
  else removeAttr(td, 'style');
  return true;
}

function moveLocalBackgroundOwnership(outerTd: HtmlNode): boolean {
  const outerStyle = getAttr(outerTd, 'style') ?? '';
  const outerParts = splitStyle(outerStyle);
  const bgColor = getDeclValue(outerParts, 'background-color');
  const bg = getDeclValue(outerParts, 'background');
  const borderRadius = getDeclValue(outerParts, 'border-radius');
  const bgcolorAttr = getAttr(outerTd, 'bgcolor');

  if (!bgColor && !bg && !bgcolorAttr) return false;

  const localImageTable = findFirstLocalImageTable(outerTd);
  const existingLocalBoxOwner = findFirstExistingLocalBoxOwner(outerTd);
  let innerNode: HtmlNode | undefined;

  if (localImageTable) {
    innerNode = findFirstTdDescendant(localImageTable);
  } else if (existingLocalBoxOwner) {
    innerNode =
      nodeName(existingLocalBoxOwner) === 'table'
        ? findFirstTdDescendant(existingLocalBoxOwner) ?? existingLocalBoxOwner
        : existingLocalBoxOwner;
  }

  if (!innerNode) return false;

  let innerParts = splitStyle(getAttr(innerNode, 'style') ?? '');

  if (bgColor && !getDeclValue(innerParts, 'background-color')) {
    innerParts = upsertDecl(innerParts, 'background-color', bgColor);
  }
  if (bg && !getDeclValue(innerParts, 'background')) {
    innerParts = upsertDecl(innerParts, 'background', bg);
  }
  if (borderRadius && !getDeclValue(innerParts, 'border-radius')) {
    innerParts = upsertDecl(innerParts, 'border-radius', borderRadius);
  }
  if (bgcolorAttr && !getAttr(innerNode, 'bgcolor')) {
    setAttr(innerNode, 'bgcolor', bgcolorAttr);
  }

  setAttr(innerNode, 'style', joinStyle(innerParts));

  const cleanedOuterParts = removeDecls(outerParts, ['background-color', 'background']);
  const nextOuterStyle = joinStyle(cleanedOuterParts);
  if (nextOuterStyle) setAttr(outerTd, 'style', nextOuterStyle);
  else removeAttr(outerTd, 'style');
  if (bgcolorAttr) removeAttr(outerTd, 'bgcolor');

  return true;
}

/**
 * Migrates margin from a <table> element to the parent <td>'s padding.
 * Email clients (especially Outlook) ignore margin on <table> elements.
 * The AI often places margin-top/margin-bottom on inner <table> wrappers
 * when converting from flex/div layouts — these need to become padding
 * on the enclosing <td>.
 */
function migrateTableMarginToParentTd(table: HtmlNode, parentTd: HtmlNode): boolean {
  const tableStyle = getAttr(table, 'style');
  if (!tableStyle || !tableStyle.toLowerCase().includes('margin')) return false;

  let tableParts = splitStyle(tableStyle);
  const marginBox = resolveShorthandBox(getDeclValue(tableParts, 'margin') ?? '');

  const sides: BoxSides = {
    top: getDeclValue(tableParts, 'margin-top') ?? marginBox.top,
    bottom: getDeclValue(tableParts, 'margin-bottom') ?? marginBox.bottom,
  };

  // Only migrate top/bottom — horizontal margins on tables are irrelevant
  const hasTop = sides.top && !isAutoValue(sides.top) && !isZeroValue(sides.top);
  const hasBottom = sides.bottom && !isAutoValue(sides.bottom) && !isZeroValue(sides.bottom);
  if (!hasTop && !hasBottom) return false;

  // Remove margin from <table>
  tableParts = removeDecls(tableParts, ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left']);
  const nextTableStyle = joinStyle(tableParts);
  if (nextTableStyle) setAttr(table, 'style', nextTableStyle);
  else removeAttr(table, 'style');

  // Add spacing to parent <td> as padding
  let tdParts = splitStyle(getAttr(parentTd, 'style') ?? '');
  if (hasTop && sides.top) {
    const existing = getDeclValue(tdParts, 'padding-top');
    if (!existing || isZeroValue(existing)) {
      tdParts = upsertDecl(tdParts, 'padding-top', sides.top);
    }
  }
  if (hasBottom && sides.bottom) {
    const existing = getDeclValue(tdParts, 'padding-bottom');
    if (!existing || isZeroValue(existing)) {
      tdParts = upsertDecl(tdParts, 'padding-bottom', sides.bottom);
    }
  }
  setAttr(parentTd, 'style', joinStyle(tdParts));

  return true;
}

function primaryNormalize(html: string): { html: string; changed: boolean } {
  const fragment = parse5.parseFragment(html);
  const root = fragment as unknown as HtmlNode;
  let changed = false;

  const visit = (node: HtmlNode): void => {
    const children = Array.isArray(node.childNodes) ? node.childNodes : [];
    for (const child of children) {
      if (!isElement(child)) continue;

      if (nodeName(child) === 'td') {
        const normalizedMargins = migrateTdMarginsToPadding(child);
        const movedBackground = moveLocalBackgroundOwnership(child);

        // Check child <table> elements for margin → migrate to this <td>'s padding
        const tdChildren = Array.isArray(child.childNodes) ? child.childNodes : [];
        for (const grandchild of tdChildren) {
          if (isElement(grandchild) && nodeName(grandchild) === 'table') {
            if (migrateTableMarginToParentTd(grandchild, child)) changed = true;
          }
        }

        if (normalizedMargins || movedBackground) changed = true;
        if (movedBackground) continue;
      }

      visit(child);
    }
  };

  if (isElement(root)) visit(root);

  return { html: parse5.serialize(fragment), changed };
}

function regexFallback(html: string): string {
  return html.replace(/<td\b([^>]*)style=(['"])([^'"]*)(\2)([^>]*)>/gi, (match, before, quote, style, _q, after) => {
    const parts = splitStyle(String(style));
    const margin = getDeclValue(parts, 'margin');
    if (!margin) return match;

    const box = resolveShorthandBox(margin);
    const nextParts = removeDecls(parts, ['margin']);
    if (box.bottom && !isAutoValue(box.bottom) && !getDeclValue(nextParts, 'padding-bottom')) {
      nextParts.push(`padding-bottom: ${box.bottom}`);
    }
    if (box.top && !isAutoValue(box.top) && !getDeclValue(nextParts, 'padding-top')) {
      nextParts.push(`padding-top: ${box.top}`);
    }
    return `<td${before}style=${quote}${joinStyle(nextParts)}${quote}${after}>`;
  });
}

export function normalizeEmailLocalBoxes(html: string): string {
  if (!html || typeof html !== 'string') return html;
  if (!html.includes('<td')) return html;

  try {
    const result = primaryNormalize(html);
    if (result.changed) {
      logger.info('✅ Normalized email local boxes', {
        movedLocalBackgrounds: true,
        normalizedTdMargins: true,
      });
    }
    return result.html;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('⚠️ Primary email local box normalization failed, using fallback', { error: err.message });
    try {
      return regexFallback(html);
    } catch (fallbackError) {
      const fallbackErr = normalizeError(fallbackError);
      logger.warn('⚠️ Fallback email local box normalization failed, returning original', {
        error: fallbackErr.message,
      });
      return html;
    }
  }
}
