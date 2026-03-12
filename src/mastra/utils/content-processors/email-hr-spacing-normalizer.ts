/**
 * Email HR / separator spacing normalizer
 *
 * Problem:
 * - GrapeJS uses table-based separators instead of <hr>:
 *     <table><tr><td style="border-top: 0.5px solid ...; padding: 0;">
 * - The border-top draws the line at the td's top edge but there's zero spacing
 *   around the line (padding: 0, no margin on the table).
 * - CSS box model: margin → border → padding → content.
 *   To add space around the border-top line, we need margin on the table.
 *
 * Fix:
 * - After a closing </table> (content boundary), find the next separator table
 *   and add margin-top + margin-bottom to the <table> element's style.
 * - ALL separator tables get margin-bottom (space below the line).
 * - Detects both zero-padding separators (padding: 0) and asymmetric ones (padding: 0 0 36px 0).
 * - Also handles real <hr> elements (symmetric margin fix).
 *
 * Never throws: returns original on error.
 */

import { getLogger } from '../core/logger';

const logger = getLogger('EmailHrSpacingNormalizer');

const DEFAULT_SEPARATOR_SPACING_PX = 36;

/** Check if a style string contains border-top (separator indicator) */
function hasBorderTop(style: string): boolean {
  return /border-top\s*:/i.test(style);
}

/**
 * Determine the spacing (margin-top) to add to a separator table.
 *
 * Returns the appropriate pixel value:
 * - If td has asymmetric padding (0 top, N bottom): returns N
 * - If td has zero/flat padding: returns default (36px)
 * - If td already has non-zero top padding: returns null (already spaced)
 */
function getSeparatorSpacingPx(style: string): number | null {
  // Case 1: Asymmetric shorthand — padding: 0 0 Npx 0
  const asymmetric = style.match(
    /padding\s*:\s*0(?:px)?\s+\d+(?:px)?\s+(\d+)(?:px)?\s+\d+(?:px)?/i
  );
  if (asymmetric) {
    const bottomPx = parseInt(asymmetric[1], 10);
    return isNaN(bottomPx) || bottomPx === 0 ? DEFAULT_SEPARATOR_SPACING_PX : bottomPx;
  }

  // Case 2: All-zero padding — padding: 0 (with or without px)
  if (/padding\s*:\s*0(?:px)?(?:\s*;|$)/i.test(style)) {
    return DEFAULT_SEPARATOR_SPACING_PX;
  }

  // Case 3: Explicit padding-top: 0 (zero-padding separator with longhand)
  if (/padding-top\s*:\s*0(?:px)?/i.test(style) && /padding-bottom\s*:\s*0(?:px)?/i.test(style)) {
    return DEFAULT_SEPARATOR_SPACING_PX;
  }

  // Already has non-zero padding → skip
  return null;
}

/**
 * Injects margin declarations into a <table> tag's style attribute.
 * Returns the modified attrs+close string, or null if no change needed.
 */
