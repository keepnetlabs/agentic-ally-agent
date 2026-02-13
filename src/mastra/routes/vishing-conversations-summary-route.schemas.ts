import { z } from 'zod';

export const vishingConversationsSummaryMessageSchema = z
  .object({
    role: z.enum(['agent', 'user']),
    text: z.string().trim().min(1).max(10000).optional(),
    message: z.string().trim().min(1).max(10000).optional(),
    timestamp: z.number().min(0).optional(),
  })
  .transform((v) => ({
    role: v.role,
    text: (v.text ?? v.message ?? '').trim() || '',
    timestamp: v.timestamp,
  }))
  .refine((v) => v.text.length > 0, { message: 'Each message must have text or message' });

const filterEmptyMessages = (val: unknown): unknown[] => {
  if (!Array.isArray(val)) return [];
  return val.filter((m) => {
    if (!m || typeof m !== 'object') return false;
    const t = (m as { text?: string; message?: string }).text ?? (m as { message?: string }).message ?? '';
    return typeof t === 'string' && t.trim().length > 0;
  });
};

export const vishingConversationsSummaryRequestSchema = z.object({
  accessToken: z.string().trim().min(32).max(4096),
  messages: z.preprocess(
    filterEmptyMessages,
    z.array(vishingConversationsSummaryMessageSchema).min(1).max(500)
  ),
});

export type VishingConversationsSummaryRequest = z.infer<
  typeof vishingConversationsSummaryRequestSchema
>;
