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
export function normalizeEmailButtonDivs(html: string): string {
  // Match a <div> that contains ONLY a CTA link (identified by {PHISHINGURL} merge tag)
  // and optional whitespace. Unwrap the div and ensure the link has centering styles.
  return html.replace(
    /<div[^>]*>\s*(<(?:a|button)\b[^>]*\{PHISHINGURL\}[^>]*>[\s\S]*?<\/(?:a|button)>)\s*<\/div>/gi,
    (_match, ctaElement) => {
      const openingTag = ctaElement.slice(0, ctaElement.indexOf('>') + 1);
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
    /(<td\b[^>]*>)\s*(<(?:a|button)\b[^>]*\{PHISHINGURL\}[^>]*>[\s\S]*?<\/(?:a|button)>)\s*(<\/td>)/gi,
    (match, openTag, cta, closeTag) => {
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
