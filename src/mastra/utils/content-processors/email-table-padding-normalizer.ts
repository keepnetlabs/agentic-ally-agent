/**
 * Email table padding normalizer
 *
 * Goal (minimal + deterministic):
 * - If a <table> is nested inside a <td> and the <table> has padding styles, move that padding
 *   onto the containing <td>, because many email clients ignore table padding but respect td padding.
 *
 * This avoids relying on prompt compliance and fixes the specific rendering issue without changing
 * broader structure/styling choices.
 *
 * Never throws: 3-level fallback.
 */

import * as parse5 from 'parse5';
import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('EmailTablePaddingNormalizer');

interface HtmlAttr {
    name: string;
    value: string;
}

interface HtmlNode {
    nodeName?: string;
    attrs?: HtmlAttr[];
    childNodes?: HtmlNode[];
}

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

function removeAttr(node: HtmlNode, name: string): void {
    const attrs = Array.isArray(node.attrs) ? node.attrs : [];
    node.attrs = attrs.filter(a => a.name.toLowerCase() !== name.toLowerCase());
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

function extractPaddingDecls(style: string): { paddingDecls: string[]; rest: string[] } {
    const parts = splitStyle(style);
    const paddingDecls: string[] = [];
    const rest: string[] = [];

    for (const part of parts) {
        const key = part.split(':')[0]?.trim().toLowerCase();
        if (key && key.startsWith('padding')) paddingDecls.push(part);
        else rest.push(part);
    }

    return { paddingDecls, rest };
}

function tdHasPaddingStyle(td: HtmlNode): boolean {
    const style = (getAttr(td, 'style') ?? '').toLowerCase();
    return style.includes('padding');
}

function moveNestedTablePadding(table: HtmlNode, containingTd: HtmlNode): boolean {
    const tableStyle = getAttr(table, 'style');
    if (!tableStyle) return false;

    const { paddingDecls, rest } = extractPaddingDecls(tableStyle);
    if (paddingDecls.length === 0) return false;

    // If td already has padding, do NOT remove padding from table (avoid accidental padding loss
    // in clients that might respect table padding). In that case, we leave as-is.
    if (tdHasPaddingStyle(containingTd)) {
        return false;
    }

    const tdStyle = getAttr(containingTd, 'style') ?? '';
    const tdParts = splitStyle(tdStyle);
    const merged = joinStyle([...tdParts, ...paddingDecls]);
    setAttr(containingTd, 'style', merged);

    const newTableStyle = joinStyle(rest);
    if (newTableStyle) setAttr(table, 'style', newTableStyle);
    else removeAttr(table, 'style');

    return true;
}

function primaryNormalize(html: string): { html: string; movedCount: number } {
    const fragment = parse5.parseFragment(html);
    const root = fragment as unknown as HtmlNode;
    let movedCount = 0;

    const visit = (node: HtmlNode, parent?: HtmlNode): void => {
        const children = Array.isArray(node.childNodes) ? node.childNodes : [];

        // We care specifically about: td -> table (direct child)
        if (nodeName(node) === 'table' && parent && nodeName(parent) === 'td') {
            if (moveNestedTablePadding(node, parent)) movedCount += 1;
        }

        for (const child of children) {
            if (isElement(child)) visit(child, node);
        }
    };

    if (isElement(root)) visit(root);

    return { html: parse5.serialize(fragment), movedCount };
}

function regexFallback(html: string): string {
    // Best-effort: remove padding declarations from table style attributes.
    // We cannot reliably add to the correct <td> without a parser, so this fallback is conservative.
    return html.replace(/(<table\b[^>]*\bstyle=)(['"])([^'"]*)(\2)/gi, (m, p1, q, style, p4) => {
        const { rest } = extractPaddingDecls(String(style));
        const next = joinStyle(rest);
        // If all style removed, keep as empty style to avoid breaking quoting.
        return `${p1}${q}${next}${p4}`;
    });
}

/**
 * Normalize nested table padding for email client compatibility.
 */
export function normalizeEmailNestedTablePadding(html: string): string {
    if (!html || typeof html !== 'string') return html;
    // Fast exits: avoid parse cost unless we see likely candidates
    if (!html.includes('<table')) return html;
    if (!html.toLowerCase().includes('padding')) return html;
    if (!html.includes('<td')) return html;

    try {
        // Level 1: parse5-based migration
        const result = primaryNormalize(html);
        if (result.movedCount > 0) {
            logger.info('✅ Moved nested table padding to containing td', { movedCount: result.movedCount });
        }
        return result.html;
    } catch (error) {
        const err = normalizeError(error);
        logger.warn('⚠️ Primary nested table padding normalization failed, using fallback', { error: err.message });
        try {
            // Level 2: conservative regex cleanup
            return regexFallback(html);
        } catch (e2) {
            const err2 = normalizeError(e2);
            logger.warn('⚠️ Fallback normalization failed, returning original', { error: err2.message });
            // Level 3: guaranteed
            return html;
        }
    }
}


