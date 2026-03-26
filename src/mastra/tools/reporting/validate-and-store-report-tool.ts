/**
 * Validate and Store Report Tool (Step 3)
 *
 * Final step: validates expanded report JSON, runs chart config validation,
 * stores in KV, and returns the response to FE.
 *
 * Also handles loading existing reports for edit flow.
 *
 * @see docs/REPORT_AGENT_DESIGN.md
 */

import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../../services/error-service';
import { KVService } from '../../services/kv-service';
import { KV_NAMESPACES } from '../../constants';
import {
  ReportSchema,
  ReportResponseSchema,
  ReportStateSchema,
  validateChartConfig,
} from '../../schemas/report-schema';
import type { Report, ReportSection, ReportState } from '../../schemas/report-schema';
import { loadLatestReport } from './report-section-utils';

const logger = getLogger('ValidateAndStoreReportTool');

const REPORT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ============================================
// Input / Output Schemas
// ============================================

const inputSchema = z.object({
  /** Temp KV key from expandReportSections — preferred way to pass report data (avoids large JSON in tool args) */
  expandRef: z.string().nullable().optional(),
  /** Full report data (meta + sections) — fallback if expandRef is not available (e.g. edit flow) */
  report: z
    .object({
      meta: z.object({
        title: z.string(),
        subtitle: z.string().nullable().optional(),
        author: z.string().nullable().optional(),
        generatedAt: z.string(),
        language: z.string().nullable().optional(),
        pageTarget: z.number(),
      }),
      sections: z.array(z.record(z.unknown())),
    })
    .nullable()
    .optional(),
  /** Existing reportId to load from KV (for edit flow) */
  reportId: z.string().nullable().optional(),
  /** Edit action description (for editHistory) */
  editAction: z.string().nullable().optional(),
});

const outputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      reportId: z.string(),
      version: z.number(),
      report: z.record(z.unknown()),
    })
    .optional(),
  error: z.string().optional(),
});

// ============================================
// Helpers
// ============================================

function generateReportId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `rpt_${ts}${rand}`;
}

function kvKey(reportId: string, version: number): string {
  return `report:${reportId}:v${version}`;
}

/**
 * Fix table rows — trim or pad to match column count
 */
function fixTableRows(sections: ReportSection[]): ReportSection[] {
  return sections.map(section => {
    if (section.type !== 'table') return section;
    const colCount = section.columns.length;
    const fixedRows = section.rows.map(row => {
      if (row.length === colCount) return row;
      if (row.length > colCount) return row.slice(0, colCount);
      return [...row, ...Array(colCount - row.length).fill('')];
    });
    return { ...section, rows: fixedRows };
  });
}

/**
 * Validate chart configs and convert invalid ones to table fallback
 */
function validateAndFixCharts(sections: ReportSection[]): ReportSection[] {
  return sections.map(section => {
    if (section.type !== 'chart') return section;

    const result = validateChartConfig(section.chartConfig);
    if (result.valid) return section;

    logger.warn('Invalid chart config, converting to table fallback', {
      id: section.id,
      error: result.error,
    });

    // Convert chart data to table
    const { labels, datasets } = section.chartConfig.data;
    const columns = ['Label', ...datasets.map(ds => ds.label)];
    const rows = labels.map((label, i) => [label, ...datasets.map(ds => String(ds.data[i] ?? ''))]);

    return {
      type: 'table' as const,
      id: section.id,
      title: section.title,
      columns,
      rows,
      weight: section.weight,
    };
  });
}

// ============================================
// Tool Definition
// ============================================

