/**
 * Landing page form-control style preserver
 *
 * Use case:
 * - During localization/editing, LLMs sometimes drop or rewrite inline styles on form controls
 *   (<input>, <textarea>, <select>, <button>), causing the UI to look "broken".
 *
 * Goal:
 * - Preserve the original inline `style` attribute values from the source HTML and apply them
 *   back onto the edited HTML deterministically.
 *
 * Strategy (minimal, resilient):
 * - Extract per-element inline style values from the ORIGINAL HTML in document order (per tag).
 * - In the EDITED HTML, enforce the ORIGINAL inline styles for form controls. This is intentional:
 *   localization/edit operations should never alter form-control CSS, and allowing drift breaks UX.
 * - If counts differ, use the last known original style as fallback for remaining elements.
 *
 * Never throws: 3-level fallback.
 */

import { getLogger } from '../core/logger';
import { normalizeError } from '../core/error-utils';

const logger = getLogger('LandingFormStylePreserver');

type FormTag = 'input' | 'textarea' | 'select' | 'button';

const FORM_TAGS: readonly FormTag[] = ['input', 'textarea', 'select', 'button'] as const;
const SAFE_FORM_ATTR_PREFIXES = ['data-', 'aria-'] as const;
const SAFE_FORM_ATTR_NAMES = [
  'id', 'type', 'name', 'value', 'placeholder', 'autocomplete', 'inputmode', 'pattern',
  'min', 'max', 'step', 'maxlength', 'minlength', 'class', 'style', 'role', 'tabindex',
] as const;
type SafeFormAttrName = (typeof SAFE_FORM_ATTR_NAMES)[number];

