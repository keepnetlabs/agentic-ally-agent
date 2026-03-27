/**
 * expand-report-sections-tool
 *
 * Takes the outline from Step 1 and expands each section with full content.
 * Runs section expansions in parallel batches (3 concurrent) with retry on failure.
 *
 * EU AI Act (Art. 9) Tool Risk Metadata:
 * - riskLevel: limited
 * - rationale: AI-powered expansion of report outline into full section content
 * @see docs/AI_COMPLIANCE_INVENTORY.md
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
import { ReportSectionSchema } from '../../schemas/report-schema';
import type { OutlineSection, ReportSection } from '../../schemas/report-schema';
import { KVService } from '../../services/kv-service';
import { KV_NAMESPACES } from '../../constants';
import { autoCorrectSection } from './report-section-utils';

const logger = getLogger('ExpandReportSectionsTool');

// ============================================
// Input / Output Schemas
// ============================================

const inputSchema = z.object({
  outline: z.object({
    meta: z.object({
      title: z.string(),
      subtitle: z.string().optional(),
      author: z.string(),
      generatedAt: z.string(),
      language: z.string(),
      pageTarget: z.number(),
    }),
    sections: z.array(
      z.object({
        type: z.string(),
        id: z.string(),
        title: z.string(),
        weight: z.number(),
        brief: z.string(),
        chartType: z.string().optional(),
      })
    ),
  }),
  /** For enhance mode: source document text to extract content from */
  sourceDocument: z.string().optional(),
  /** Web research summary to ground sections in real facts. Passed to each section's LLM call. */
  researchContext: z.string().optional(),
});

const outputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      expandRef: z.string().describe('Temp KV key where full report data is stored. Pass this to validateAndStoreReport.'),
      sectionCount: z.number(),
      failedSections: z.array(z.string()).optional(),
    })
    .optional(),
  error: z.string().optional(),
});

// ============================================
// Concurrency Helper
// ============================================

/** Run promises in batches of `concurrency` */
async function batchedAllSettled<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

// ============================================
// Source Document Chunking (Enhance Mode)
// ============================================

/** Max characters per section chunk — keeps token usage reasonable */
const MAX_CHUNK_CHARS = 8000;

/**
 * Split source document into chunks for each section.
 * - cover + executive_summary → full doc summary (first + last 2000 chars)
 * - Other sections → proportional chunk based on position in outline
 * - If no source document → all undefined
 */
function chunkSourceForSections(
  sourceDocument: string | undefined,
  sections: OutlineSection[]
): (string | undefined)[] {
  if (!sourceDocument) return sections.map(() => undefined);

  const doc = sourceDocument;
  const docLen = doc.length;

  // Small docs (< 10K chars) → send full doc to every section
  if (docLen <= 10000) {
    return sections.map(() => doc);
  }

  // For larger docs: overview sections get summary, detail sections get proportional chunks
  const overviewTypes = new Set(['cover', 'executive_summary', 'recommendations']);
  const detailSections = sections.filter(s => !overviewTypes.has(s.type));
  const chunkSize = Math.min(MAX_CHUNK_CHARS, Math.floor(docLen / Math.max(detailSections.length, 1)));

  let detailIndex = 0;
  return sections.map(section => {
    if (overviewTypes.has(section.type)) {
      // Overview sections get beginning + end of doc (executive summary needs big picture)
      const head = doc.slice(0, 3000);
      const tail = doc.slice(-2000);
      return head + '\n\n[...]\n\n' + tail;
    }

    // Detail sections get sequential chunks with overlap
    const start = Math.max(0, detailIndex * chunkSize - 500); // 500 char overlap
    const end = Math.min(docLen, start + chunkSize + 500);
    detailIndex++;
    return doc.slice(start, end);
  });
}

// ============================================
// Section Expansion Prompts
// ============================================

