import { z } from 'zod';

export const CreateInboxStructureSchema = z.object({
  department: z.string(),
  languageCode: z.string(),
  microlearningId: z.string(),
  microlearning: z.any(), // MicrolearningContent
  languageContent: z.any(), // LanguageContent
  remote: z.any(),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional().describe('Model provider'),
  model: z.string().optional().describe('Model name (e.g., OPENAI_GPT_4O_MINI, WORKERS_AI_GPT_OSS_120B)'),
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