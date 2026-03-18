/**
 * Generate Report Outline Tool (Step 1)
 *
 * Produces a structured outline (sections + weights + briefs) from a topic and page target.
 * No content is generated here — only the skeleton that guides section expansion.
 *
 * @see docs/REPORT_AGENT_DESIGN.md
 */

import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getDefaultAgentModel } from '../../model-providers';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../../services/error-service';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { ReportOutlineSchema, normalizeOutlineWeights } from '../../schemas/report-schema';
import type { ReportOutline } from '../../schemas/report-schema';

const logger = getLogger('GenerateReportOutlineTool');

const inputSchema = z.object({
  topic: z.string().min(1).describe('Report topic or subject'),
  pageTarget: z.number().min(1).max(30).default(5).describe('Target number of pages'),
  language: z.string().default('en').describe('Report language code (e.g. en, tr, de)'),
  mode: z.enum(['generate', 'enhance']).default('generate').describe('Generate from scratch or enhance existing content'),
  sourceDocument: z
    .string()
    .optional()
    .describe('For enhance mode: the source document text to structure into a report'),
  researchContext: z
    .string()
    .optional()
    .describe('Web research results to ground the outline in real facts. Pass snippets + full page content from webResearch tool.'),
});

const outputSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
});

const OUTLINE_SYSTEM_PROMPT = `You are a creative report architect. You design unique, topic-appropriate report structures as JSON.

Your job is to plan the structure of a report — NOT to write content. Think like a professional analyst: what story does THIS topic need?

## Fixed Rules
1. Always start with "cover" section (weight: 1.0)
2. Always include "executive_summary" early (2nd or 3rd section)
3. Each section ID must be unique, kebab-case
4. For chart sections, always specify chartType
5. The "brief" field is CRITICAL — each brief must be unique, specific, and tailored to the topic
6. Prefer FEWER sections with MORE content over MANY tiny sections

## Creative Guidelines — adapt structure to the TOPIC
- **Data-heavy topics** (finance, sports stats, security metrics): Use more charts, tables, kpi_dashboard
- **Historical topics** (company history, events): Use timeline, content sections with narrative flow
- **Comparative topics** (vs analysis, benchmarks): Use comparison, charts with multiple datasets
- **Strategic topics** (business plans, recommendations): Use content + recommendations heavily
- **Technical topics** (engineering, IT): Use tables, charts, content with structured details

Do NOT use the same structure for every topic. A football club report should feel different from a cybersecurity report.

## Section Types (mix creatively based on topic)
- cover: Title page with table of contents
- executive_summary: High-level overview (keep concise — MAX 250 words)
- kpi_dashboard: Key metrics with trends (use when topic has measurable KPIs)
- chart: Data visualization (bar, line, pie, doughnut, radar, polarArea, scatter)
- table: Structured data rows (stats, comparisons, lists)
- content: Narrative text with headings and bullets (the backbone of any report)
- recommendations: Action items with priority levels (use when report has actionable outcomes)
- timeline: Chronological events (use for history, project milestones, incident sequences)
- comparison: Side-by-side analysis (use for vs topics, before/after, options evaluation)

## Section Count
- 3 pages → 5-6 sections
- 5 pages → 7-9 sections
- 10 pages → 12-15 sections

## Weight Guidelines
- cover: ALWAYS 1.0
- executive_summary: 0.5
- kpi_dashboard: 0.5
- chart: 0.75
- table: 0.5-0.75
- content: 0.5-1.0
- recommendations: 0.75
- timeline: 0.5-0.75
- comparison: 0.75`;

