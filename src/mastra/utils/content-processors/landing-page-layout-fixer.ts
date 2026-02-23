/**
 * Layout fixer for generated landing pages.
 * Handles common CSS/HTML structure issues programmatically to avoid prompt bloat.
 */

export function fixLandingPageLayout(html: string): string {
  let fixedHtml = html;

  // 1. Fix Centering: Add margin: 0 auto to fixed-width containers
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

  // 2. Fix Icon Nesting (The "Green Circle" Bug)
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

  // 3. Fix H1 Typography Alignment
  // Ensure all H1 headers are centered (standard for card layouts)
  fixedHtml = fixedHtml.replace(/(<h1[^>]*style=['"])([^'"]*)(['"])/gi, (match, prefix, styleContent, suffix) => {
    // If already has text-align, skip (respect explicit left/right if generated)
    if (/text-align:/i.test(styleContent)) {
      return match;
    }
    // Append text-align: center
    return `${prefix}${styleContent}; text-align: center;${suffix}`;
  });

  // 4. Fix P below H1: Intro/description paragraph directly under H1 should be centered too
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

  return fixedHtml;
}
