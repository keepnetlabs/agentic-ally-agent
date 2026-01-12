
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

            // If already has margin auto, skip
            if (/margin:\s*0\s+auto/i.test(styleContent) || /margin:\s*auto/i.test(styleContent)) {
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
    // Problem: <div style='...border-radius: 999px...'></div><span>✓</span>
    // Fix: <div style='...border-radius: 999px...'><span>✓</span></div>
    // Strategy: Look for an empty div with high border-radius (circular container) followed by a span.

    // Regex explanation:
    // (<div[^>]*border-radius:\s*(?:999px|50%|99px|100px)[^>]*>) -> Group 1: Circle div (flexible radius)
    // (<\/div>)                                               -> Group 2: Empty closure
    // (\s*<span[^>]*>.*?<\/span>)                             -> Group 3: The icon span (any content)

    // Note: We use .*? in span for non-greedy match to handle multiple spans correctly
    const iconNestingRegex = /(<div[^>]*border-radius:\s*(?:999px|50%|99px|100px)[^>]*>)(<\/div>)(\s*<span[^>]*>.*?<\/span>)/gi;

    fixedHtml = fixedHtml.replace(iconNestingRegex, (match, openDiv, closeDiv, checkmarkSpan) => {
        // Move the checkmark span INSIDE the div, trimming whitespace for cleaner HTML
        return `${openDiv}${checkmarkSpan.trim()}${closeDiv}`;
    });

    // 3. Fix H1 Typography Alignment
    // Ensure all H1 headers are centered (standard for card layouts)
    fixedHtml = fixedHtml.replace(
        /(<h1[^>]*style=['"])([^'"]*)(['"])/gi,
        (match, prefix, styleContent, suffix) => {
            // If already has text-align, skip (respect explicit left/right if generated)
            if (/text-align:/i.test(styleContent)) {
                return match;
            }
            // Append text-align: center
            return `${prefix}${styleContent}; text-align: center;${suffix}`;
        }
    );

    return fixedHtml;
}