function extractStyle(attrs: string): string | undefined {
  const m = attrs.match(/\bstyle\s*=\s*(['"])(.*?)\1/i);
  return m?.[2];
}

function replaceOrAddStyle(attrs: string, style: string): string {
  const hasStyle = /\bstyle\s*=\s*(['"])(.*?)\1/i.test(attrs);
  if (hasStyle) {
    return attrs.replace(/\bstyle\s*=\s*(['"])(.*?)\1/i, `style='${style}'`);
  }
  // Insert style at end of attrs (keep other attrs intact)
  return `${attrs} style='${style}'`.trim();
}

function normalizeBrokenBooleanAttr(attrs: string, attrName: string): string {
  // Fix cases like: required=" style="... -> required style='...'
  // We only collapse the broken `attr="` into a boolean attr when it is immediately followed by another attribute name.
  const re = new RegExp(`\\b${attrName}\\s*=\\s*(['"])\\s*(?=\\b[a-zA-Z-]+\\b\\s*=)`, 'gi');
  let out = attrs.replace(re, `${attrName} `);

  // Normalize common boolean forms: required="true" / disabled="disabled" -> required / disabled
  const boolRe = new RegExp(`\\b${attrName}\\s*=\\s*(['"])(?:true|false|${attrName})\\1`, 'gi');
  out = out.replace(boolRe, `${attrName}`);
  return out;
}

function normalizeCommonBrokenBooleanAttrs(attrs: string): string {
  let out = attrs;
  out = normalizeBrokenBooleanAttr(out, 'required');
  out = normalizeBrokenBooleanAttr(out, 'readonly');
  out = normalizeBrokenBooleanAttr(out, 'disabled');
  out = normalizeBrokenBooleanAttr(out, 'checked');
  return out;
}

function isSafeAttrName(name: string): name is SafeFormAttrName {
  if (!name) return false;
  const lower = name.toLowerCase();
  if ((SAFE_FORM_ATTR_NAMES as readonly string[]).includes(lower)) return true;
  return SAFE_FORM_ATTR_PREFIXES.some(p => lower.startsWith(p));
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/'/g, '&#39;');
}

function seemsBrokenStyleValue(style: string): boolean {
  // Heuristic: style values should not contain attribute fragments like `=""` or ` solid="" `
  return style.includes('=') || /=['"]\s*['"]/.test(style) || /\b\w+\s*=\s*['"]/.test(style);
}

function sanitizeFormControlAttrs(attrsRaw: string): string {
  const raw = normalizeCommonBrokenBooleanAttrs(attrsRaw || '');

  // Capture booleans by presence (common cases: required, required="", required="true")
  const hasRequired = /\brequired\b/i.test(raw);
  const hasReadonly = /\breadonly\b/i.test(raw);
  const hasDisabled = /\bdisabled\b/i.test(raw);
  const hasChecked = /\bchecked\b/i.test(raw);

  // Capture key/value attrs that are actually parseable
  const kept: Record<string, string> = {};
  const pairsRe = /\s+([^\s=<>\/"']+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let m: RegExpExecArray | null;
  while ((m = pairsRe.exec(raw)) !== null) {
    const name = String(m[1] ?? '').trim();
    if (!isSafeAttrName(name)) continue;
    const value = (m[2] ?? m[3] ?? m[4] ?? '').toString();

    // Drop obviously broken style values; we'll prefer preserveLandingFormControlStyles to restore,
    // or leave style out (valid HTML > broken HTML).
    if (name.toLowerCase() === 'style' && value && seemsBrokenStyleValue(value)) {
      continue;
    }

    kept[name.toLowerCase()] = value;
  }

  const parts: string[] = [];
  for (const [k, v] of Object.entries(kept)) {
    if (v === '') {
      // empty string attrs are usually garbage except for class/style (which we allow empty)
      if (k !== 'class' && k !== 'style') continue;
    }
    parts.push(`${k}='${escapeSingleQuotes(v)}'`);
  }

  if (hasRequired) parts.push('required');
  if (hasReadonly) parts.push('readonly');
  if (hasDisabled) parts.push('disabled');
  if (hasChecked) parts.push('checked');

  return parts.length ? ` ${parts.join(' ')}` : '';
}

/**
 * Repair common broken boolean attributes on form controls without changing styles.
 * Example: required=" style="..."  -> required style="..."
 */
export function repairBrokenLandingFormControlAttrs(html: string): string {
  if (!html || typeof html !== 'string') return html;
  if (
    !html.includes('<input') &&
    !html.includes('<textarea') &&
    !html.includes('<select') &&
    !html.includes('<button')
  ) {
    return html;
  }

  return html.replace(/<(input|textarea|select|button)\b([^>]*)>/gi, (full, tagRaw, attrsRaw) => {
    const tag = String(tagRaw).toLowerCase();
    const attrs = sanitizeFormControlAttrs(String(attrsRaw ?? ''));
    return `<${tag}${attrs}>`;
  });
}

function extractOriginalStylesByTag(html: string): Record<FormTag, Array<string | undefined>> {
  const out: Record<FormTag, Array<string | undefined>> = {
    input: [],
    textarea: [],
    select: [],
    button: [],
  };

  const re = /<(input|textarea|select|button)\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = String(m[1]).toLowerCase() as FormTag;
    const attrs = String(m[2] ?? '');
    if (!FORM_TAGS.includes(tag)) continue;
    const style = extractStyle(attrs)?.trim();
    out[tag].push(style && style.length > 0 ? style : undefined);
  }

  return out;
}

function applyOriginalStyles(
  editedHtml: string,
  originalStylesByTag: Record<FormTag, Array<string | undefined>>
): string {
  const counters: Record<FormTag, number> = { input: 0, textarea: 0, select: 0, button: 0 };

  return editedHtml.replace(/<(input|textarea|select|button)\b([^>]*)>/gi, (full, tagRaw, attrsRaw) => {
    const tag = String(tagRaw).toLowerCase() as FormTag;
    const attrs = sanitizeFormControlAttrs(String(attrsRaw ?? ''));
    if (!FORM_TAGS.includes(tag)) return full;

    const idx = counters[tag] ?? 0;
    counters[tag] = idx + 1;

    const originals = originalStylesByTag[tag] ?? [];
    if (originals.length === 0) return full;

    const direct = originals[idx];
    const fallback = originals[originals.length - 1];
    const chosen = direct ?? fallback;
    if (!chosen) return full;

    const nextAttrs = replaceOrAddStyle(attrs.trim(), chosen);
    return `<${tag} ${nextAttrs}>`;
  });
}

function applyMissingOriginalStyles(
  editedHtml: string,
  originalStylesByTag: Record<FormTag, Array<string | undefined>>
): string {
  const counters: Record<FormTag, number> = { input: 0, textarea: 0, select: 0, button: 0 };

  return editedHtml.replace(/<(input|textarea|select|button)\b([^>]*)>/gi, (full, tagRaw, attrsRaw) => {
    const tag = String(tagRaw).toLowerCase() as FormTag;
    const rawAttrs = String(attrsRaw ?? '');
    const sanitizedSuffix = sanitizeFormControlAttrs(rawAttrs);
    if (!FORM_TAGS.includes(tag)) return full;

    const idx = counters[tag] ?? 0;
    counters[tag] = idx + 1;

    const originals = originalStylesByTag[tag] ?? [];
    if (originals.length === 0) return `<${tag}${sanitizedSuffix}>`;

    const direct = originals[idx];
    const fallback = originals[originals.length - 1];
    const chosen = direct ?? fallback;

    // If edited already has a valid style attribute, keep it as-is (do not override).
    const existingStyle = extractStyle(rawAttrs);
    if (existingStyle && existingStyle.trim() && !seemsBrokenStyleValue(existingStyle)) {
      return `<${tag}${sanitizedSuffix}>`;
    }

    // Otherwise, restore original style if available.
    if (chosen) {
      const nextAttrs = replaceOrAddStyle(sanitizedSuffix.trim(), chosen);
      return `<${tag} ${nextAttrs}>`;
    }

    return `<${tag}${sanitizedSuffix}>`;
  });
}

/**
 * Preserve inline styles on form controls from `originalHtml` into `editedHtml`.
 */
export function preserveLandingFormControlStyles(originalHtml: string, editedHtml: string): string {
  if (!originalHtml || typeof originalHtml !== 'string') return editedHtml;
  if (!editedHtml || typeof editedHtml !== 'string') return editedHtml;
  if (
    !editedHtml.includes('<input') &&
    !editedHtml.includes('<textarea') &&
    !editedHtml.includes('<select') &&
    !editedHtml.includes('<button')
  ) {
    return editedHtml;
  }

  try {
    // Level 1: enforce original styles for form controls (localization-safe)
    const originalStylesByTag = extractOriginalStylesByTag(originalHtml);
    const out = applyOriginalStyles(editedHtml, originalStylesByTag);
    if (out !== editedHtml) logger.info('✅ Preserved landing page form-control styles');
    return out;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('⚠️ Primary style preservation failed, using fallback', { error: err.message });
    try {
      // Level 2: restore ALL INPUT styles using last known original input style
      const originalStylesByTag = extractOriginalStylesByTag(originalHtml);
      const lastInputStyle = originalStylesByTag.input[originalStylesByTag.input.length - 1];
      if (!lastInputStyle) return editedHtml;
      return editedHtml.replace(/<input\b([^>]*)>/gi, (full, attrsRaw) => {
        const attrs = String(attrsRaw ?? '');
        const nextAttrs = replaceOrAddStyle(attrs, lastInputStyle);
        return `<input ${nextAttrs}>`;
      });
    } catch (e2) {
      const err2 = normalizeError(e2);
      logger.warn('⚠️ Fallback style preservation failed, returning edited HTML', { error: err2.message });
      // Level 3: guaranteed
      return editedHtml;
    }
  }
}

/**
 * Restore original inline styles ONLY when the edited form-control styles are missing or broken.
 * This is useful for edit-mode where users may want style changes, but we still want to avoid a broken UI.
 */
export function preserveMissingLandingFormControlStyles(originalHtml: string, editedHtml: string): string {
  if (!originalHtml || typeof originalHtml !== 'string') return editedHtml;
  if (!editedHtml || typeof editedHtml !== 'string') return editedHtml;
  if (
    !editedHtml.includes('<input') &&
    !editedHtml.includes('<textarea') &&
    !editedHtml.includes('<select') &&
    !editedHtml.includes('<button')
  ) {
    return editedHtml;
  }

  try {
    const originalStylesByTag = extractOriginalStylesByTag(originalHtml);
    return applyMissingOriginalStyles(editedHtml, originalStylesByTag);
  } catch {
    return editedHtml;
  }
}
