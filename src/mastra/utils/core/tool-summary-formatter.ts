/**
 * Tool Summary Formatter
 *
 * Purpose:
 * - Standardize user-facing tool summaries across upload/assign tools
 * - Keep summaries short, deterministic, and easy to parse (key=value pairs)
 *
 * Rules:
 * - Stable key ordering (call-site controls order by passing ordered keys)
 * - Skip undefined/null/empty-string values
 * - Never throws (safe string formatting)
 */

export interface ToolSummaryKV {
  key: string;
  value: string | number | boolean | null | undefined;
}

function isPresent(v: ToolSummaryKV['value']): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  return true;
}

function normalizeValue(v: Exclude<ToolSummaryKV['value'], undefined | null>): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

export function formatToolSummaryKV(parts: ToolSummaryKV[]): string {
  try {
    const filtered = parts.filter(p => p && p.key && isPresent(p.value));
    if (filtered.length === 0) return '';
    return filtered
      .map(p => `${p.key}=${normalizeValue(p.value as Exclude<ToolSummaryKV['value'], undefined | null>)}`)
      .join(', ');
  } catch {
    // Guaranteed fallback
    return '';
  }
}

export function formatToolSummary(params: {
  prefix: string; // e.g. "✅ Training uploaded"
  title?: string; // shown as : "Title"
  suffix?: string; // e.g. "Ready to assign"
  kv?: ToolSummaryKV[];
}): string {
  const { prefix, title, suffix, kv } = params;
  const safePrefix = (prefix || '').trim();
  const safeTitle = typeof title === 'string' && title.trim() ? title.trim() : undefined;
  const safeSuffix = typeof suffix === 'string' && suffix.trim() ? suffix.trim() : undefined;
  const kvText = kv ? formatToolSummaryKV(kv) : '';

  const head = safeTitle ? `${safePrefix}: "${safeTitle}".` : `${safePrefix}.`;
  if (!safeSuffix && !kvText) return head;
  if (safeSuffix && !kvText) return `${head} ${safeSuffix}.`;
  if (!safeSuffix && kvText) return `${head} (${kvText}).`;
  return `${head} ${safeSuffix} (${kvText}).`;
}
