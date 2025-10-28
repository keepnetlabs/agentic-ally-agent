import { z } from 'zod';

export const CreateInboxStructureSchema = z.object({
  department: z.string(),
  languageCode: z.string(),
  microlearningId: z.string(),
  microlearning: z.any(), // MicrolearningContent
  languageContent: z.any(), // LanguageContent
  remote: z.any(),
});

export const CreateInboxStructureOutputSchema = z.object({
  success: z.boolean(),
  data: z.any(), // Inbox content (texts + emails)
  metadata: z.object({
    department: z.string(),
    languageCode: z.string(),
    microlearningId: z.string(),
    inboxPath: z.string(),
    itemsGenerated: z.number(),
    estimatedDuration: z.string(),
  }).optional(),
  error: z.string().optional(),
});

export type CreateInboxStructureInput = z.infer<typeof CreateInboxStructureSchema>;
export type CreateInboxStructureOutput = z.infer<typeof CreateInboxStructureOutputSchema>;