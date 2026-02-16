/**
 * Log redaction utilities
 *
 * Goal: help log "shape" (keys/lengths/counts) instead of raw sensitive content.
 * Never throws.
 */

export interface LogSummaryOptions {
  maxKeys?: number;
  maxStringPreview?: number; // preview only when explicitly requested (default: 0)
}

export interface LogSummary {
  type: string;
  length?: number; // for strings
  keys?: string[];
  count?: number; // for arrays
  preview?: string; // optional, disabled by default
}

export function summarizeForLog(value: unknown, options: LogSummaryOptions = {}): LogSummary {
  const { maxKeys = 20, maxStringPreview = 0 } = options;

  try {
    if (value === null) return { type: 'null' };
    if (value === undefined) return { type: 'undefined' };

    if (typeof value === 'string') {
      const trimmed = value;
      const out: LogSummary = { type: 'string', length: trimmed.length };
      if (maxStringPreview > 0 && trimmed.length > 0) {
        out.preview = trimmed.slice(0, maxStringPreview);
      }
      return out;
    }

    if (Array.isArray(value)) {
      return { type: 'array', count: value.length };
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value as Record<string, unknown>);
      return {
        type: 'object',
        keys: keys.slice(0, maxKeys),
        count: keys.length,
      };
    }

    return { type: typeof value };
  } catch {
    return { type: 'unknown' };
  }
}
