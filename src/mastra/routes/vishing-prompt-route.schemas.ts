import { z } from 'zod';

export const vishingPromptRequestSchema = z.object({
  microlearningId: z.string(),
  language: z.string(),
});

