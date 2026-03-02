/**
 * Email content alignment normalizer
 *
 * Problem: Card layout prompt previously used text-align: center for the whole content block,
 * causing greeting and body paragraphs to be centered. Professional emails should have
 * greeting, body, and signature left-aligned; only logo and CTA button may be centered.
 *
 * Fix: Change text-align: center to text-align: left on content <td> (those with
 * font-family, line-height, or font-size). Logo and button <td> are left unchanged.
 */

import { getLogger } from '../core/logger';

const logger = getLogger('EmailContentAlignNormalizer');

/**
 * Replace text-align: center with text-align: left on content <td> elements.
 * Content td: has font-family/line-height/font-size in style, OR is followed by <p>
 * (logo/button td typically have only img/a, no font or <p>).
 */
export function normalizeEmailContentAlign(html: string): string {
  if (!html || typeof html !== 'string') return html;
  if (!html.includes('text-align') || !html.includes('center')) return html;

  // Match <td ... style='...'> where style contains text-align: center
  const tdRegex = /<td([^>]*)style=(['"])([^'"]*)(['"])([^>]*)>/gi;

  const result = html.replace(tdRegex, (match, before, quote, styleContent, quoteEnd, after) => {
    if (!/text-align:\s*center/i.test(styleContent)) return match;

    // Content td: has font-family, line-height, or font-size (excludes logo/button td)
    const hasContentStyle =
      /font-family/i.test(styleContent) ||
      /line-height/i.test(styleContent) ||
      /font-size/i.test(styleContent);

    if (hasContentStyle) {
      const newStyle = styleContent.replace(/text-align:\s*center/gi, 'text-align: left');
      return `<td${before}style=${quote}${newStyle}${quoteEnd}${after}>`;
    }

    return match;
  });

  if (result !== html) {
    logger.info('✅ Normalized email content alignment (greeting/body left-aligned)');
  }

  return result;
}
