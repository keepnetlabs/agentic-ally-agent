import { z } from 'zod';

/** Timeline phase labels for vishing simulation (matches UI screenshot) */
export const VISHING_TIMELINE_LABELS = [
  'Introduction',
  'Credibility Building',
  'Pressure',
  'Data Request',
  'Data Disclosed',
  'Simulation Reveal',
  'Other', // fallback for phases that do not fit the above
] as const;

export const VishingConversationsSummaryTimelineItemSchema = z.object({
  timestamp: z.string().describe('Timestamp in MM:SS format (e.g. "0:01", "0:38")'),
  label: z.enum(VISHING_TIMELINE_LABELS).describe('Phase of the vishing simulation'),
  snippet: z.string().describe('Brief excerpt of the dialogue at this point'),
});

export const VishingConversationsSummaryDisclosedItemSchema = z.object({
  item: z.string().describe('Description of the disclosed sensitive information'),
  timestamp: z.string().describe('When it was disclosed (MM:SS)'),
});

export const VishingConversationsSummarySchema = z.object({
  timeline: z
    .array(VishingConversationsSummaryTimelineItemSchema)
    .describe('Chronological simulation timeline with phases and dialogue snippets'),
  disclosedInfo: z
    .array(VishingConversationsSummaryDisclosedItemSchema)
    .describe('List of sensitive items disclosed (badge numbers, passwords, etc.)'),
  outcome: z
    .enum(['data_disclosed', 'refused', 'detected', 'not_answered', 'other'])
    .describe(
      'Overall outcome: data_disclosed=user shared info, refused=user refused, detected=user identified simulation, not_answered=recipient never picked up'
    ),
});

/** Status card for UI - renders the main alert (Data Disclosed / No Data Disclosed / etc.) */
export const VishingStatusCardSchema = z.object({
  variant: z.enum(['warning', 'success', 'info']).describe('UI variant: warning=red, success=green, info=neutral'),
  title: z.string().describe('Card title (e.g. "Data Disclosed", "No Data Disclosed")'),
  description: z.string().describe('Card description for the user'),
});

export const VishingNextStepCardSchema = z.object({
  title: z.string().describe('Card title (e.g. "Verifying Caller Identity")'),
  description: z.string().describe('Brief description of the weakness or recommendation'),
  prompt: z
    .string()
    .optional()
    .describe(
      'Context-rich prompt for microlearning creation. Includes vishing scenario details, specific weaknesses observed, and training focus areas. Used by frontend to pre-fill chat input when user clicks Create.'
    ),
});

export const VishingConversationsSummaryOutputSchema = z.object({
  summary: VishingConversationsSummarySchema,
  nextSteps: z
    .array(VishingNextStepCardSchema)
    .describe('Recommended training focus areas as cards with title and description'),
});

export type VishingConversationsSummaryOutput = z.infer<typeof VishingConversationsSummaryOutputSchema> & {
  statusCard: VishingStatusCard;
};

export type VishingConversationsSummary = z.infer<typeof VishingConversationsSummarySchema>;
export type VishingStatusCard = z.infer<typeof VishingStatusCardSchema>;