function addMarginToTable(
  tableAttrsAndClose: string,
  margins: { top?: number; bottom?: number }
): string | null {
  const declarations: string[] = [];
  if (margins.top !== undefined && !/margin-top\s*:/i.test(tableAttrsAndClose)) {
    declarations.push(`margin-top: ${margins.top}px`);
  }
  if (margins.bottom !== undefined && !/margin-bottom\s*:/i.test(tableAttrsAndClose)) {
    declarations.push(`margin-bottom: ${margins.bottom}px`);
  }
  if (declarations.length === 0) return null;

  const styleInTable = tableAttrsAndClose.match(/style=(['"])([^'"]*)\1/i);
  if (styleInTable) {
    const currentStyle = styleInTable[2].trimEnd().replace(/;$/, '');
    const newStyle = `${currentStyle}; ${declarations.join('; ')};`;
    return tableAttrsAndClose.replace(
      /style=(['"])([^'"]*)\1/i,
      `style=$1${newStyle}$1`
    );
  }
  return tableAttrsAndClose.replace(/>/, ` style="${declarations.join('; ')};">`);
}

/**
 * Creates a transparent spacer table for reliable vertical spacing in email HTML.
 * This is the standard email design pattern — universally supported by all clients.
 * margin-top on tables is unreliable in many email renderers, but a fixed-height
 * spacer table always works.
 */
function createSpacerTable(px: number): string {
  return `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse;"><tbody><tr><td style="height: ${px}px; font-size: 0; line-height: 0;">&nbsp;</td></tr></tbody></table>`;
}

/**
 * Checks if a <table>...<td> structure is a separator and returns spacing px.
 * Extracts the <td> tag from the tdPart (which may include <tbody>/<tr> with their own styles).
 */
function detectSeparatorSpacing(tdPart: string): number | null {
  const tdTagMatch = tdPart.match(/<td\b[^>]*>/i);
  if (!tdTagMatch) return null;

  const tdStyleMatch = tdTagMatch[0].match(/style=(['"])([^'"]*)\1/i);
  if (!tdStyleMatch) return null;

  const tdStyle = tdStyleMatch[2];
  if (!hasBorderTop(tdStyle)) return null;
  return getSeparatorSpacingPx(tdStyle);
}

/**
 * Adds vertical margins to separator elements for consistent spacing.
 *
 * Handles three patterns:
 * 1. Table-based separator after </table> (GrapeJS): margin-top + margin-bottom
 * 2. Any separator table (including first): margin-bottom only
 * 3. Real <hr> after </table>: symmetric margin fix
 */
export function normalizeEmailHrSpacing(html: string): string {
  if (!html || typeof html !== 'string') return html;

  const hasSeparator = html.includes('border-top') || html.includes('<hr');
  if (!hasSeparator) return html;

  try {
    let changed = false;

    // Pattern 1: Table-based separators after </table> → spacer table above + margin-bottom
    // Note: margin-top on tables is unreliable in many email renderers.
    // Instead we inject a spacer table (standard email pattern) for the top gap.
    let result = html.replace(
      /(<\/table>\s*)(<table\b)([^>]*>)((?:\s*<tbody[^>]*>)?\s*(?:<tr[^>]*>)?\s*<td\b[^>]*>)/gi,
      (match, tableClose, tableTag, tableAttrsAndClose, tdPart) => {
        const spacingPx = detectSeparatorSpacing(tdPart);
        if (spacingPx === null) return match;

        // Already has margin-bottom → skip (already processed)
        if (/margin-bottom\s*:/i.test(tableAttrsAndClose)) return match;

        const newAttrs = addMarginToTable(tableAttrsAndClose, { bottom: spacingPx });
        if (!newAttrs) return match;

        changed = true;
        // Spacer table for top gap (reliable) + margin-bottom for bottom gap
        return `${tableClose}${createSpacerTable(spacingPx)}${tableTag}${newAttrs}${tdPart}`;
      }
    );

    // Pattern 2: ANY separator table (including first) → ensure margin-bottom
    // This catches first separators not preceded by </table>
    result = result.replace(
      /(<table\b)([^>]*>)((?:\s*<tbody[^>]*>)?\s*(?:<tr[^>]*>)?\s*<td\b[^>]*>)/gi,
      (match, tableTag, tableAttrsAndClose, tdPart) => {
        // Skip if already has margin-bottom (Pattern 1 already added it)
        if (/margin-bottom\s*:/i.test(tableAttrsAndClose)) return match;

        const spacingPx = detectSeparatorSpacing(tdPart);
        if (spacingPx === null) return match;

        const newAttrs = addMarginToTable(tableAttrsAndClose, { bottom: spacingPx });
        if (!newAttrs) return match;

        changed = true;
        return `${tableTag}${newAttrs}${tdPart}`;
      }
    );

    // Pattern 3: Real <hr> elements after </table>
    result = result.replace(
      /(<\/table>\s*)(<hr\b([^>]*)style=(['"])([^'"]*)\4([^>]*)\/?\s*>)/gi,
      (match, tableClose, _hrFull, prePart, quote, style, postPart) => {
        const marginMatch = style.match(
          /margin\s*:\s*0(?:px)?\s+\d+(?:px)?\s+(\d+)(?:px)?\s+\d+(?:px)?/i
        );

        if (!marginMatch) return match;

        const bottomPx = parseInt(marginMatch[1], 10);
        if (isNaN(bottomPx) || bottomPx === 0) return match;

        const newStyle = style.replace(
          /margin\s*:\s*0(?:px)?\s+\d+(?:px)?\s+\d+(?:px)?\s+\d+(?:px)?/i,
          `margin: ${bottomPx}px 0 ${bottomPx}px 0`
        );

        if (newStyle === style) return match;

        changed = true;
        return `${tableClose}<hr${prePart}style=${quote}${newStyle}${quote}${postPart}>`;
      }
    );

    if (changed) {
      logger.info('✅ Normalized separator vertical spacing after content tables');
    }

    return result;
  } catch {
    return html;
  }
}
