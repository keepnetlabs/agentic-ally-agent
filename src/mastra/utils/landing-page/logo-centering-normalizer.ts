/**
 * Landing page logo centering normalizer
 *
 * Problem:
 * - LLM sometimes generates custom logo/icon divs without parent centering
 * - Fixed-width elements (border-radius: 999px, width: 64px) end up left-aligned
 * - Example: <div style="width: 64px; height: 64px; border-radius: 999px; ...">✓</div>
 *
 * Solution:
 * - Detect fixed-width icon/logo divs (border-radius + flex + width)
 * - Wrap them in a centered container OR add text-align: center to parent
 * - Ensures logos/icons always appear centered
 */

import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('LogoCenteringNormalizer');

/**
 * Detect if a style contains a circular/icon pattern:
 * - border-radius close to 999px (or >= 50%)
 * - fixed width (e.g., 64px, 96px, 128px)
 * - display: flex (self-centering)
 */
function isIconLikeStyle(style: string): boolean {
  const lower = style.toLowerCase();
  const hasBorderRadius = /border-radius\s*:\s*\d+(?:px|%)?/.test(lower);
  const hasFixedWidth = /\bwidth\s*:\s*\d+px/.test(lower);
  const hasFlex = /display\s*:\s*flex/.test(lower);

  return hasBorderRadius && hasFixedWidth && hasFlex;
}

/**
 * Ensure logo/icon divs are properly centered by wrapping or adding centering to parent.
 * This handles the case where LLM generates circular icons/logos without parent centering.
 */
export function normalizeLandingLogoCentering(html: string): string {
  if (!html || typeof html !== 'string') return html;

  try {
    let changed = false;

    // Find all divs with icon-like styles
    const iconDivPattern = /<div\b([^>]*style=['"])([^'"]*border-radius[^'"]*display:\s*flex[^'"]*['"])([^>]*)>/gi;
    let match;
    const matches: Array<{ full: string; attrs: string; style: string; index: number }> = [];

    // Collect all matches first (to avoid replacement index shifting)
    while ((match = iconDivPattern.exec(html)) !== null) {
      const fullMatch = match[0];
      const style = match[2];

      // Only target icon-like elements
      if (isIconLikeStyle(style)) {
        matches.push({
          full: fullMatch,
          attrs: match[1],
          style: style,
          index: match.index,
        });
      }
    }

    if (matches.length === 0) return html;

    // Process matches in reverse order to maintain indices
    let result = html;
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const before = result.substring(0, m.index);
      const after = result.substring(m.index + m.full.length);

      // Wrap the icon div with a centered container
      const wrappedDiv = `<div style='display: flex; justify-content: center; margin-bottom: 24px;'>${m.full}</div>`;
      result = before + wrappedDiv + after;
      changed = true;
    }

    if (changed) {
      logger.info('✅ Normalized landing logo centering (wrapped icon divs with centered container)');
    }
    return result;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('⚠️ Logo centering normalization failed, continuing', { error: err.message });
    return html;
  }
}
