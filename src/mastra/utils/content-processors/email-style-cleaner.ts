/**
 * Strips GrapeJS noise from inline styles before sending HTML to AI.
 *
 * GrapeJS writes extremely verbose inline styles:
 *   - Both shorthand AND longhand: `border-radius: 8px` + all 4 corners
 *   - CSS resets on every element: `box-sizing: border-box; text-size-adjust: 100%`
 *   - Explicit `initial` values: `border-top-color: initial; outline-style: initial`
 *   - Redundant zero values: `border-top-width: 0px; border-right-width: 0px`
 *
 * A single <img> tag goes from ~800 chars to ~60 chars of meaningful style.
 * On a 28KB template, this can save 15-20KB — dramatically reducing AI token usage.
 *
 * IMPORTANT: This runs ONLY on HTML sent to the AI rewriter, NOT on the final output.
 * The AI's output goes through postProcessPhishingEmailHtml which handles the real styling.
 */

/**
 * Properties that are pure GrapeJS resets — never carry visual meaning.
 */
const RESET_PROPERTIES = new Set([
  'box-sizing',
  'text-size-adjust',
  '-webkit-text-size-adjust',
  '-ms-text-size-adjust',
]);

/**
 * Property prefixes that are longhand expansions of shorthand properties.
 * GrapeJS writes both `border: 0` AND `border-top-width: 0px; border-right-width: 0px; ...`
 * We strip the longhand versions when the value is `initial`, `0`, `0px`, or `none`.
 */
const LONGHAND_PREFIXES = [
  'border-top-', 'border-right-', 'border-bottom-', 'border-left-',
  'border-image-',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'outline-',
  'text-decoration-',
  'font-variant-',
  'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-right-radius', 'border-bottom-left-radius',
  'overflow-x', 'overflow-y',
  'background-image', 'background-position-x', 'background-position-y',
  'background-size', 'background-repeat', 'background-attachment',
  'background-origin', 'background-clip',
];

/**
 * Values that indicate a GrapeJS default — safe to strip when on a longhand property.
 */
const NOISE_VALUES = new Set([
  'initial', 'none', 'normal', 'auto',
  '0', '0px', '0%',
]);

/**
 * Shorthand properties we want to KEEP — these carry real visual meaning.
 * When a shorthand exists, its longhand expansions are redundant noise.
 */
const SHORTHAND_KEEP = new Set([
  'border', 'border-radius', 'outline', 'text-decoration',
  'padding', 'margin', 'background', 'overflow', 'font',
]);

/**
 * Properties that always carry visual meaning and must be preserved.
 */
const ALWAYS_KEEP = new Set([
  'display', 'width', 'max-width', 'min-width',
  'height', 'max-height', 'min-height',
  'color', 'background-color', 'background',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'line-height', 'text-align', 'vertical-align',
  'padding', 'margin',
  'border', 'border-radius', 'border-collapse',
  'border-spacing',
  'overflow', 'opacity',
  'text-decoration',
  'white-space', 'word-break',
  'table-layout', 'list-style',
  'position', 'top', 'right', 'bottom', 'left',
  'float', 'clear',
  'cursor',
  'mso-hide',
]);

function isNoiseLonghand(property: string, value: string): boolean {
  const prop = property.toLowerCase().trim();
  const val = value.toLowerCase().trim();

  // Always strip pure reset properties
  if (RESET_PROPERTIES.has(prop)) return true;

  // margin-left/right: auto is the CSS block centering mechanism — NEVER strip.
  if ((prop === 'margin-left' || prop === 'margin-right') && val === 'auto') {
    return false;
  }

  // Strip longhand properties with noise values
  for (const prefix of LONGHAND_PREFIXES) {
    if (prop.startsWith(prefix) && NOISE_VALUES.has(val)) {
      return true;
    }
  }

  // Strip longhand border/outline properties with explicit initial/none/0px
  if (prop.startsWith('border-') && !SHORTHAND_KEEP.has(prop) && NOISE_VALUES.has(val)) {
    return true;
  }

  // Strip GrapeJS font sub-properties that are just browser defaults
  // e.g. font-style: normal, font-stretch: normal, font-kerning: auto, font-optical-sizing: auto
  if (prop.startsWith('font-') && !ALWAYS_KEEP.has(prop) && NOISE_VALUES.has(val)) {
    return true;
  }
  // font-feature-settings: normal, font-variation-settings: normal, font-size-adjust: none
  if (prop.startsWith('font-') && !ALWAYS_KEEP.has(prop) &&
      (val === 'normal' || val === 'none' || val === 'auto')) {
    return true;
  }

  return false;
}

/**
 * Cleans a single inline style string by removing GrapeJS noise declarations.
 */
function cleanStyleValue(styleStr: string): string {
  const declarations = styleStr.split(';');
  const kept: string[] = [];
  const seenShorthands = new Set<string>();

  // First pass: identify which shorthands are present
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    if (SHORTHAND_KEEP.has(prop)) {
      seenShorthands.add(prop);
    }
  }

  // Second pass: filter declarations
  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      kept.push(trimmed);
      continue;
    }

    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();

    // Always keep explicitly important properties
    if (ALWAYS_KEEP.has(prop)) {
      kept.push(trimmed);
      continue;
    }

    // Strip if it's a noise longhand
    if (isNoiseLonghand(prop, val)) {
      continue;
    }

    // Strip longhand if its shorthand is already present AND the longhand has a noise value.
    // Reason: "border: none; border-top: 0.5px solid #707070" is a valid CSS override pattern.
    // Same applies to "margin: 0; margin-bottom: 36px" and "padding: 0; padding-top: 20px".
    // Only strip longhands that are truly noise (initial, 0, 0px, none, normal, auto).
    // Meaningful overrides (non-noise values) are always preserved — safer than guessing CSS order.
    let isRedundantLonghand = false;
    const valLower = val.toLowerCase().trim();
    const isNoiseVal = NOISE_VALUES.has(valLower);
    for (const shorthand of seenShorthands) {
      // Direct prefix match: padding → padding-top, border → border-top, margin → margin-left
      if (prop.startsWith(shorthand + '-') && !SHORTHAND_KEEP.has(prop)) {
        if (isNoiseVal) {
          isRedundantLonghand = true;
        }
        break;
      }
      // border-radius → border-top-left-radius, border-bottom-right-radius
      if (shorthand === 'border-radius' && /^border-(top|bottom)-(left|right)-radius$/.test(prop)) {
        if (isNoiseVal) {
          isRedundantLonghand = true;
        }
        break;
      }
      // overflow → overflow-x, overflow-y
      if (shorthand === 'overflow' && /^overflow-[xy]$/.test(prop)) {
        if (isNoiseVal) {
          isRedundantLonghand = true;
        }
        break;
      }
    }
    if (isRedundantLonghand) continue;

    kept.push(trimmed);
  }

  if (kept.length === 0) return '';
  return kept.join('; ') + ';';
}

/**
 * Cleans all inline style attributes in the HTML.
 * Removes empty style="" attributes after cleaning.
 */
export function cleanGrapejsStyles(html: string): string {
  if (!html) return html;

  return html.replace(
    /\bstyle="([^"]*)"/gi,
    (_match, styleContent: string) => {
      const cleaned = cleanStyleValue(styleContent);
      if (!cleaned) return ''; // Remove empty style attribute entirely
      return `style="${cleaned}"`;
    }
  );
}