const EXPANSION_SYSTEM_PROMPT = `You are a Tier-1 consulting report writer (McKinsey/BCG standard). You expand report section outlines into full, structured content.

## Writing Standard (Pyramid Principle)
- Lead with the conclusion/insight FIRST, then support with evidence
- Every section answers "so what?" — the reader should understand the key message in the first sentence
- Use **markdown formatting**: ## headings, **bold**, bullet points, numbered lists, > blockquotes
- NEVER write wall-of-text paragraphs — every section must have visual structure
- Use data-driven language with specific numbers, percentages, comparisons
- Professional tone suitable for C-level executive readership
- Prefer insight-driven sub-headings that communicate the takeaway. Example: instead of "Email Phishing Statistics", write "Email Phishing Accounts for 70% of All Attacks"
- NEVER use em dash (—). Use semicolons (;) or periods (.) instead.
- Start content sections with a bold key message sentence, then elaborate

## STRICT Content Length Limits (CRITICAL — do NOT exceed)
- weight 0.25 → MAX 150 words. 1 short paragraph or 3-4 bullet points. STOP at 150 words.
- weight 0.5 → MAX 250 words. 2 short paragraphs with bullets. STOP at 250 words.
- weight 0.75 → MAX 350 words. 3 paragraphs + supporting data. STOP at 350 words.
- weight 1.0 → MAX 500 words. 4 paragraphs max. STOP at 500 words.

If the section type is "executive_summary", keep it concise — MAX 250 words regardless of weight. Structure: 1 overview sentence, 3-4 key findings as bullets, 2-3 recommended actions.

## Table Rules
1. Every row MUST have exactly the same number of values as columns
2. Maximum 4-5 columns. If more data is needed, split into multiple tables or use a content section instead
3. Keep cell text SHORT; max 15 words per cell. Use abbreviations where appropriate
4. Use consistent formatting: percentages with %, numbers without commas
5. Sort rows by the most relevant column (descending by default)
6. Maximum 12 rows

## Chart Rules
1. Labels array and each dataset's data array MUST have equal length
2. Pie/doughnut: single dataset only
3. Use meaningful, distinct colors from the provided palette
4. Include a description explaining the chart's key insight — MAX 3 sentences, be concise

## CRITICAL: Data Accuracy (Anti-Hallucination)
- Use ONLY facts, dates, and numbers from the provided report context, source document, or RESEARCH DATA.
- Do NOT invent specific dates, founding years, revenue figures, or company milestones.
- If a specific fact is unknown, use general terms ("established in the mid-2010s") or omit it. NEVER fabricate precise data.
- For timeline sections: include ONLY events explicitly supported by available data. Fewer verified items is better than many fabricated ones.
- General industry knowledge is acceptable. Company-specific claims MUST be grounded in provided data or research data.

## Output
Respond with ONLY valid JSON matching the section schema. No text outside JSON.`;

function buildExpansionUserPrompt(
  section: OutlineSection,
  reportContext: string,
  sourceDocument?: string,
  researchContext?: string
): string {
  const schemaHint = getSchemaHintForType(section.type);
  const sourceHint = sourceDocument
    ? `\n\nSOURCE DOCUMENT (extract relevant data — do NOT invent numbers):\n${sourceDocument}`
    : '';
  const researchHint = researchContext
    ? `\n\nRESEARCH DATA (use ONLY these facts for specific claims — do NOT fabricate data outside this):\n${researchContext}`
    : '';

  return `REPORT CONTEXT (maintain consistency):
${reportContext}

SECTION TO EXPAND:
- Type: ${section.type}
- ID: ${section.id}
- Title: ${section.title}
- Weight: ${section.weight}
- Brief: ${section.brief}
${section.chartType ? `- Chart Type: ${section.chartType}` : ''}

Output MUST be valid JSON matching this structure:
${schemaHint}
${sourceHint}
${researchHint}

FINAL SELF-CHECK (before output):
1. Chart: does labels.length === each dataset's data.length?
2. Table: does every row have exactly columns.length values?
3. Content/executive_summary: is word count within the weight limit?
4. Is the JSON valid and does it match the schema hint above?
If any fails → fix before outputting.

Respond with ONLY the JSON object. No markdown fences, no explanation.`;
}

