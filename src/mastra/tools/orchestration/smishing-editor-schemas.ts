import { z } from 'zod';
import { landingPageResponseSchema } from './phishing-editor-schemas';

export const smishingEditorSchema = z.object({
  smishingId: z.string().describe('ID of the existing smishing template to edit'),
  editInstruction: z.string().describe('Natural language instruction for editing (e.g. "Make it shorter", "Translate to German")'),
  mode: z.enum(['edit', 'translate']).optional().default('edit').describe('Operation mode: "translate" locks layout/CSS and only updates text/labels/placeholders; "edit" allows full content + design edits'),
  hasBrandUpdate: z.boolean().optional().default(false).describe('True if the instruction implies changing the brand, logo, or visual identity'),
  language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code)'),
  modelProvider: z.string().optional().describe('Override model provider'),
  model: z.string().optional().describe('Override model name'),
});

export const smsResponseSchema = z.object({
  messages: z.array(z.string().min(1)).min(1, 'At least one SMS message is required'),
  summary: z.string().min(5, 'Summary must be at least 5 characters'),
});

export { landingPageResponseSchema };
