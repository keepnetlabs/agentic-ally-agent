/**
 * Restores border declarations that the AI stripped despite prompt instructions.
 *
 * Problem: AI non-deterministically removes borders from card containers,
 * dividers, and content boxes during Outlook-compatible table conversion.
 *
 * Fix: Compare AI output with original HTML using GrapeJS element IDs.
 * If border was present in original but missing in AI output, restore it.
 * Never adds borders that weren't in the original.
 */

/**
 * Extracts border-related CSS from an inline style string.
 * Returns the consolidated border declaration(s) or null if none found.
 */
function extractBorderCss(style: string): string | null {
  const declarations: string[] = [];

  // Match shorthand border (e.g., "border: 1px solid #E5E7EB")
  const shorthand = style.match(/(?:^|;)\s*(border\s*:[^;]+)/i);
  if (shorthand) {
    declarations.push(shorthand[1].trim());
  }

  // Match individual border sides (e.g., "border-top: 1px solid #ccc")
  const sidePattern = /(?:^|;)\s*(border-(?:top|right|bottom|left)\s*:[^;]+)/gi;
  let sideMatch: RegExpExecArray | null;
  while ((sideMatch = sidePattern.exec(style)) !== null) {
    declarations.push(sideMatch[1].trim());
  }

  // Match longhand border properties that carry visual meaning
  // (width + style + color for each side)
  if (declarations.length === 0) {
    const meaningful: string[] = [];
    const longhandPattern = /(?:^|;)\s*(border-(?:top|right|bottom|left)-(?:width|style|color)\s*:[^;]+)/gi;
    let lhMatch: RegExpExecArray | null;
    while ((lhMatch = longhandPattern.exec(style)) !== null) {
      const val = lhMatch[1].split(':')[1]?.trim().toLowerCase();
      // Only keep meaningful values — skip noise (0, 0px, none, initial)
      if (val && val !== '0' && val !== '0px' && val !== 'none' && val !== 'initial') {
        meaningful.push(lhMatch[1].trim());
      }
    }
    if (meaningful.length > 0) {
      declarations.push(...meaningful);
    }
  }

  return declarations.length > 0 ? declarations.join('; ') : null;
}

/**
 * Checks if an inline style contains any visible border declaration.
 */
function hasBorder(style: string): boolean {
  // Shorthand border with visible value
  if (/border\s*:\s*(?!0|none|0px)[^;]+/i.test(style)) return true;

  // Side-specific shorthand (border-top: 1px solid ...)
  if (/border-(?:top|right|bottom|left)\s*:\s*(?!0|none|0px)[^;]+/i.test(style)) return true;

  // Longhand border-*-width with non-zero value
  if (/border-(?:top|right|bottom|left)-width\s*:\s*(?!0|0px)[^;]+/i.test(style)) return true;

  return false;
}

/**
 * Extracts a map of element ID → border CSS from HTML.
 * Handles both id-before-style and style-before-id attribute orderings.
 */
function extractBorderMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const regex =
    /\bid=["']([^"']+)["'][^>]*style=["']([^"']+)["']|style=["']([^"']+)["'][^>]*\bid=["']([^"']+)["']/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const id = match[1] || match[4];
    const style = match[2] || match[3];
    if (!id || !style) continue;

    if (hasBorder(style)) {
      const borderCss = extractBorderCss(style);
      if (borderCss) {
        map.set(id, borderCss);
      }
    }
  }

  return map;
}

/**
 * Restores original border on elements where AI removed them.
 *
 * Only restores when:
 * 1. The element has the same ID in both original and AI output
 * 2. The original had a visible border
 * 3. The AI output has NO border on that element
 *
 * Does NOT add borders to elements that never had one.
 * Does NOT override AI border changes (only fills in when border is completely missing).
 */
export function restoreLostBorders(originalHtml: string, aiHtml: string): { html: string; restoredCount: number } {
  const originalBorders = extractBorderMap(originalHtml);
  if (originalBorders.size === 0) return { html: aiHtml, restoredCount: 0 };

  let result = aiHtml;
  let restoredCount = 0;

  for (const [id, originalBorder] of originalBorders) {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const elRegex = new RegExp(
      `(<[^>]*\\bid=["']${escapedId}["'][^>]*)(>)`,
      'i',
    );
    const elMatch = result.match(elRegex);
    if (!elMatch) continue;

    const openTag = elMatch[1];
    const styleMatch = openTag.match(/style=["']([^"']*)/i);

    if (styleMatch && hasBorder(styleMatch[1])) {
      // AI output still has a border — don't override
      continue;
    }

    if (styleMatch) {
      // Has style attribute but no border — append
      const existingStyle = styleMatch[1].trimEnd().replace(/;$/, '');
      const newStyle = existingStyle
        ? `${existingStyle}; ${originalBorder}`
        : originalBorder;
      const newOpenTag = openTag.replace(/style=["'][^"']*/i, `style="${newStyle}`);
      result = result.replace(elMatch[0], newOpenTag + '>');
      restoredCount++;
    } else {
      // No style attribute at all — add one
      const newOpenTag = `${openTag} style="${originalBorder};"`;
      result = result.replace(elMatch[0], newOpenTag + '>');
      restoredCount++;
    }
  }

  return { html: result, restoredCount };
}