function getSchemaHintForType(type: string): string {
  const hints: Record<string, string> = {
    cover: `{ "type": "cover", "id": "...", "title": "...", "subtitle": "...", "date": "YYYY-MM-DD", "weight": 1.0 }`,
    executive_summary: `{ "type": "executive_summary", "id": "...", "title": "...", "content": "markdown text with ## headings and **bold**", "keyFindings": ["finding 1", "finding 2", "finding 3"], "weight": 0.5 }`,
    kpi_dashboard: `{ "type": "kpi_dashboard", "id": "...", "title": "...", "kpis": [{ "label": "Click Rate", "value": "12.3%", "trend": "down", "delta": "-2.1%" }, { "label": "Report Rate", "value": "67%", "trend": "up", "delta": "+5%" }], "weight": 0.5 }`,
    chart: `{ "type": "chart", "id": "...", "title": "...", "description": "insight text", "chartConfig": { "type": "bar", "data": { "labels": ["A","B","C"], "datasets": [{ "label": "Series 1", "data": [10,20,15], "backgroundColor": ["#0B326F","#E94F2E","#3B82F6"] }] }, "options": {} }, "weight": 0.75 }`,
    table: `{ "type": "table", "id": "...", "title": "...", "columns": ["Col1","Col2","Col3"], "rows": [["val1","val2","val3"]], "weight": 0.5 }`,
    content: `{ "type": "content", "id": "...", "title": "...", "content": "## Heading\\n\\nParagraph with **bold** and bullet points:\\n\\n- Point 1\\n- Point 2", "weight": 0.5 }`,
    recommendations: `{ "type": "recommendations", "id": "...", "title": "...", "items": [{ "priority": "critical", "text": "Implement MFA for all users", "detail": "Multi-factor authentication reduces account compromise by 99%" }, { "priority": "high", "text": "Monthly phishing simulations", "detail": "Regular testing maintains awareness levels" }], "weight": 0.5 }`,
    timeline: `{ "type": "timeline", "id": "...", "title": "...", "items": [{ "date": "2025-01", "event": "Phishing awareness campaign launched", "detail": "Company-wide rollout", "status": "completed" }, { "date": "2025-03", "event": "Q1 assessment", "status": "in_progress" }], "weight": 0.5 }`,
    comparison: `{ "type": "comparison", "id": "...", "title": "...", "left": { "label": "Option A", "points": ["point 1"] }, "right": { "label": "Option B", "points": ["point 1"] }, "weight": 0.5 }`,
  };
  return hints[type] || hints.content;
}

/** Keepnet brand color palette for all charts */
const REPORT_COLOR_PALETTE = {
  primary: ['#0B326F', '#1E4A8A', '#2D5F9E'], // Navy Blue (Keepnet primary)
  accent: ['#E94F2E', '#F06A4D', '#F4876D'], // Orange (Keepnet accent)
  info: ['#3B82F6', '#60A5FA', '#93C5FD'], // Info Blue
  success: ['#10B981', '#34D399', '#6EE7B7'], // Success Green
  warning: ['#F59E0B', '#FBBF24', '#FCD34D'], // Warning Yellow
  neutral: ['#41526B', '#9CA3AF', '#D1D5DB'], // Text Gray
};

