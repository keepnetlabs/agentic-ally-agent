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

type BoxSide = 'top' | 'right' | 'bottom' | 'left';

function extractStyleValue(tag: string): string | null {
  const match = tag.match(/style=['"]([^'"]*)['"]/i);
  return match ? match[1] : null;
}

function parseBoxShorthand(value: string): Record<BoxSide, string> {
  const tokens = value.trim().split(/\s+/);

  if (tokens.length === 1) {
    return { top: tokens[0], right: tokens[0], bottom: tokens[0], left: tokens[0] };
  }
  if (tokens.length === 2) {
    return { top: tokens[0], right: tokens[1], bottom: tokens[0], left: tokens[1] };
  }
  if (tokens.length === 3) {
    return { top: tokens[0], right: tokens[1], bottom: tokens[2], left: tokens[1] };
  }

  return { top: tokens[0], right: tokens[1], bottom: tokens[2], left: tokens[3] };
}

function getEffectivePaddingValue(style: string, side: Extract<BoxSide, 'top' | 'bottom'>): string | null {
  const sideMatch = style.match(new RegExp(`padding-${side}\\s*:\\s*([^;]+)`, 'i'));
  if (sideMatch) return sideMatch[1].trim();

  const shorthandMatch = style.match(/(?:^|;)\s*padding\s*:\s*([^;]+)/i);
  if (!shorthandMatch) return null;

  return parseBoxShorthand(shorthandMatch[1])[side];
}

function isZeroSpacingValue(value: string | null | undefined): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === '' || normalized === '0' || normalized === '0px' || normalized === '0%';
}

function hasMeaningfulPadding(style: string, side: Extract<BoxSide, 'top' | 'bottom'>): boolean {
  return !isZeroSpacingValue(getEffectivePaddingValue(style, side));
}

function stripCommentsAndWhitespace(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/\s+/g, '');
}

function hasMeaningfulHtml(html: string): boolean {
  return stripCommentsAndWhitespace(html).length > 0;
}

function extractLikelyCtaElement(block: string): string | null {
  const directTag = block.match(/^\s*(<(?:a|button)\b[\s\S]*?<\/(?:a|button)>)/i);
  if (directTag) return directTag[1];

  const nestedTag = block.match(/(<(?:a|button)\b[\s\S]*?<\/(?:a|button)>)/i);
  return nestedTag ? nestedTag[1] : null;
}

function isLikelyCtaBlock(block: string): boolean {
  const ctaElement = extractLikelyCtaElement(block);
  return ctaElement ? isLikelyCtaElement(ctaElement) : false;
}

