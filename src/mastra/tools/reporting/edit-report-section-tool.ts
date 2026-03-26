/**
 * Edit Report Section Tool
 *
 * Loads an existing report from KV, regenerates a single section based on user instruction,
 * and saves the updated report as a new version.
 *
 * Used for edit flow: "Change the table to show quarterly data" or "Make the recommendations more specific"
 *
 * @see docs/REPORT_AGENT_DESIGN.md
 */

import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { getDefaultAgentModel } from '../../model-providers';
import { trackedGenerateText } from '../../utils/core/tracked-generate';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../../services/error-service';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { KVService } from '../../services/kv-service';
import { KV_NAMESPACES } from '../../constants';
import { ReportSectionSchema } from '../../schemas/report-schema';
import type { ReportState, ReportSection } from '../../schemas/report-schema';
import { autoCorrectSection, loadLatestReport } from './report-section-utils';
import { isSafeId } from '../../utils/core/id-utils';

const logger = getLogger('EditReportSectionTool');

const REPORT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const inputSchema = z.object({
  /** Report ID to edit */
  reportId: z.string().min(1).refine(isSafeId, { message: 'Invalid reportId format' }),
  /** Which section to edit — can be section ID, type, title, or index (e.g. "chart-1", "table", "3rd section") */
  sectionRef: z.string().min(1),
  /** What to change — user's instruction */
  instruction: z.string().min(1),
});

const outputSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

/**
 * Find the section index by various reference types
 */
function findSectionIndex(sections: ReportSection[], ref: string): number {
  // 1. Exact ID match
  const byId = sections.findIndex(s => s.id === ref);
  if (byId !== -1) return byId;

  // 2. Type match (first occurrence)
  const byType = sections.findIndex(s => s.type === ref);
  if (byType !== -1) return byType;

  // 3. Title match (case-insensitive partial)
  const lowerRef = ref.toLowerCase();
  const byTitle = sections.findIndex(s => s.title.toLowerCase().includes(lowerRef));
  if (byTitle !== -1) return byTitle;

  // 4. Index reference ("3rd section", "section 3", "#3")
  const numMatch = ref.match(/(\d+)/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1; // 1-based to 0-based
    if (idx >= 0 && idx < sections.length) return idx;
  }

  return -1;
}

const EDIT_SYSTEM_PROMPT = `You are a report section editor. You regenerate a SINGLE section of an existing report based on user instructions.

Rules:
- Output ONLY valid JSON matching the section schema
- Keep the same section type, id, and weight as the original
- Apply the user's specific changes
- Maintain consistency with the rest of the report (title, language, tone)
- Do NOT change the section type unless explicitly asked
- Use markdown formatting for content fields
- For charts: labels and data arrays MUST have equal length
- For tables: every row MUST have the same number of values as columns
- For chart colors use ONLY Keepnet palette: navy=#0B326F, orange=#E94F2E, blue=#3B82F6, green=#10B981, yellow=#F59E0B, gray=#41526B`;