const OUTLINE_USER_PROMPT = (topic: string, pageTarget: number, language: string, mode: string, sourceDocument?: string, researchContext?: string) => {
  // For outline, send first 4000 chars as summary — full doc goes to expansion tool
  const docSummary = sourceDocument ? sourceDocument.slice(0, 4000) : '';

  const basePrompt = `Create a report outline for:
- Topic: ${topic}
- Pages: ${pageTarget}
- Language: ${language}
- Mode: ${mode}

${researchContext ? `RESEARCH DATA (use these facts for accurate briefs — do NOT invent data outside this):\n${researchContext}\n\nCRITICAL: Base section briefs on REAL facts from this research. Each brief must reference specific data points, dates, or facts found above. If the research doesn't cover a sub-topic, note "general knowledge" in the brief.\n` : ''}
${mode === 'enhance' && docSummary ? `Source document (first 4000 chars):\n${docSummary}\n\nBase the outline on the source document's content. Map source sections to appropriate report section types. Preserve all data, metrics, and facts from the source.` : ''}

Respond with ONLY valid JSON matching this structure:
{
  "meta": {
    "title": "Report Title",
    "subtitle": "Optional subtitle",
    "author": "Agentic Ally",
    "generatedAt": "${new Date().toISOString()}",
    "language": "${language}",
    "pageTarget": ${pageTarget}
  },
  "sections": [
    {
      "type": "cover",
      "id": "cover",
      "title": "Report Title",
      "weight": 1.0,
      "brief": "Cover page with report title and date"
    },
    {
      "type": "executive_summary",
      "id": "executive-summary",
      "title": "Executive Summary",
      "weight": 0.5,
      "brief": "High-level overview with 3-4 key findings"
    }
    // ... more sections to fill ${pageTarget} pages
  ]
}

CRITICAL MATH RULE: The sum of ALL section weights MUST equal exactly ${pageTarget}.
Example for ${pageTarget} pages: cover(1.0) + exec_summary(0.5) + kpi(0.5)${pageTarget >= 5 ? ' + chart(0.75) + table(0.5) + content(0.5) + recommendations(0.75)' : ''} = ${pageTarget}.0
If your weights don't sum to ${pageTarget}, ADJUST them until they do. Count carefully.

IMPORTANT: Every brief MUST be specific and unique — describe exactly what data/content the section should contain.
Do NOT include any text outside the JSON.`;

  return basePrompt;
};

export const generateReportOutlineTool = createTool({
  id: 'generate_report_outline',
  description:
    'Generate a structured report outline with section types, weights, and briefs. Step 1 of report generation pipeline.',
  inputSchema,
  outputSchema,
  execute: async (input, _ctx?: ToolExecutionContext) => {
    const { topic, sourceDocument, researchContext } = input;
    const pageTarget = input.pageTarget ?? 5;
    const language = input.language ?? 'en';
    const mode = input.mode ?? 'generate';

    logger.info('Generating report outline', { topic, pageTarget, language, mode, hasResearchContext: !!researchContext });

    try {
      const model = getDefaultAgentModel();

      const startTime = Date.now();
      const { text, usage } = await generateText({
        model,
        messages: [
          { role: 'system', content: OUTLINE_SYSTEM_PROMPT },
          { role: 'user', content: OUTLINE_USER_PROMPT(topic, pageTarget, language, mode, sourceDocument, researchContext) },
        ],
        // temperature omitted — GPT-5.1 reasoning model doesn't support it
      });
      const durationMs = Date.now() - startTime;

      const inputTokens = (usage as Record<string, number>)?.inputTokens ?? 0;
      const outputTokens = (usage as Record<string, number>)?.outputTokens ?? 0;

      logger.info('Outline LLM call completed', {
        durationMs,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      });

      // Clean and parse JSON response
      const cleaned = cleanResponse(text, 'report-outline');
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const errorInfo = errorService.validation('Failed to parse outline JSON from AI response');
        logErrorInfo(logger, 'error', 'JSON parse failed', errorInfo);
        return { success: false, error: 'AI produced invalid JSON. Retrying may help.' };
      }

      // Pre-normalize weights before validation — AI often produces weights that don't sum to pageTarget
      const parsedObj = parsed as Record<string, unknown>;
      if (parsedObj.sections && Array.isArray(parsedObj.sections)) {
        normalizeOutlineWeights(parsedObj.sections as Array<{ weight: number; [key: string]: unknown }>, pageTarget);
      }

      // Validate against schema
      const validation = ReportOutlineSchema.safeParse(parsed);
      if (!validation.success) {
        const issues = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        logger.warn('Outline validation failed', { issues });
        return { success: false, error: `Outline validation failed: ${issues}` };
      }

      const outline: ReportOutline = validation.data;
      const normalizedWeightSum = outline.sections.reduce((sum, s) => sum + s.weight, 0);

      logger.info('Report outline generated successfully', {
        topic,
        pageTarget,
        sectionCount: outline.sections.length,
        weightSum: normalizedWeightSum.toFixed(1),
        sectionTypes: outline.sections.map(s => s.type),
      });

      return { success: true, data: outline };
    } catch (err) {
      const normalized = normalizeError(err);
      const errorInfo = errorService.external(`Report outline generation failed: ${normalized.message}`);
      logErrorInfo(logger, 'error', 'Outline generation failed', errorInfo);
      return createToolErrorResponse(errorInfo);
    }
  },
});
