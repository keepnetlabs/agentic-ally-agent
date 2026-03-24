/**
 * Shared utilities for report section processing.
 * Used by both expand-report-sections-tool and edit-report-section-tool.
 */

import { KVService } from '../../services/kv-service';
import { ReportStateSchema } from '../../schemas/report-schema';
import type { ReportState } from '../../schemas/report-schema';

/**
 * Load the latest version of a report from KV.
 * Scans v20→v1 to find the highest stored version.
 */
export async function loadLatestReport(kvService: KVService, reportId: string): Promise<ReportState | null> {
  for (let v = 20; v >= 1; v--) {
    const data = await kvService.get(`report:${reportId}:v${v}`);
    if (data) {
      const parsed = ReportStateSchema.safeParse(data);
      if (parsed.success) return parsed.data;
    }
  }
  return null;
}

/**
 * Auto-correct common AI mistakes in section JSON before validation.
 * Prevents unnecessary retries for trivial enum mismatches.
 */
export function autoCorrectSection(parsed: Record<string, unknown>): void {
  // KPI trend: AI sometimes uses "flat", "neutral", "unchanged" etc.
  if (parsed.type === 'kpi_dashboard' && Array.isArray(parsed.kpis)) {
    const validTrends = new Set(['up', 'down', 'stable', 'flat', 'neutral']);
    for (const kpi of parsed.kpis as Record<string, unknown>[]) {
      if (kpi.trend && !validTrends.has(kpi.trend as string)) {
        kpi.trend = 'stable';
      }
    }
  }

  // Timeline status: AI sometimes uses "done", "ongoing", "future" etc.
  if (parsed.type === 'timeline' && Array.isArray(parsed.items)) {
    const statusMap: Record<string, string> = {
      done: 'completed', finished: 'completed', complete: 'completed',
      ongoing: 'in_progress', active: 'in_progress', current: 'in_progress',
      future: 'planned', upcoming: 'planned', pending: 'planned',
    };
    for (const item of parsed.items as Record<string, unknown>[]) {
      if (item.status && statusMap[item.status as string]) {
        item.status = statusMap[item.status as string];
      }
    }
  }

  // Recommendations priority: AI sometimes uses "urgent", "important" etc.
  if (parsed.type === 'recommendations' && Array.isArray(parsed.items)) {
    const priorityMap: Record<string, string> = {
      urgent: 'critical', important: 'high', normal: 'medium', minor: 'low', optional: 'low',
    };
    for (const item of parsed.items as Record<string, unknown>[]) {
      if (item.priority && priorityMap[item.priority as string]) {
        item.priority = priorityMap[item.priority as string];
      }
    }
  }
}
