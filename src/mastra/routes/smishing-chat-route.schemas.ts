import { z } from 'zod';

export const smishingChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().trim().min(1),
});

export const smishingChatRequestSchema = z.object({
  microlearningId: z.string(),
  language: z.string(),
  messages: z.preprocess(
    (value) => (Array.isArray(value) ? value : undefined),
    z.array(smishingChatMessageSchema).optional()
  ),
  modelProvider: z.string().optional(),
  model: z.string().optional(),
});

export const parsedSmishingChatResponseSchema = z.object({
  reply: z.string().trim().min(1),
  isFinished: z.boolean().optional(),
});

