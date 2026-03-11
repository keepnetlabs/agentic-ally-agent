/**
 * Normalizes CTA button/link divs inside email <td> cells.
 *
 * Problem: LLM generates `<div>` wrappers around CTA links inside `<td>` cells.
 * A `<div>` (block element) sitting alongside text nodes inside a `<td>` is
 * technically invalid mixed block/inline HTML. GrapeJS cannot assign component
 * boundaries to the orphaned text nodes, making them non-selectable/non-editable.
 *
 * Pattern detected:
 *   <td>
 *     Hello {FIRSTNAME},...<br>
 *     <div [style]><a href="{PHISHINGURL}">Verify Account</a></div>   ← block div in td
 *     If you have already...
 *   </td>
 *
 * Fix: Unwrap the <div>. Apply `display:block; text-align:center` directly
 * on the <a>/<button> so centering is preserved without the block wrapper.
 */
function getOpeningTag(element: string): string {
  return element.slice(0, element.indexOf('>') + 1);
}

function isLikelyCtaElement(element: string): boolean {
  const openingTag = getOpeningTag(element);
  const lower = openingTag.toLowerCase();

  if (lower.startsWith('<button')) return true;
  if (/class=['"][^'"]*\b(btn|button-link)\b/i.test(openingTag)) return true;
  if (/role=['"]button['"]/i.test(openingTag)) return true;
  if (/\{PHISHINGURL\}/i.test(openingTag)) return true;

  const hasHref = /\bhref\s*=/i.test(openingTag);
  const hasPadding = /padding(?:-[a-z]+)?\s*:/i.test(openingTag);
  const hasBackground = /background(?:-color)?\s*:/i.test(openingTag);
  const hasRadius = /border-radius|border-top-left-radius|border-top-right-radius|border-bottom-right-radius|border-bottom-left-radius/i.test(openingTag);
  const hasButtonDisplay = /display\s*:\s*(inline-block|block)/i.test(openingTag);

  return hasHref && hasPadding && (hasBackground || hasRadius || hasButtonDisplay);
}

export function normalizeEmailButtonDivs(html: string): string {
  // Match a <div> that contains ONLY a CTA link/button
  // and optional whitespace. Unwrap the div and ensure the link has centering styles.
  return html.replace(
    /<div[^>]*>\s*(<(?:a|button)\b[^>]*>[\s\S]*?<\/(?:a|button)>)\s*<\/div>/gi,
    (match, ctaElement) => {
      if (!isLikelyCtaElement(ctaElement)) return match;

      const openingTag = getOpeningTag(ctaElement);
      const hasDisplay = /display\s*:\s*(block|inline-block)/i.test(openingTag);
      const hasAlign = /text-align\s*:\s*center/i.test(openingTag);

      if (hasDisplay && hasAlign) return ctaElement; // Already self-contained

      const extraStyles = [!hasDisplay ? 'display:block' : '', !hasAlign ? 'text-align:center' : '']
        .filter(Boolean)
        .join(';');

      if (/style=['"]/i.test(openingTag)) {
        // Prepend to existing style attribute value
        return ctaElement.replace(/(style=['"])/, `$1${extraStyles};`);
      }
      // No style attribute yet — add one
      return ctaElement.replace(/(<(?:a|button)\b)/i, `$1 style='${extraStyles}'`);
    }
  );
}

/**
 * Removes excess top padding from button-only <td> rows.
 *
 * Problem: LLM generates button rows with padding:Xpx 0 (top + bottom), but the
 * content <td> above already provides bottom padding (e.g. padding:32px). The
 * combined gap (content-td-bottom + button-td-top) becomes too large (40-60px).
 *
 * Fix: Append padding-top:0 to any <td> that contains ONLY a CTA link. The
 * content <td> above provides sufficient visual separation on its own.
 */
export function normalizeEmailButtonRowPadding(html: string): string {
  return html.replace(
    /(<td\b[^>]*>)\s*(<(?:a|button)\b[^>]*>[\s\S]*?<\/(?:a|button)>)\s*(<\/td>)/gi,
    (match, openTag, cta, closeTag) => {
      if (!isLikelyCtaElement(cta)) return match;

      if (/style=['"]/i.test(openTag)) {
        const fixedOpenTag = openTag.replace(/(style=['"])([^'"]*)/, (_: string, prefix: string, styles: string) => {
          const trimmed = styles.trimEnd().replace(/;$/, '');
          return `${prefix}${trimmed}; padding-top: 0`;
        });
        return `${fixedOpenTag}${cta}${closeTag}`;
      }
      return match;
    }
  );
}

/**
 * Ensures button-only rows stay centered without relying on outer generic pipelines.
 *
 * Problem:
 * - After route-local processing, a CTA may remain the only child of a <td> but lose
 *   the wrapper semantics that previously kept it centered.
 *
 * Fix:
 * - If a <td> contains ONLY a CTA link/button, enforce td-level centering via
 *   align="center" and text-align:center, while leaving surrounding layout untouched.
 */
export function normalizeEmailButtonOnlyRowAlignment(html: string): string {
  return html.replace(
    /(<td\b([^>]*)>)(\s*(<(?:a|button)\b[^>]*>[\s\S]*?<\/(?:a|button)>)\s*)(<\/td>)/gi,
    (match, openTag, attrs, content, cta, closeTag) => {
      if (!isLikelyCtaElement(cta)) return match;

      const openingTag = String(cta).slice(0, String(cta).indexOf('>') + 1);
      const ctaSelfContainedLayout =
        /display\s*:\s*block/i.test(openingTag) ||
        /width\s*:\s*100%/i.test(openingTag) ||
        /margin-left\s*:\s*auto/i.test(openingTag) ||
        /margin-right\s*:\s*auto/i.test(openingTag) ||
        /margin\s*:\s*0\s+auto/i.test(openingTag);

      // If the CTA already carries its own width/alignment semantics, do not override the row.
      // This preserves intentionally full-width buttons and self-contained centered CTAs.
      if (ctaSelfContainedLayout) {
        return `${openTag}${content}${closeTag}`;
      }

      let nextOpenTag = openTag;

      if (!/\balign\s*=\s*['"]center['"]/i.test(attrs)) {
        nextOpenTag = nextOpenTag.replace(/<td\b/i, `<td align="center"`);
      }

      if (/style=['"]/i.test(nextOpenTag)) {
        nextOpenTag = nextOpenTag.replace(/(style=['"])([^'"]*)/i, (_m, prefix, styles: string) => {
          if (/text-align\s*:\s*center/i.test(styles)) {
            return `${prefix}${styles}`;
          }
          const trimmed = styles.trimEnd().replace(/;$/, '');
          const suffix = trimmed ? `${trimmed}; text-align: center` : 'text-align: center';
          return `${prefix}${suffix}`;
        });
      } else {
        nextOpenTag = nextOpenTag.replace(/<td\b([^>]*)>/i, `<td$1 style="text-align: center;">`);
      }

      return `${nextOpenTag}${content}${closeTag}`;
    }
  );
}

/**
 * Adds explicit centering to wrapper divs that start with a likely CTA element.
 *
 * This helps real-world email HTML where the CTA sits inside nested div wrappers
 * and uses a real URL instead of the {PHISHINGURL} placeholder.
 */
export function normalizeEmailCtaWrapperAlignment(html: string): string {
  return html.replace(
    /<div\b([^>]*)>(\s*(<(?:a|button)\b[^>]*>[\s\S]*?<\/(?:a|button)>)[\s\S]*?)<\/div>/gi,
    (match, attrs, innerContent, ctaElement) => {
      if (!isLikelyCtaElement(ctaElement)) return match;

      if (/style=['"][^'"]*text-align\s*:\s*center/i.test(attrs)) {
        return match;
      }

      if (/style=['"]/i.test(attrs)) {
        const nextAttrs = String(attrs).replace(/(style=['"])([^'"]*)/i, (_m, prefix, styles: string) => {
          const trimmed = styles.trimEnd().replace(/;$/, '');
          const suffix = trimmed ? `${trimmed}; text-align: center` : 'text-align: center';
          return `${prefix}${suffix}`;
        });
        return `<div${nextAttrs}>${innerContent}</div>`;
      }

      return `<div${attrs} style="text-align: center;">${innerContent}</div>`;
    }
  );
}
