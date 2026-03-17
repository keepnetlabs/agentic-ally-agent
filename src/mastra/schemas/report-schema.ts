/**
 * Report Schema
 *
 * Zod schemas for the Report Agent's structured JSON output.
 * Agent produces JSON only — FE renders via Vue components + Chart.js.
 *
 * Section types use discriminated union on "type" field.
 * @see docs/REPORT_AGENT_DESIGN.md
 */

import { z } from 'zod';

// ============================================
// Section Schemas (discriminated union)
// ============================================

/** Cover page — always weight 1.0, always first section */
export const CoverSectionSchema = z.object({
  type: z.literal('cover'),
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  date: z.string().min(1),
  weight: z.number().min(0.25).default(1.0),
});

/** Executive summary — key findings + high-level overview */
export const ExecutiveSummarySectionSchema = z.object({
  type: z.literal('executive_summary'),
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1), // Markdown
  keyFindings: z.array(z.string()).optional(),
  weight: z.number().min(0.25).default(0.5),
});

/** KPI dashboard — 2-6 metric cards */
export const KpiDashboardSectionSchema = z.object({
  type: z.literal('kpi_dashboard'),
  id: z.string().min(1),
  title: z.string().min(1),
  kpis: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        trend: z.enum(['up', 'down', 'stable', 'flat', 'neutral']),
        delta: z.string().optional(),
      })
    )
    .min(1),
  weight: z.number().min(0.25).default(0.5),
});

/** Chart — Chart.js config, rendered by FE */
export const ChartSectionSchema = z.object({
  type: z.literal('chart'),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  chartConfig: z.object({
    type: z.enum(['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter']),
    data: z.object({
      labels: z.array(z.string()),
      datasets: z.array(
        z.object({
          label: z.string(),
          data: z.array(z.number()),
          backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
          borderColor: z.union([z.string(), z.array(z.string())]).optional(),
          yAxisID: z.string().optional(),
        })
      ),
    }),
    options: z.record(z.unknown()).optional(),
  }),
  weight: z.number().min(0.25).default(0.75),
});

/** Table — column headers + rows */
export const TableSectionSchema = z.object({
  type: z.literal('table'),
  id: z.string().min(1),
  title: z.string().min(1),
  columns: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).min(1),
  highlightColumn: z.number().optional(),
  weight: z.number().min(0.25).default(0.5),
});

/** Free-form content — markdown text, paragraphs, bullet lists */
export const ContentSectionSchema = z.object({
  type: z.literal('content'),
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1), // Markdown
  weight: z.number().min(0.25).default(0.5),
});

/** Recommendations — prioritized action items */
export const RecommendationsSectionSchema = z.object({
  type: z.literal('recommendations'),
  id: z.string().min(1),
  title: z.string().min(1),
  items: z.array(
    z.object({
      priority: z.enum(['critical', 'high', 'medium', 'low']),
      text: z.string().min(1),
      detail: z.string().optional(),
    })
  ),
  weight: z.number().min(0.25).default(0.5),
});

/** Timeline — chronological events */
export const TimelineSectionSchema = z.object({
  type: z.literal('timeline'),
  id: z.string().min(1),
  title: z.string().min(1),
  items: z.array(
    z.object({
      date: z.string().min(1),
      event: z.string().min(1),
      detail: z.string().optional(),
      status: z.enum(['completed', 'in_progress', 'planned']).optional(),
    })
  ),
  weight: z.number().min(0.25).default(0.5),
});

/** Comparison — side-by-side */
export const ComparisonSectionSchema = z.object({
  type: z.literal('comparison'),
  id: z.string().min(1),
  title: z.string().min(1),
  left: z.object({ label: z.string().min(1), points: z.array(z.string()) }),
  right: z.object({ label: z.string().min(1), points: z.array(z.string()) }),
  weight: z.number().min(0.25).default(0.5),
});

// ============================================
// Discriminated Union
// ============================================

export const ReportSectionSchema = z.discriminatedUnion('type', [
  CoverSectionSchema,
  ExecutiveSummarySectionSchema,
  KpiDashboardSectionSchema,
  ChartSectionSchema,
  TableSectionSchema,
  ContentSectionSchema,
  RecommendationsSectionSchema,
  TimelineSectionSchema,
  ComparisonSectionSchema,
]);

// ============================================
// Branding
// ============================================

export const ReportBrandingSchema = z.object({
  logoUrl: z.string().default(''),
  primaryColor: z.string().default('#0B326F'),
  companyName: z.string().default('Keepnet Labs'),
});

// ============================================
// Report Meta + Root
// ============================================

export const ReportMetaSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().default('Agentic Ally'),
  generatedAt: z.string().min(1),
  language: z.string().default('en'),
  pageTarget: z.number().min(1).max(30),
  branding: ReportBrandingSchema.optional(),
});

export const ReportSchema = z
  .object({
    meta: ReportMetaSchema,
    sections: z.array(ReportSectionSchema).min(1),
  })
  .refine(
    data => {
      const ids = data.sections.map(s => s.id);
      return new Set(ids).size === ids.length;
    },
    { message: 'Duplicate section IDs found' }
  );

// ============================================
// Report Response (Agent → FE)
// ============================================

export const ReportResponseSchema = z.object({
  reportId: z.string().min(1),
  version: z.number().int().min(1),
  report: ReportSchema,
});

