import { z } from 'zod';

/**
 * Stream event types for real-time updates
 * v1: Uses data- prefix for toAISdkStream compatibility
 */
export type StreamEvent =
  // v1: data- prefix events (pass through toAISdkStream)
  | { type: 'data-reasoning'; data: { event: 'start' | 'delta' | 'end'; id: string; text?: string } }
  | { type: 'data-ui-signal'; data: { signal: string; message: string } }
  | { type: 'data-tool-progress'; data: Record<string, unknown> }
  | { type: 'data-workflow-step'; data: Record<string, unknown> }
  // Legacy events (kept for backwards compatibility)
  | { type: 'reasoning-start'; id: string }
  | { type: 'reasoning-delta'; id: string; delta: string }
  | { type: 'reasoning-end'; id: string }
  | { type: 'text-delta'; id: string; delta: string };

/**
 * Stream writer interface for real-time reasoning and text updates
 */
export interface StreamWriter {
  write(event: StreamEvent): Promise<void>;
}

/**
 * Zod schema for StreamWriter validation
 */
export const StreamWriterSchema = z.object({
  write: z.function()
    .args(
      z.union([
        // v1: data- prefix events
        z.object({ type: z.literal('data-reasoning'), data: z.object({ event: z.enum(['start', 'delta', 'end']), id: z.string(), text: z.string().optional() }) }),
        z.object({ type: z.literal('data-ui-signal'), data: z.object({ signal: z.string(), message: z.string() }) }),
        z.object({ type: z.literal('data-tool-progress'), data: z.record(z.unknown()) }),
        z.object({ type: z.literal('data-workflow-step'), data: z.record(z.unknown()) }),
        // Legacy events
        z.object({ type: z.literal('reasoning-start'), id: z.string() }),
        z.object({ type: z.literal('reasoning-delta'), id: z.string(), delta: z.string() }),
        z.object({ type: z.literal('reasoning-end'), id: z.string() }),
        z.object({ type: z.literal('text-delta'), id: z.string(), delta: z.string() }),
      ])
    )
    .returns(z.promise(z.void()))
}).describe('Stream writer for reasoning updates');