export const validateAndStoreReportTool = createTool({
  id: 'validate_and_store_report',
  description:
    'Validate report JSON, fix invalid charts, store in KV, and return final response. Also loads existing reports for edit flow.',
  inputSchema,
  outputSchema,
  execute: async (input, ctx?: ToolExecutionContext) => {
    const writer = ctx?.writer;
    const kvService = new KVService(KV_NAMESPACES.MICROLEARNING);

    try {
      // ─── Resolve report data: expandRef (preferred) or inline report ───
      let resolvedReport = input.report;

      if (input.expandRef) {
        logger.info('Loading expand result from temp KV', { expandRef: input.expandRef });

        // Retry with short delays — KV eventual consistency may cause immediate read to miss
        let expandData: unknown = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          expandData = await kvService.get(input.expandRef);
          if (expandData && typeof expandData === 'object' && 'meta' in expandData && 'sections' in expandData) {
            break;
          }
          if (attempt < 3) {
            logger.debug('expandRef not ready, retrying', { expandRef: input.expandRef, attempt });
            await new Promise(r => setTimeout(r, 500 * attempt)); // 500ms, 1000ms
          }
        }

        if (expandData && typeof expandData === 'object' && 'meta' in expandData && 'sections' in expandData) {
          resolvedReport = expandData as typeof input.report;
          logger.info('Expand result loaded from KV', { sectionCount: (expandData as any).sections?.length });
          // Clean up temp key (fire-and-forget)
          kvService.delete(input.expandRef).catch(() => {});
        } else {
          logger.warn('expandRef not found in KV after retries, falling back to inline report', { expandRef: input.expandRef });
        }
      }

      // ─── Edit flow: load existing report from KV ───
      if (input.reportId && !resolvedReport) {
        logger.info('Loading existing report from KV', { reportId: input.reportId });
        const latestState = await loadLatestReport(kvService, input.reportId);

        if (!latestState) {
          const errorInfo = errorService.notFound(`Report ${input.reportId} not found in KV`, { reportId: input.reportId });
          logErrorInfo(logger, 'warn', 'Report not found', errorInfo);
          return createToolErrorResponse(errorInfo);
        }

        return {
          success: true,
          data: {
            reportId: latestState.reportId,
            version: latestState.version,
            report: latestState.report,
          },
        };
      }

      // ─── New report or updated report: validate + store ───
      if (!resolvedReport) {
        const errorInfo = errorService.validation('Either expandRef, report data, or reportId must be provided');
        logErrorInfo(logger, 'warn', 'Missing report input', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      // Validate report schema
      const reportValidation = ReportSchema.safeParse(resolvedReport);
      if (!reportValidation.success) {
        const issues = reportValidation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        const errorInfo = errorService.validation(`Report validation failed: ${issues}`);
        logErrorInfo(logger, 'warn', 'Report validation failed', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      const validatedReport: Report = reportValidation.data;

      // Fix tables + validate charts
      const tableFixed = fixTableRows(validatedReport.sections);
      const fixedSections = validateAndFixCharts(tableFixed);
      const finalReport: Report = { meta: validatedReport.meta, sections: fixedSections };

      // Generate or reuse reportId — ignore placeholder values like "auto"
      const validReportId = input.reportId && input.reportId.startsWith('rpt_') ? input.reportId : null;
      const reportId = validReportId || generateReportId();
      const isEdit = !!validReportId;

      // Determine version + load previous history for edits
      let version = 1;
      let previousHistory: ReportState['editHistory'] = [];
      if (isEdit) {
        for (let v = 20; v >= 1; v--) {
          const existing = await kvService.get(kvKey(reportId, v));
          if (existing) {
            const parsed = ReportStateSchema.safeParse(existing);
            if (parsed.success) {
              previousHistory = parsed.data.editHistory;
            }
            version = v + 1;
            break;
          }
        }
      }

      // Build state — merge previous edit history
      const state: ReportState = {
        reportId,
        version,
        pageTarget: finalReport.meta.pageTarget,
        report: finalReport,
        editHistory: [
          ...previousHistory,
          ...(isEdit && input.editAction
            ? [{ version, action: input.editAction, timestamp: new Date().toISOString() }]
            : []),
        ],
      };

      // Store in KV
      const stored = await kvService.put(kvKey(reportId, version), state, { ttlSeconds: REPORT_TTL_SECONDS });
      if (!stored) {
        logger.warn('KV storage failed, returning report without persistence', { reportId });
      } else {
        logger.info('Report stored in KV', { reportId, version, key: kvKey(reportId, version) });
      }

      // Validate response
      const response = { reportId, version, report: finalReport };
      const responseValidation = ReportResponseSchema.safeParse(response);
      if (!responseValidation.success) {
        logger.warn('Response validation failed', { issues: responseValidation.error.issues });
      }

      // Emit UI signal for FE to render ReportCard
      if (writer) {
        try {
          const uiPayload = {
            reportId,
            version,
            title: finalReport.meta.title,
            subtitle: finalReport.meta.subtitle,
            pageTarget: finalReport.meta.pageTarget,
            sectionCount: finalReport.sections.length,
            report: finalReport,
          };
          const encoded = Buffer.from(JSON.stringify(uiPayload)).toString('base64');
          await writer.write({
            type: 'data-ui-signal',
            data: {
              signal: 'report_generated',
              message: `::ui:report_generated::${encoded}::/ui:report_generated::\n`,
            },
          });
          logger.debug('Report UI signal emitted', { reportId });
        } catch (signalErr) {
          logger.warn('Failed to emit report UI signal', { error: (signalErr as Error).message });
        }
      }

      return { success: true, data: response };
    } catch (err) {
      const normalized = normalizeError(err);
      const errorInfo = errorService.external(`Report validation/storage failed: ${normalized.message}`);
      logErrorInfo(logger, 'error', 'Validate and store failed', errorInfo);
      return createToolErrorResponse(errorInfo);
    }
  },
});
