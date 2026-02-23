/**
 * Email card width normalizer
 *
 * Problem: LLM sometimes uses max-width: 420px for the inner card table (copied from landing page patterns).
 * 420px is fine for login forms but too narrow for email content (paragraphs, lists, signatures).
 *
 * Fix: Widen inner card tables from 420px to EMAIL_CARD_MAX_WIDTH_PX (560px) when they look like content cards.
 */

import { PHISHING_EMAIL } from '../../constants';
import { getLogger } from '../core/logger';

const logger = getLogger('EmailCardWidthNormalizer');

const NARROW_CARD_PX = 420;
const TARGET_PX = PHISHING_EMAIL.EMAIL_CARD_MAX_WIDTH_PX;

/**
 * Replace max-width: 420px with target width on nested card tables (white bg + border-radius).
 * Only targets tables that look like content cards, not arbitrary 420px elements.
 */
export function normalizeEmailCardWidth(html: string): string {
  if (!html || typeof html !== 'string') return html;
  if (!html.includes('max-width') || !html.includes(`${NARROW_CARD_PX}px`)) return html;

  // Pattern: nested table with max-width:420px and card-like styles (background, border-radius)
  const cardTableRegex = /(<table[^>]*style=['"])([^'"]*max-width:\s*420px[^'"]*)(['"][^>]*>)/gi;

  const result = html.replace(cardTableRegex, (match, prefix, styleContent, suffix) => {
    // Only widen if it looks like a card (has white bg + rounded corners)
    const lower = styleContent.toLowerCase();
    const isCard =
      (lower.includes('background') && (lower.includes('#fff') || lower.includes('white'))) &&
      (lower.includes('border-radius') || lower.includes('box-shadow'));

    if (!isCard) return match;

    const newStyle = styleContent.replace(
      /max-width:\s*420px/gi,
      `max-width: ${TARGET_PX}px`
    );
    return `${prefix}${newStyle}${suffix}`;
  });

  if (result !== html) {
    logger.info('✅ Widened email card from 420px to target width', { targetPx: TARGET_PX });
  }

  return result;
}