export const editReportSectionTool = createTool({
  id: 'edit_report_section',
  description:
    'Edit a single section of an existing report. Loads report from KV, regenerates the specified section with user instructions, saves as new version.',
  inputSchema,
  outputSchema,
  execute: async (input, ctx?: ToolExecutionContext) => {
    const { reportId, sectionRef, instruction } = input;
    const writer = ctx?.writer;
    const kvService = new KVService(KV_NAMESPACES.MICROLEARNING);

    logger.info('Editing report section', { reportId, sectionRef, instruction });

    try {
      // 1. Load existing report
      const state = await loadLatestReport(kvService, reportId);
      if (!state) {
        const errorInfo = errorService.notFound(`Report ${reportId} not found`, { reportId });
        logErrorInfo(logger, 'warn', 'Report not found', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      const { report } = state;
      const sections = report.sections;

      // 2. Find target section
      const sectionIdx = findSectionIndex(sections, sectionRef);
      if (sectionIdx === -1) {
        const availableSections = sections.map((s, i) => `${i + 1}. [${s.type}] ${s.title} (id: ${s.id})`).join('\n');
        const errorInfo = errorService.notFound(`Section "${sectionRef}" not found. Available sections:\n${availableSections}`, { sectionRef });
        logErrorInfo(logger, 'warn', 'Section not found', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      const targetSection = sections[sectionIdx];
      logger.info('Found target section', { sectionIdx, id: targetSection.id, type: targetSection.type });

      // 3. Regenerate section with user instruction
      const model = getDefaultAgentModel();
      const { text } = await trackedGenerateText('report-edit-section', {
        model,
        messages: [
          { role: 'system', content: EDIT_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `REPORT CONTEXT:
- Title: ${report.meta.title}
- Language: ${report.meta.language}

CURRENT SECTION (${targetSection.type}):
${JSON.stringify(targetSection, null, 2)}

USER INSTRUCTION: ${instruction}

Regenerate this section applying the user's changes. Output ONLY valid JSON.`,
          },
        ],
      });

      const cleaned = cleanResponse(text, `edit-${targetSection.id}`);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const errorInfo = errorService.aiModel('AI returned invalid JSON during edit');
        logErrorInfo(logger, 'warn', 'JSON parse failed', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      // Force original id, type, weight
      parsed.id = targetSection.id;
      parsed.type = targetSection.type;
      parsed.weight = targetSection.weight;

      // Auto-correct common AI mistakes (same as expansion tool)
      autoCorrectSection(parsed);

      const validation = ReportSectionSchema.safeParse(parsed);
      if (!validation.success) {
        const issues = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        const errorInfo = errorService.validation(`Edited section validation failed: ${issues}`);
        logErrorInfo(logger, 'warn', 'Section validation failed', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      // 4. Replace section in report
      const updatedSections = [...sections];
      updatedSections[sectionIdx] = validation.data;

      const updatedReport = { meta: report.meta, sections: updatedSections };
      const newVersion = state.version + 1;

      // 5. Save new version
      const newState: ReportState = {
        reportId,
        version: newVersion,
        pageTarget: report.meta.pageTarget,
        report: updatedReport,
        editHistory: [
          ...state.editHistory,
          { version: newVersion, action: `Edited section "${targetSection.title}": ${instruction}`, timestamp: new Date().toISOString() },
        ],
      };

      const stored = await kvService.put(`report:${reportId}:v${newVersion}`, newState, { ttlSeconds: REPORT_TTL_SECONDS });
      if (!stored) {
        logger.warn('KV storage failed for edited report', { reportId, newVersion });
      }

      // 6. Emit UI signal
      if (writer) {
        try {
          const uiPayload = {
            reportId,
            version: newVersion,
            title: updatedReport.meta.title,
            subtitle: updatedReport.meta.subtitle,
            pageTarget: updatedReport.meta.pageTarget,
            sectionCount: updatedSections.length,
            report: updatedReport,
          };
          const encoded = Buffer.from(JSON.stringify(uiPayload)).toString('base64');
          await writer.write({
            type: 'data-ui-signal',
            data: {
              signal: 'report_generated',
              message: `::ui:report_generated::${encoded}::/ui:report_generated::\n`,
            },
          });
        } catch (signalErr) {
          logger.warn('Failed to emit report UI signal', { error: (signalErr as Error).message });
        }
      }

      logger.info('Section edited successfully', {
        reportId,
        sectionId: targetSection.id,
        oldVersion: state.version,
        newVersion,
      });

      return {
        success: true,
        data: {
          reportId,
          version: newVersion,
          editedSection: targetSection.id,
          report: updatedReport,
        },
      };
    } catch (err) {
      const normalized = normalizeError(err);
      const errorInfo = errorService.external(`Section edit failed: ${normalized.message}`);
      logErrorInfo(logger, 'error', 'Edit failed', errorInfo);
      return createToolErrorResponse(errorInfo);
    }
  },
});
