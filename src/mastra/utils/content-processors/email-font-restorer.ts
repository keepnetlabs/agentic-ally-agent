/**
 * Restores font-family values that the AI changed despite prompt instructions.
 *
 * Problem: AI non-deterministically replaces font-family declarations with
 * Arial/Helvetica fallback stacks, even when told to preserve them exactly.
 *
 * Fix: Compare AI output with original HTML using GrapeJS element IDs.
 * If font-family was changed or removed, restore the original value.
 */

/**
 * Extracts a map of element ID → font-family from HTML.
 * Handles both `id="x" ... style="font-family: ..."` and reverse attribute order.
 */
function extractFontFamilyMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const regex =
    /\bid=["']([^"']+)["'][^>]*style=["']([^"']*font-family[^"']*)["']|style=["']([^"']*font-family[^"']*)["'][^>]*\bid=["']([^"']+)["']/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const id = match[1] || match[4];
    const style = match[2] || match[3];
    if (!id || !style) continue;

    const fontMatch = style.match(/font-family\s*:\s*([^;]+)/i);
    if (fontMatch) {
      map.set(id, fontMatch[1].trim());
    }
  }

  return map;
}

/**
 * Restores original font-family on elements where AI changed or removed them.
 *
 * Only restores when:
 * 1. The element has the same ID in both original and AI output
 * 2. The original had a font-family declaration
 * 3. The AI output changed or removed that font-family
 *
 * Does NOT add font-family to elements that never had one.
 */
export function restoreLostFontFamilies(originalHtml: string, aiHtml: string): { html: string; restoredCount: number } {
  const originalFonts = extractFontFamilyMap(originalHtml);
  if (originalFonts.size === 0) return { html: aiHtml, restoredCount: 0 };

  let result = aiHtml;
  let restoredCount = 0;

  for (const [id, originalFont] of originalFonts) {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const elRegex = new RegExp(
      `(<[^>]*\\bid=["']${escapedId}["'][^>]*)(>)`,
      'i',
    );
    const elMatch = result.match(elRegex);
    if (!elMatch) continue;

    const openTag = elMatch[1];
    const styleMatch = openTag.match(/style=["']([^"']*)/i);
    if (!styleMatch) continue; // No style attribute — skip to avoid breaking layout

    const aiFontMatch = styleMatch[1].match(/font-family\s*:\s*([^;]+)/i);
    const aiFont = aiFontMatch ? aiFontMatch[1].trim() : null;

    if (aiFont && aiFont.toLowerCase() !== originalFont.toLowerCase()) {
      // AI changed font-family — restore original
      const newStyle = styleMatch[1].replace(
        /font-family\s*:\s*[^;]+/i,
        `font-family: ${originalFont}`,
      );
      const newOpenTag = openTag.replace(/style=["'][^"']*/i, `style="${newStyle}`);
      result = result.replace(elMatch[0], newOpenTag + '>');
      restoredCount++;
    } else if (!aiFont) {
      // AI removed font-family entirely — re-add
      const existingStyle = styleMatch[1].trimEnd().replace(/;$/, '');
      const newStyle = existingStyle
        ? `${existingStyle}; font-family: ${originalFont}`
        : `font-family: ${originalFont}`;
      const newOpenTag = openTag.replace(/style=["'][^"']*/i, `style="${newStyle}`);
      result = result.replace(elMatch[0], newOpenTag + '>');
      restoredCount++;
    }
  }

  return { html: result, restoredCount };
}
