import { z } from 'zod';

export const phishingEditorSchema = z.object({
  phishingId: z.string().describe('ID of the existing phishing template to edit'),
  editInstruction: z
    .string()
    .describe(
      'Natural language instruction for editing (e.g. "Add urgency to all text", "Remove logo", "Translate to German")'
    ),
  mode: z
    .enum(['edit', 'translate'])
    .optional()
    .default('edit')
    .describe(
      'Operation mode: "translate" locks layout/CSS and only updates text/labels/placeholders; "edit" allows full content + design edits'
    ),
  hasBrandUpdate: z
    .boolean()
    .optional()
    .default(false)
    .describe('True if the instruction implies changing the brand, logo, or visual identity'),
  language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code)'),
  modelProvider: z.string().optional().describe('Override model provider'),
  model: z.string().optional().describe('Override model name'),
});

// Response validation schemas
export const emailResponseSchema = z.object({
  subject: z.string().min(1, 'Subject must not be empty'),
  template: z.string().min(20, 'Template must contain valid HTML'),
  summary: z.string().min(5, 'Summary must be at least 5 characters'),
});

export const landingPageResponseSchema = z.object({
  type: z.enum(['login', 'success', 'info']).describe('Landing page type'),
  template: z.string().min(50, 'Template must contain complete HTML'),
  edited: z.boolean().describe('Whether page was edited'),
  summary: z.string().min(5, 'Summary must be at least 5 characters'),
});

// Input landing page schema for type inference
export type LandingPageInput = {
  type: 'login' | 'success' | 'info';
  template: string;
  edited?: boolean;
  summary?: string;
};
