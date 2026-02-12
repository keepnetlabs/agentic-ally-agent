import { z } from 'zod';
import { EmailIRCanvasSchema } from '../schemas/email-ir';

export const emailIrAnalyzeSuccessResponseSchema = z.object({
  success: z.literal(true),
  report: EmailIRCanvasSchema,
  runId: z.string().min(1),
});