function buildReportContext(meta: { title: string; subtitle?: string; language: string; pageTarget: number }): string {
  return `- Title: ${meta.title}
- Subtitle: ${meta.subtitle || 'N/A'}
- Language: ${meta.language}
- Pages: ${meta.pageTarget}
- Tone: Professional, data-driven, executive-ready

CHART COLOR PALETTE — Keepnet brand (use ONLY these colors for ALL charts):
- Primary series (navy): ${REPORT_COLOR_PALETTE.primary.join(', ')}
- Accent series (orange): ${REPORT_COLOR_PALETTE.accent.join(', ')}
- Info series (blue): ${REPORT_COLOR_PALETTE.info.join(', ')}
- Success/positive: ${REPORT_COLOR_PALETTE.success.join(', ')}
- Warning: ${REPORT_COLOR_PALETTE.warning.join(', ')}
- Neutral: ${REPORT_COLOR_PALETTE.neutral.join(', ')}

Rules:
- First dataset: navy (#0B326F)
- Second dataset: orange (#E94F2E)
- Third dataset: info blue (#3B82F6)
- For pie/doughnut: cycle through #0B326F, #E94F2E, #3B82F6, #10B981, #F59E0B, #41526B
- NEVER use random or unlisted colors`;
}

// ============================================
// Single Section Expansion
// ============================================

// Shared model instance — created once, reused across all section calls
let _sharedModel: ReturnType<typeof getDefaultAgentModel> | null = null;
function getSharedModel() {
  if (!_sharedModel) _sharedModel = getDefaultAgentModel();
  return _sharedModel;
}

interface ExpansionResult {
  section: ReportSection;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

async function expandSingleSection(
  section: OutlineSection,
  reportContext: string,
  sourceDocument?: string,
  researchContext?: string
): Promise<ExpansionResult> {
  const startTime = Date.now();
  const { text, usage } = await trackedGenerateText(`report-expand-${section.type}`, {
    model: getSharedModel(),
    messages: [
      { role: 'system', content: EXPANSION_SYSTEM_PROMPT },
      { role: 'user', content: buildExpansionUserPrompt(section, reportContext, sourceDocument, researchContext) },
    ],
    // temperature omitted — GPT-5.1 reasoning model doesn't support it
  });
  const durationMs = Date.now() - startTime;
  const inputTokens = (usage as Record<string, number>)?.inputTokens ?? 0;
  const outputTokens = (usage as Record<string, number>)?.outputTokens ?? 0;

  const cleaned = cleanResponse(text, `section-${section.id}`);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Section ${section.id}: AI returned invalid JSON`);
  }

  // Force id, type, and weight to match the outline (AI may produce different values)
  parsed.id = section.id;
  parsed.type = section.type;
  parsed.weight = section.weight;

  // Auto-correct common AI mistakes before validation
  autoCorrectSection(parsed);

  const validation = ReportSectionSchema.safeParse(parsed);
  if (!validation.success) {
    const issues = validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Validation failed for section ${section.id}: ${issues}`);
  }

  return { section: validation.data, inputTokens, outputTokens, durationMs };
}

// ============================================
// Placeholder for failed sections
// ============================================

function createPlaceholderSection(section: OutlineSection): ReportSection {
  return {
    type: 'content',
    id: section.id,
    title: section.title,
    content: `*This section could not be generated. You can edit the report to regenerate it.*`,
    weight: section.weight,
  };
}

// ============================================
// Tool Definition
// ============================================

