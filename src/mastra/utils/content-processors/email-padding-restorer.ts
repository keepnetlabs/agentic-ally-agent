/**
 * Restores padding values that the AI stripped from <td> elements.
 *
 * Problem: AI non-deterministically removes padding from content <td> cells,
 * causing text to touch container edges (card padding loss).
 *
 * Fix: Compare AI output with original HTML using GrapeJS element IDs.
 * If a <td> had padding in the original but lost it in AI output, restore it.
 */

interface PaddingInfo {
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingShorthand?: string;
}

/**
 * Extracts padding declarations from an inline style string.
 */
function extractPadding(style: string): PaddingInfo | null {
  const info: PaddingInfo = {};
  let found = false;

  const shorthand = style.match(/(?:^|;)\s*padding\s*:\s*([^;]+)/i);
  if (shorthand) {
    info.paddingShorthand = shorthand[1].trim();
    found = true;
  }

  const top = style.match(/padding-top\s*:\s*([^;]+)/i);
  if (top) { info.paddingTop = top[1].trim(); found = true; }

  const right = style.match(/padding-right\s*:\s*([^;]+)/i);
  if (right) { info.paddingRight = right[1].trim(); found = true; }

  const bottom = style.match(/padding-bottom\s*:\s*([^;]+)/i);
  if (bottom) { info.paddingBottom = bottom[1].trim(); found = true; }

  const left = style.match(/padding-left\s*:\s*([^;]+)/i);
  if (left) { info.paddingLeft = left[1].trim(); found = true; }

  return found ? info : null;
}

/**
 * Checks if a padding value is meaningful (not zero/empty).
 */
function isMeaningfulPadding(info: PaddingInfo): boolean {
  const zeroValues = new Set(['0', '0px', '0%']);

  if (info.paddingShorthand) {
    const parts = info.paddingShorthand.split(/\s+/);
    return parts.some(p => !zeroValues.has(p));
  }

  return [info.paddingTop, info.paddingRight, info.paddingBottom, info.paddingLeft]
    .some(v => v && !zeroValues.has(v));
}

/**
 * Builds a padding CSS string from PaddingInfo.
 */
function buildPaddingCss(info: PaddingInfo): string {
  if (info.paddingShorthand) {
    return `padding: ${info.paddingShorthand}`;
  }

  const parts: string[] = [];
  if (info.paddingTop) parts.push(`padding-top: ${info.paddingTop}`);
  if (info.paddingRight) parts.push(`padding-right: ${info.paddingRight}`);
  if (info.paddingBottom) parts.push(`padding-bottom: ${info.paddingBottom}`);
  if (info.paddingLeft) parts.push(`padding-left: ${info.paddingLeft}`);
  return parts.join('; ');
}

/**
 * Checks if AI output already has padding on the element.
 */
function aiHasPadding(style: string): boolean {
  return /padding(?:-(?:top|right|bottom|left))?\s*:/i.test(style);
}

/**
 * Extracts a map of element ID → padding from HTML.
 * Only targets <td> elements with id and style attributes.
 */
function extractPaddingMap(html: string): Map<string, PaddingInfo> {
  const map = new Map<string, PaddingInfo>();
  const regex = /<td\b[^>]*\bid=["']([^"']+)["'][^>]*style=["']([^"']+)["'][^>]*>|<td\b[^>]*style=["']([^"']+)["'][^>]*\bid=["']([^"']+)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const id = match[1] || match[4];
    const style = match[2] || match[3];
    if (!id || !style) continue;

    const padding = extractPadding(style);
    if (padding && isMeaningfulPadding(padding)) {
      map.set(id, padding);
    }
  }

  return map;
}

/**
 * Restores lost padding on <td> elements by comparing original and AI HTML.
 *
 * Only restores padding when:
 * 1. The element has the same ID in both original and AI output
 * 2. The original had meaningful padding
 * 3. The AI output has NO padding on that element
 *
 * Does NOT override AI padding choices — only fills in when padding is completely missing.
 */
export function restoreLostPadding(originalHtml: string, aiHtml: string): string {
  const originalPaddings = extractPaddingMap(originalHtml);
  if (originalPaddings.size === 0) return aiHtml;

  let result = aiHtml;

  for (const [id, padding] of originalPaddings) {
    // Find the <td> with this id in AI output
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tdRegex = new RegExp(
      `(<td\\b[^>]*\\bid=["']${escapedId}["'][^>]*)(>)`,
      'i'
    );
    const tdMatch = result.match(tdRegex);
    if (!tdMatch) continue;

    const tdOpenTag = tdMatch[1];

    // Only restore if AI completely lost padding
    const styleMatch = tdOpenTag.match(/style=["']([^"']*)/i);
    if (styleMatch && aiHasPadding(styleMatch[1])) continue;

    // Element has no padding in AI output — restore from original
    const paddingCss = buildPaddingCss(padding);

    if (styleMatch) {
      // Has style attribute but no padding — append
      const existingStyle = styleMatch[1].trimEnd().replace(/;$/, '');
      const newStyle = existingStyle ? `${existingStyle}; ${paddingCss}` : paddingCss;
      result = result.replace(tdRegex, `$1`.replace(styleMatch[0], `style="${newStyle}`) + '$2');

      // Safer approach: replace the whole matched opening tag
      const newOpenTag = tdOpenTag.replace(
        /style=["'][^"']*/i,
        `style="${newStyle}`
      );
      result = result.replace(tdMatch[0], newOpenTag + '>');
    } else {
      // No style attribute at all — add one
      result = result.replace(tdRegex, `$1 style="${paddingCss};"$2`);
    }
  }

  return result;
}
