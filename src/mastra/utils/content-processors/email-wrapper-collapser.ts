/**
 * Collapses empty GrapeJS wrapper divs before sending HTML to AI.
 *
 * GrapeJS generates deeply nested wrapper divs like:
 *   <div id="ixx7h" style="box-sizing: border-box;">
 *     <div id="incrd" style="box-sizing: border-box;">
 *       <table>...actual content...</table>
 *     </div>
 *   </div>
 *
 * These add hundreds of tokens of noise and confuse the AI rewriter.
 * This pre-processor unwraps them, reducing token waste and truncation risk.
 *
 * A div is considered a "collapsible GrapeJS wrapper" when ALL of:
 *   1. No class attribute, no data-* attributes
 *   2. id matches GrapeJS short-id pattern (lowercase alphanum, 3-8 chars)
 *   3. style (if present) contains ONLY generic CSS resets (box-sizing, text-size-adjust)
 *   4. Contains exactly ONE child element (no siblings, no meaningful text)
 */

/**
 * GrapeJS generates short alphanumeric ids like "ixx7h", "incrd", "i1g4z".
 * We only collapse divs whose id matches this pattern.
 */
const GRAPEJS_ID_PATTERN = /^[a-z][a-z0-9]{2,7}$/;

/**
 * Style properties that GrapeJS adds to every element as a CSS reset.
 * These have zero visual impact and are safe to ignore when deciding
 * whether a div is an "empty wrapper".
 */
const GRAPEJS_RESET_PROPERTIES = new Set([
  'box-sizing',
  'text-size-adjust',
]);

/**
 * Matches a <div> with its attributes and inner content.
 * Captures: [1] = all attributes, [2] = inner content
 * Non-greedy on inner content; runs iteratively from innermost outward.
 */
const DIV_RE = /<div\s+([^>]*)>([\s\S]*?)<\/div>/gi;

/**
 * Checks if a div's attributes indicate it's a collapsible GrapeJS wrapper.
 * Returns true if the div has:
 *   - An id matching GrapeJS pattern
 *   - No class or data-* attributes
 *   - Style (if any) containing only reset properties
 */
function isCollapsibleWrapper(attrString: string): boolean {
  // Must have id
  const idMatch = attrString.match(/\bid="([^"]+)"/);
  if (!idMatch || !GRAPEJS_ID_PATTERN.test(idMatch[1])) return false;

  // Must NOT have class
  if (/\bclass="/.test(attrString)) return false;

  // Must NOT have data-* attributes
  if (/\bdata-/.test(attrString)) return false;

  // Check style: if present, must contain only reset properties
  const styleMatch = attrString.match(/\bstyle="([^"]+)"/);
  if (styleMatch) {
    const styleValue = styleMatch[1];
    // Parse individual declarations
    const declarations = styleValue
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d.length > 0);

    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) return false;
      const property = decl.slice(0, colonIdx).trim().toLowerCase();
      if (!GRAPEJS_RESET_PROPERTIES.has(property)) return false;
    }
  }

  return true;
}

/**
 * HTML void elements — self-closing by spec, no closing tag needed.
 * e.g. <img src="...">, <br>, <hr>, <input>, <meta>
 */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Extracts the tag name from an opening tag string like '<img src="...">'.
 */
function getTagName(tag: string): string {
  const match = tag.match(/^<([a-zA-Z][a-zA-Z0-9]*)/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Checks if the inner content of a div has exactly one child element
 * (ignoring surrounding whitespace and HTML comments).
 * Correctly handles void elements (img, br, etc.) that have no closing tag.
 */
function hasSingleChildElement(inner: string): boolean {
  const trimmed = inner.trim();
  if (!trimmed.startsWith('<')) return false;

  let depth = 0;
  let elementCount = 0;
  let hasSignificantText = false;
  let i = 0;

  while (i < trimmed.length) {
    if (trimmed[i] === '<') {
      const tagEnd = trimmed.indexOf('>', i);
      if (tagEnd === -1) break;

      const tag = trimmed.slice(i, tagEnd + 1);

      if (tag.startsWith('<!--')) {
        const commentEnd = trimmed.indexOf('-->', i);
        if (commentEnd === -1) break;
        i = commentEnd + 3;
        continue;
      } else if (tag.startsWith('</')) {
        depth--;
      } else if (tag.endsWith('/>') || VOID_ELEMENTS.has(getTagName(tag))) {
        // Self-closing or void element — no depth change
        if (depth === 0) elementCount++;
      } else {
        if (depth === 0) elementCount++;
        depth++;
      }

      i = tagEnd + 1;
    } else {
      const nextTag = trimmed.indexOf('<', i);
      const textChunk = nextTag === -1
        ? trimmed.slice(i)
        : trimmed.slice(i, nextTag);

      if (depth === 0 && textChunk.trim().length > 0) {
        hasSignificantText = true;
      }

      i = nextTag === -1 ? trimmed.length : nextTag;
    }

    if (elementCount > 1 || hasSignificantText) return false;
  }

  return elementCount === 1 && !hasSignificantText;
}

/**
 * Collapses empty GrapeJS wrapper divs.
 * Runs iteratively (innermost first) until no more wrappers can be collapsed.
 * Maximum 20 iterations as a safety bound.
 */
export function collapseEmptyWrappers(html: string): string {
  if (!html) return html;

  let result = html;
  const MAX_ITERATIONS = 20;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let changed = false;

    result = result.replace(DIV_RE, (match, attrs: string, inner: string) => {
      if (!isCollapsibleWrapper(attrs)) return match;
      if (!hasSingleChildElement(inner)) return match;

      changed = true;
      return inner;
    });

    if (!changed) break;
  }

  return result;
}
