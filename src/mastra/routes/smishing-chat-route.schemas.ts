import { z } from 'zod';

export const smishingChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().trim().min(1).max(2000),
});

export const smishingChatRequestSchema = z.object({
  microlearningId: z.string().trim().min(1).max(2048),
  language: z.string().trim().min(2).max(35),
  messages: z.preprocess(
    value => (Array.isArray(value) ? value : undefined),
    z.array(smishingChatMessageSchema).max(30).optional()
  ),
  modelProvider: z.string().trim().min(1).max(64).optional(),
  model: z.string().trim().min(1).max(128).optional(),
});

export const parsedSmishingChatResponseSchema = z.object({
  reply: z.string().trim().min(1),
  isFinished: z.boolean().optional(),
});
