/**
 * Landing page full-document normalizer
 *
 * Some generated landing pages arrive as HTML fragments (missing <html>/<head>/<body>).
 * Browsers may render fragments, but for iframe/standalone usage we want a consistent full document.
 *
 * Policy:
 * - If the HTML already contains <html> tag, do nothing.
 * - Otherwise, wrap into a minimal, standards-friendly document with charset + viewport + title.
 *
 * Never throws.
 */

import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('FullDocumentNormalizer');

function hasHtmlTag(html: string): boolean {
  return /<html\b/i.test(html);
}

function hasDoctype(html: string): boolean {
  return /<!doctype\s+html>/i.test(html);
}

export function ensureLandingFullHtmlDocument(fragmentHtml: string, title = 'Secure Portal'): string {
  if (!fragmentHtml || typeof fragmentHtml !== 'string') return fragmentHtml;

  try {
    // If it's already a full document (or at least declares <html>), don't touch it.
    if (hasHtmlTag(fragmentHtml)) return fragmentHtml;

    // If it includes <head> or <body> without <html>, still wrap conservatively.
    const doctype = hasDoctype(fragmentHtml) ? '' : '<!DOCTYPE html>';
    const wrapped = `${doctype}
<html>
  <head>
    <meta charset='UTF-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <title>${title}</title>
  </head>
  <body>
${fragmentHtml}
  </body>
</html>`;

    logger.info('✅ Wrapped landing page fragment into full HTML document');
    return wrapped;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('⚠️ Failed to wrap landing fragment, returning original', { error: err.message });
    return fragmentHtml;
  }
}