// ============================================
// Outline (Step 1 output — lightweight, no content yet)
// ============================================

export const OutlineSectionSchema = z.object({
  type: z.enum([
    'cover',
    'executive_summary',
    'kpi_dashboard',
    'chart',
    'table',
    'content',
    'recommendations',
    'timeline',
    'comparison',
  ]),
  id: z.string().min(1),
  title: z.string().min(1),
  weight: z.number().min(0.25),
  /** Guides section expansion — what specific content to generate. Required to prevent repetition in long reports */
  brief: z.string().min(1),
  /** For chart sections — suggested chart type. Invalid values are silently dropped to 'bar' */
  chartType: z.string().optional(),
});

export const ReportOutlineSchema = z
  .object({
    meta: ReportMetaSchema,
    sections: z.array(OutlineSectionSchema).min(1),
  })
  .refine(
    data => {
      const ids = data.sections.map(s => s.id);
      return new Set(ids).size === ids.length;
    },
    { message: 'Duplicate section IDs found' }
  );

/**
 * Normalize section weights so they sum exactly to pageTarget.
 * AI can't do math — we fix it deterministically.
 */
export function normalizeOutlineWeights(
  sections: Array<{ weight: number; [key: string]: unknown }>,
  pageTarget: number
): void {
  const currentSum = sections.reduce((sum, s) => sum + s.weight, 0);
  if (currentSum === 0 || currentSum === pageTarget) return;

  // Work in "quarters" (integers) to avoid floating point drift
  // 0.25 = 1 quarter, 0.5 = 2 quarters, 1.0 = 4 quarters
  const targetQuarters = pageTarget * 4;
  const ratio = pageTarget / currentSum;

  // Scale each weight, min 1 quarter (0.25)
  const quarters = sections.map(s => Math.max(1, Math.round(s.weight * ratio * 4)));

  // Fix total to match target — adjust largest sections first
  let total = quarters.reduce((a, b) => a + b, 0);
  const indices = quarters
    .map((q, i) => ({ q, i }))
    .sort((a, b) => b.q - a.q)
    .map(x => x.i);

  let idx = 0;
  while (total !== targetQuarters && idx < indices.length * 2) {
    const i = indices[idx % indices.length];
    if (total > targetQuarters && quarters[i] > 1) {
      quarters[i]--;
      total--;
    } else if (total < targetQuarters) {
      quarters[i]++;
      total++;
    }
    idx++;
  }

  // Write back as decimals
  for (let i = 0; i < sections.length; i++) {
    sections[i].weight = quarters[i] / 4;
  }
}

// ============================================
// KV Storage (report state)
// ============================================

export const ReportStateSchema = z.object({
  reportId: z.string().min(1),
  version: z.number().int().min(1),
  pageTarget: z.number().min(1).max(30),
  report: ReportSchema,
  editHistory: z.array(
    z.object({
      version: z.number().int().min(1),
      action: z.string().min(1),
      timestamp: z.string().min(1),
    })
  ),
});

// ============================================
// Chart Config Validation
// ============================================

export interface ChartValidationResult {
  valid: boolean;
  error?: string;
}

/** Validates Chart.js config before FE render — catches AI mistakes */
export function validateChartConfig(config: z.infer<typeof ChartSectionSchema>['chartConfig']): ChartValidationResult {
  // 1. datasets must not be empty
  if (!config.data.datasets.length) {
    return { valid: false, error: 'Empty datasets' };
  }

  // 2. labels/data length match (for chart types that require it)
  const labelCount = config.data.labels?.length ?? 0;
  const requiresLabelMatch = ['bar', 'line', 'radar', 'polarArea'].includes(config.type);

  if (requiresLabelMatch && labelCount > 0) {
    for (const ds of config.data.datasets) {
      if (ds.data.length !== labelCount) {
        return {
          valid: false,
          error: `Label count (${labelCount}) !== data count (${ds.data.length}) in dataset "${ds.label}"`,
        };
      }
    }
  }

  // 3. pie/doughnut: single dataset expected
  if (['pie', 'doughnut'].includes(config.type) && config.data.datasets.length > 1) {
    return { valid: false, error: `${config.type} chart should have 1 dataset, got ${config.data.datasets.length}` };
  }

  return { valid: true };
}

// ============================================
// Inferred Types
// ============================================

export type ReportSection = z.infer<typeof ReportSectionSchema>;
export type CoverSection = z.infer<typeof CoverSectionSchema>;
export type ExecutiveSummarySection = z.infer<typeof ExecutiveSummarySectionSchema>;
export type KpiDashboardSection = z.infer<typeof KpiDashboardSectionSchema>;
export type ChartSection = z.infer<typeof ChartSectionSchema>;
export type TableSection = z.infer<typeof TableSectionSchema>;
export type ContentSection = z.infer<typeof ContentSectionSchema>;
export type RecommendationsSection = z.infer<typeof RecommendationsSectionSchema>;
export type TimelineSection = z.infer<typeof TimelineSectionSchema>;
export type ComparisonSection = z.infer<typeof ComparisonSectionSchema>;
export type ReportMeta = z.infer<typeof ReportMetaSchema>;
export type ReportBranding = z.infer<typeof ReportBrandingSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
export type ReportOutline = z.infer<typeof ReportOutlineSchema>;
export type OutlineSection = z.infer<typeof OutlineSectionSchema>;
export type ReportState = z.infer<typeof ReportStateSchema>;
