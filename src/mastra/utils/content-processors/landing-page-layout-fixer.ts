/**
 * Layout fixer for generated landing pages.
 * Handles common CSS/HTML structure issues programmatically to avoid prompt bloat.
 */

import { LANDING_PAGE } from '../../constants';

function addFlexDirectionColumn(tag: string): string {
  return tag.replace(/style=(['"])([^'"]*)\1/i, (match, quote, styleContent) => {
    if (/flex-direction\s*:/i.test(styleContent)) return match;
    return `style=${quote}${styleContent}; flex-direction: column;${quote}`;
  });
}

function normalizeFooterSiblingLayout(html: string): string {
  const footerBlockRegex =
    /<div\b[^>]*style=['"][^'"]*(?:font-size\s*:\s*12px|color\s*:\s*#9ca3af)[^'"]*['"][^>]*>[\s\S]{0,1600}?(?:privacy|terms|support|all rights reserved|&copy;|©)[\s\S]{0,1600}?<\/div>/gi;
  const flexDivTagRegex = /<div\b[^>]*style=['"][^'"]*\bdisplay\s*:\s*flex\b[^'"]*['"][^>]*>/gi;
  const edits = new Map<number, { end: number; replacement: string }>();

  let footerMatch: RegExpExecArray | null;
  while ((footerMatch = footerBlockRegex.exec(html)) !== null) {
    const footerStart = footerMatch.index;
    const searchWindowStart = Math.max(0, footerStart - 3000);
    const searchRegion = html.slice(searchWindowStart, footerStart);

    let flexMatch: RegExpExecArray | null;
    let strongestCandidate: { start: number; end: number; tag: string } | undefined;
    let fallbackCandidate: { start: number; end: number; tag: string } | undefined;

    while ((flexMatch = flexDivTagRegex.exec(searchRegion)) !== null) {
      const tag = flexMatch[0];
      if (/flex-direction\s*:/i.test(tag)) continue;

      const candidate = {
        start: searchWindowStart + flexMatch.index,
        end: searchWindowStart + flexMatch.index + tag.length,
        tag,
      };

      // Prefer wrapper-like flex containers over small inline rows such as trust badges.
      if (/(?:\bpadding\s*:|\bmin-width\s*:|\bflex\s*:\s*1\b)/i.test(tag) && !/\bfont-size\s*:/i.test(tag)) {
        strongestCandidate = candidate;
      } else {
        fallbackCandidate = candidate;
      }
    }

    const chosenCandidate = strongestCandidate || fallbackCandidate;
    if (!chosenCandidate) continue;

    edits.set(chosenCandidate.start, {
      end: chosenCandidate.end,
      replacement: addFlexDirectionColumn(chosenCandidate.tag),
    });
  }

  if (edits.size === 0) return html;

  let fixedHtml = html;
  for (const [start, edit] of [...edits.entries()].sort((a, b) => b[0] - a[0])) {
    fixedHtml = fixedHtml.slice(0, start) + edit.replacement + fixedHtml.slice(edit.end);
  }

  return fixedHtml;
}

export function fixLandingPageLayout(html: string): string {
  let fixedHtml = html;

  // 1. Clamp overly aggressive hero overlap margins back to the design constant.
  // Example: margin: -40px auto 0; -> margin: -24px auto 0;
  fixedHtml = fixedHtml.replace(
    /(<(?:div|section|main|form)[^>]*style=['"][^'"]*\bmargin\s*:\s*)(-(\d+))px(\s+auto\s+0\s*;?[^'"]*['"])/gi,
    (match, prefix, rawValue, digits, suffix) => {
      const absValue = Number.parseInt(String(digits), 10);
      if (Number.isNaN(absValue)) return match;

      const maxAllowedOverlap = Math.abs(LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX);
      if (absValue <= maxAllowedOverlap) return match;

      return `${prefix}${LANDING_PAGE.HERO_MAIN_CONTAINER_MARGIN_TOP_PX}px${suffix}`;
    }
  );

  // 2. Fix Centering: Add margin: 0 auto to fixed-width containers
  // Look for tags with style containing max-width but missing margin: 0 auto
  fixedHtml = fixedHtml.replace(
    /(<(?:div|section|main|form|a|button)[^>]*style=['"])([^'"]*max-width:[^'"]*)(['"])/gi,
    (match, prefix, styleContent, suffix) => {
      // Extract tag name from prefix
      const tagMatch = prefix.match(/<(div|section|main|form|a|button)/i);
      const tag = tagMatch ? tagMatch[1].toLowerCase() : 'div';

      // If margin already contains `auto`, skip.
      // This prevents duplicating margin declarations like:
      //   margin: -40px auto 0; ... ; margin: 0 auto;
      // Note: We only skip when `auto` is already present; if margin exists without `auto`,
      // we avoid overriding here (handled by normalizeLandingMaxWidthCentering).
      if (/\bmargin\s*:[^;]*\bauto\b/i.test(styleContent)) {
        return match;
      }

      let nextStyle = styleContent;

      // If it's an 'a' tag or 'button', ensure it's block-level for margin:0 auto to work
      if ((tag === 'a' || tag === 'button') && !styleContent.toLowerCase().includes('display: block')) {
        if (styleContent.toLowerCase().includes('display: inline-block')) {
          nextStyle = nextStyle.replace(/display:\s*inline-block/i, 'display: block');
        } else if (!styleContent.toLowerCase().includes('display: block')) {
          nextStyle = `display: block; ${nextStyle}`;
        }
      }

      // Append margin: 0 auto
      return `${prefix}${nextStyle}; margin: 0 auto;${suffix}`;
    }
  );

  // 3. Fix Icon Nesting (The "Green Circle" Bug)
  // Problem A: <div style='...border-radius: 999px...'></div><span>✓</span>
  // Fix A: Move the sibling span INSIDE the div.
  // Problem B: <div style='...border-radius: 999px; background: #22c55e...'></div> (truly empty, no span)
  // Fix B: Inject a checkmark into the empty circle div.

  // Fix A: sibling span outside the circle div
  const iconNestingRegex =
    /(<div[^>]*border-radius:\s*(?:999px|50%|99px|100px)[^>]*>)(<\/div>)(\s*<span[^>]*>.*?<\/span>)/gi;

  fixedHtml = fixedHtml.replace(iconNestingRegex, (match, openDiv, closeDiv, checkmarkSpan) => {
    return `${openDiv}${checkmarkSpan.trim()}${closeDiv}`;
  });

  // Fix B: truly empty circle div with a background color (icon container with no content).
  // Bug fixes vs previous version:
  //   - Order-independent: border-radius check is in regex, background check is in callback
  //     (AI can emit CSS properties in any order)
  //   - No dead hasChildren check: regex already guarantees \s*-only inner content
  //   - Injected span uses only visual styles; parent handles centering (line-height or flex)
  const emptyCircleRegex =
    /(<div[^>]*style=['"][^'"]*border-radius:\s*(?:999px|50%|99px|100px)[^'"]*['"][^>]*>)\s*(<\/div>)/gi;

  fixedHtml = fixedHtml.replace(emptyCircleRegex, (match, openDiv, closeDiv) => {
    // Only act on colored circles (has explicit hex background = icon container, not decorative ring)
    if (!/background(?:-color)?:\s*#[0-9a-fA-F]{3,8}/i.test(openDiv)) return match;
    const checkmark = `<span style='color:white;font-size:28px;font-weight:700;'>&#10003;</span>`;
    return `${openDiv}${checkmark}${closeDiv}`;
  });

  // Fix C: remove a stray bare checkmark left outside the icon container.
  // Example: <div ...border-radius...><span>✓</span></div>✓
  fixedHtml = fixedHtml.replace(
    /(<div[^>]*border-radius:\s*(?:999px|50%|99px|100px)[^>]*>[\s\S]*?<\/div>)\s*(?:&#10003;|&#x2713;|&#x2714;|✓)(?=\s*(?:<\/div>|<))/gi,
    '$1'
  );

  // 4. Fix Success Card Centering
  // Problem: LLM generates success page card divs containing checkmark icons but omits text-align: center
  // This causes icon, heading, and paragraph to left-align inside the card
  // Detect card divs that contain a checkmark icon (border-radius circle) and ensure text-align: center
  fixedHtml = fixedHtml.replace(
    /(<div\b)([^>]*style=)(['"])([^'"]*)((?:\3))([^>]*>)([\s\S]*?<div[^>]*border-radius:\s*(?:999px|50%|99px|100px))/gi,
    (match, openTag, styleAttr, quote, styleContent, _q2, rest, inner) => {
      // Skip if already has text-align
      if (/text-align:/i.test(styleContent)) return match;
      // Only act on card-like containers (have padding or background, not raw wrappers)
      if (!/(?:padding|background)/i.test(styleContent)) return match;
      return `${openTag}${styleAttr}${quote}${styleContent}; text-align: center;${quote}${rest}${inner}`;
    }
  );

  // 6. Fix H1 Typography Alignment
  // Ensure all H1 headers are centered (standard for card layouts)
  fixedHtml = fixedHtml.replace(/(<h1[^>]*style=['"])([^'"]*)(['"])/gi, (match, prefix, styleContent, suffix) => {
    // If already has text-align, skip (respect explicit left/right if generated)
    if (/text-align:/i.test(styleContent)) {
      return match;
    }
    // Append text-align: center
    return `${prefix}${styleContent}; text-align: center;${suffix}`;
  });

  // 7. Fix P below H1: Intro/description paragraph directly under H1 should be centered too
  // Pattern: </h1>...<p style="..."> (p is typically the intro text, should match h1 alignment)
  fixedHtml = fixedHtml.replace(
    /(<\/h1[^>]*>)\s*(<p\b)([^>]*?)style=(['"])([^'"]*)\4([^>]*)>/gi,
    (match, closeH1, openP, preStyle, quote, styleContent, postStyle) => {
      if (/text-align:/i.test(styleContent)) {
        return match;
      }
      return `${closeH1}${openP}${preStyle}style=${quote}${styleContent}; text-align: center;${quote}${postStyle}>`;
    }
  );

  // 8. Fix Footer Placement
  // If a footer block is emitted as a sibling inside a row-flex content wrapper,
  // force that wrapper into a column layout so the footer sits below the card.
  fixedHtml = normalizeFooterSiblingLayout(fixedHtml);

  return fixedHtml;
}