export const expandReportSectionsTool = createTool({
  id: 'expand_report_sections',
  description:
    'Expand report outline sections into full content with parallel LLM calls. Step 2 of report generation pipeline.',
  inputSchema,
  outputSchema,
  execute: async (input, _ctx?: ToolExecutionContext) => {
    const { outline, sourceDocument, researchContext } = input;
    const reportContext = buildReportContext(outline.meta);
    const sections = outline.sections as OutlineSection[];

    logger.info('Expanding report sections', {
      sectionCount: sections.length,
      pageTarget: outline.meta.pageTarget,
      types: sections.map(s => s.type),
    });

    try {
      // For enhance mode: chunk source document so each section gets its relevant portion
      // Cover and exec_summary get the full doc (they need overview), others get proportional chunks
      const sourceChunks = chunkSourceForSections(sourceDocument, sections);

      // Build expansion tasks
      const tasks = sections.map((section, i) => () => expandSingleSection(section, reportContext, sourceChunks[i], researchContext));

      // Run in batches of 3 with retry
      const CONCURRENCY = 3;
      const results = await batchedAllSettled(tasks, CONCURRENCY);

      const expandedSections: ReportSection[] = [];
      const failedSections: string[] = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalDurationMs = 0;

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const section = sections[i];

        if (result.status === 'fulfilled') {
          expandedSections.push(result.value.section);
          totalInputTokens += result.value.inputTokens;
          totalOutputTokens += result.value.outputTokens;
          totalDurationMs += result.value.durationMs;
          logger.debug('Section expanded', {
            id: section.id,
            type: section.type,
            inputTokens: result.value.inputTokens,
            outputTokens: result.value.outputTokens,
            durationMs: result.value.durationMs,
          });
        } else {
          // Retry once
          logger.warn('Section expansion failed, retrying', {
            id: section.id,
            error: result.reason?.message,
          });

          try {
            const retried = await expandSingleSection(section, reportContext, sourceChunks[i], researchContext);
            expandedSections.push(retried.section);
            totalInputTokens += retried.inputTokens;
            totalOutputTokens += retried.outputTokens;
            totalDurationMs += retried.durationMs;
            logger.info('Section retry succeeded', { id: section.id });
          } catch (retryErr) {
            // Critical sections (cover, executive_summary) → fail the whole report
            if (section.type === 'cover' || section.type === 'executive_summary') {
              const errorInfo = errorService.external(
                `Critical section "${section.id}" failed after retry: ${(retryErr as Error).message}`
              );
              logErrorInfo(logger, 'error', 'Critical section failed', errorInfo);
              return createToolErrorResponse(errorInfo);
            }

            // Non-critical → placeholder
            logger.warn('Section retry failed, using placeholder', { id: section.id });
            expandedSections.push(createPlaceholderSection(section));
            failedSections.push(section.id);
          }
        }
      }

      const totalTokens = totalInputTokens + totalOutputTokens;
      const costPerPage = sections.length > 0 ? (totalTokens / outline.meta.pageTarget).toFixed(0) : '0';

      logger.info('Report sections expanded — cost summary', {
        total: sections.length,
        succeeded: sections.length - failedSections.length,
        failed: failedSections.length,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        tokensPerPage: costPerPage,
        totalDurationMs,
        avgDurationPerSectionMs: Math.round(totalDurationMs / sections.length),
      });

      // Store full report in temp KV — agent only passes the ref key (avoids large JSON in tool args)
      const expandRef = `temp:expand:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const reportData = { meta: outline.meta, sections: expandedSections };

      const kvService = new KVService(KV_NAMESPACES.MICROLEARNING);
      const stored = await kvService.put(expandRef, reportData, { ttlSeconds: 300 }); // 5 min TTL
      if (!stored) {
        logger.warn('Failed to store expand result in KV, returning inline fallback');
        // Fallback: return inline data (may truncate in agent, but better than nothing)
        return {
          success: true,
          data: { expandRef: '', sectionCount: expandedSections.length, ...(failedSections.length > 0 && { failedSections }) },
          error: 'KV storage failed — report data may be lost. Try again.',
        };
      }

      logger.info('Expand result stored in temp KV', { expandRef, sectionCount: expandedSections.length });

      return {
        success: true,
        data: {
          expandRef,
          sectionCount: expandedSections.length,
          ...(failedSections.length > 0 && { failedSections }),
        },
      };
    } catch (err) {
      const normalized = normalizeError(err);
      const errorInfo = errorService.external(`Section expansion failed: ${normalized.message}`);
      logErrorInfo(logger, 'error', 'Expansion failed', errorInfo);
      return createToolErrorResponse(errorInfo);
    }
  },
});
