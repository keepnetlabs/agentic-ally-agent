import { z } from 'zod';

export const vishingPromptRequestSchema = z.object({
  microlearningId: z.string().trim().min(1).max(2048),
  language: z.string().trim().min(2).max(35),
});