function ensureCenteredLeadingCtaBlock(block: string): string {
  if (/^\s*<table\b/i.test(block)) {
    if (/\balign\s*=\s*['"]center['"]/i.test(block)) return block;
    return block.replace(/<table\b/i, '<table align="center"');
  }

  const directCta = block.match(/^\s*(<(?:a|button)\b[\s\S]*?<\/(?:a|button)>)\s*$/i);
  if (!directCta) return block;

  return `<div style="text-align: center;">${directCta[1]}</div>`;
}

function isFullWidthTable(tableBlock: string): boolean {
  return (
    /\bwidth\s*=\s*['"]?100%['"]?/i.test(tableBlock) ||
    /style=['"][^'"]*\bwidth\s*:\s*100%/i.test(tableBlock)
  );
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
      if (!/style=['"]/i.test(openTag)) return match;

      const styleValue = extractStyleValue(openTag);
      if (!styleValue) return match;

      const topPadding = getEffectivePaddingValue(styleValue, 'top');
      const bottomPadding = getEffectivePaddingValue(styleValue, 'bottom');

      // Conservative fix: only collapse obviously duplicated vertical padding
      // when the row carries the same non-zero top/bottom spacing.
      if (
        !hasMeaningfulPadding(styleValue, 'top') ||
        !hasMeaningfulPadding(styleValue, 'bottom') ||
        isZeroSpacingValue(topPadding) ||
        topPadding?.trim().toLowerCase() !== bottomPadding?.trim().toLowerCase()
      ) {
        return match;
      }

      const fixedOpenTag = openTag.replace(/(style=['"])([^'"]*)/i, (_: string, prefix: string, styles: string) => {
        const trimmed = styles.trimEnd().replace(/;$/, '');
        return `${prefix}${trimmed}; padding-top: 0`;
      });
      return `${fixedOpenTag}${cta}${closeTag}`;
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
      const isFullWidth = /width\s*:\s*100%/i.test(openingTag);
      const isSelfCentered =
        (/margin-left\s*:\s*auto/i.test(openingTag) && /margin-right\s*:\s*auto/i.test(openingTag)) ||
        /margin\s*:\s*0\s+auto/i.test(openingTag);

      // Skip centering ONLY for full-width (fills td) or self-centering (margin:auto) buttons.
      // display:block alone does NOT center — a 300px block element stays left-aligned without parent centering.
      if (isFullWidth || isSelfCentered) {
        return `${openTag}${content}${closeTag}`;
      }

      // Respect explicit non-center alignment on the <td> — do not override intentional left/right placement.
      const hasExplicitAlignAttr = /\balign\s*=\s*['"](left|right)['"]/i.test(attrs);
      const tdStyle = (attrs.match(/style=['"]([^'"]*)/i) || [])[1] || '';
      const hasExplicitTextAlign = /text-align\s*:\s*(left|right)/i.test(tdStyle);
      if (hasExplicitAlignAttr || hasExplicitTextAlign) {
        return `${openTag}${content}${closeTag}`;
      }

      let nextOpenTag = openTag;

      if (!/\balign\s*=/i.test(attrs)) {
        nextOpenTag = nextOpenTag.replace(/<td\b/i, `<td align="center"`);
      }

      if (/style=['"]/i.test(nextOpenTag)) {
        nextOpenTag = nextOpenTag.replace(/(style=['"])([^'"]*)/i, (_m: string, prefix: string, styles: string) => {
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
 * Restores centered CTA block ownership when a CTA becomes the leading block
 * inside a mixed footer/help-text cell.
 *
 * Problem:
 * - AI can merge a previously centered CTA row with helper text below it,
 *   which drops the table-level centering that the original layout relied on.
 *
 * Fix:
 * - If a <td> starts with a likely CTA block and still contains additional
 *   trailing content, center only that leading CTA block instead of forcing
 *   the whole cell to become centered.
 */
export function normalizeEmailLeadingCtaBlockAlignment(html: string): string {
  return html.replace(
    /(<td\b([^>]*)>)((?:\s|<!--[\s\S]*?-->|<br\s*\/?>|<div\b[^>]*>\s*<\/div>\s*)*)((?:<table\b[\s\S]*?<\/table>|<(?:a|button)\b[\s\S]*?<\/(?:a|button)>))([\s\S]*?)(<\/td>)/gi,
    (match, openTag, attrs, leadingPrefix, leadingBlock, trailingContent, closeTag) => {
      if (!isLikelyCtaBlock(leadingBlock)) return match;
      if (!hasMeaningfulHtml(trailingContent)) return match;

      const tdAlreadyCentered =
        /\balign\s*=\s*['"]center['"]/i.test(attrs) ||
        /style=['"][^'"]*text-align\s*:\s*center/i.test(openTag);
      if (tdAlreadyCentered) return match;

      const centeredBlock = ensureCenteredLeadingCtaBlock(leadingBlock);
      if (centeredBlock === leadingBlock) return match;

      return `${openTag}${leadingPrefix}${centeredBlock}${trailingContent}${closeTag}`;
    }
  );
}

/**
 * Restores table-level centering for CTA tables that were moved inside neutral
 * wrapper divs together with helper text.
 *
 * Problem:
 * - A centered footer <td> can contain neutral <div> wrappers, then a content-width
 *   CTA <table>, followed by helper text. In that shape, td-level centering is not
 *   enough to visually center the nested table in many renderers.
 *
 * Fix:
 * - If a wrapper div starts with a content-width CTA table and also contains
 *   trailing content, add align="center" directly on that CTA table.
 */
export function normalizeEmailNestedCtaTableAlignment(html: string): string {
  return html.replace(
    /<div\b([^>]*)>(\s*)((?:<table\b[\s\S]*?<\/table>))([\s\S]*?)<\/div>/gi,
    (match, attrs, leadingWhitespace, tableBlock, trailingContent) => {
      if (!isLikelyCtaBlock(tableBlock)) return match;
      if (!hasMeaningfulHtml(trailingContent)) return match;
      if (/\balign\s*=\s*['"]center['"]/i.test(tableBlock)) return match;
      if (isFullWidthTable(tableBlock)) return match;

      const centeredTable = tableBlock.replace(/<table\b/i, '<table align="center"');
      return `<div${attrs}>${leadingWhitespace}${centeredTable}${trailingContent}</div>`;
    }
  );
}

/**
 * Adds explicit centering to wrapper divs that start with a likely CTA element.
 *
 * This helps real-world email HTML where the CTA sits inside nested div wrappers
 * and uses a real URL instead of the {PHISHINGURL} placeholder.
 */
/**
 * Moves margin from CTA <a> to its parent <td> as padding.
 * Margin does not work reliably inside table cells — padding does.
 *
 * Pattern: <td ...><a style="...margin-top:20px...">CTA</a></td>
 * Fix:     <td style="...padding-top:20px..."><a style="...">CTA</a></td>
 */
export function normalizeEmailButtonMarginToTdPadding(html: string): string {
  return html.replace(
    /(<td\b([^>]*)>)\s*(<a\b[^>]*>[\s\S]*?<\/a>)\s*(<\/td>)/gi,
    (match, tdOpen, tdAttrs, anchor, tdClose) => {
      if (!isLikelyCtaElement(anchor)) return match;

      // Skip if <td> has any background color (bgcolor attribute OR background-color in style).
      // Moving margin to padding would show the background in the padding area, making the button taller.
      if (/bgcolor\s*=/i.test(tdAttrs) || /background(?:-color)?\s*:/i.test(tdAttrs)) return match;

      const anchorOpen = getOpeningTag(anchor);
      const styleMatch = anchorOpen.match(/style=['"]([^'"]*)/i);
      if (!styleMatch) return match;

      const anchorStyles = styleMatch[1];
      // Extract margin-top and margin-bottom from the <a>
      const marginTop = anchorStyles.match(/margin-top\s*:\s*([^;]+)/i);
      const marginBottom = anchorStyles.match(/margin-bottom\s*:\s*([^;]+)/i);

      if (!marginTop && !marginBottom) return match;

      const tdStyle = extractStyleValue(tdOpen) ?? '';
      const canMigrateTop =
        !!marginTop &&
        !isZeroSpacingValue(marginTop[1]) &&
        !hasMeaningfulPadding(tdStyle, 'top');
      const canMigrateBottom =
        !!marginBottom &&
        !isZeroSpacingValue(marginBottom[1]) &&
        !hasMeaningfulPadding(tdStyle, 'bottom');

      if (!canMigrateTop && !canMigrateBottom) return match;

      // Build padding to add to <td>
      const tdPaddings: string[] = [];
      if (canMigrateTop && marginTop) {
        tdPaddings.push(`padding-top: ${marginTop[1].trim()}`);
      }
      if (canMigrateBottom && marginBottom) {
        tdPaddings.push(`padding-bottom: ${marginBottom[1].trim()}`);
      }
      if (tdPaddings.length === 0) return match;

      // Remove only the margins that were safely migrated to the parent <td>.
      let cleanedAnchor = anchor;
      if (canMigrateTop) {
        cleanedAnchor = cleanedAnchor.replace(/\s*margin-top\s*:\s*[^;]+;?/gi, '');
      }
      if (canMigrateBottom) {
        cleanedAnchor = cleanedAnchor.replace(/\s*margin-bottom\s*:\s*[^;]+;?/gi, '');
      }
      // Clean up leftover semicolons/spaces in style
      cleanedAnchor = cleanedAnchor.replace(/style=";\s*/i, 'style="');
      cleanedAnchor = cleanedAnchor.replace(/;\s*"/g, '"');

      // Add padding to <td>
      const paddingStr = tdPaddings.join('; ');
      let newTdOpen: string;
      if (/style=['"]/i.test(tdOpen)) {
        newTdOpen = tdOpen.replace(/(style=['"])([^'"]*)/i, (_m: string, prefix: string, styles: string) => {
          const trimmed = styles.trimEnd().replace(/;$/, '');
          return trimmed ? `${prefix}${trimmed}; ${paddingStr}` : `${prefix}${paddingStr}`;
        });
      } else {
        newTdOpen = tdOpen.replace(/<td\b/i, `<td style="${paddingStr}"`);
      }

      return `${newTdOpen}${cleanedAnchor}${tdClose}`;
    }
  );
}

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
