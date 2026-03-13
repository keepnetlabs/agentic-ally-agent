import { z } from 'zod';

/**
 * Stream event types for real-time updates.
 * Uses data- prefix for toAISdkStream compatibility (Mastra v1).
 */
export type StreamEvent =
  | { type: 'data-reasoning'; data: { event: 'start' | 'delta' | 'end'; id: string; text?: string } }
  | { type: 'data-ui-signal'; data: { signal: string; message: string } }
  | { type: 'data-tool-progress'; data: Record<string, unknown> }
  | { type: 'data-workflow-step'; data: Record<string, unknown> };

/**
 * Stream writer interface for real-time reasoning and text updates
 */
export interface StreamWriter {
  write(event: StreamEvent): Promise<void>;
}

/**
 * Zod schema for StreamWriter validation
 */
export const StreamWriterSchema = z
  .object({
    write: z
      .function()
      .args(
        z.union([
          z.object({
            type: z.literal('data-reasoning'),
            data: z.object({
              event: z.enum(['start', 'delta', 'end']),
              id: z.string(),
              text: z.string().optional(),
            }),
          }),
          z.object({
            type: z.literal('data-ui-signal'),
            data: z.object({ signal: z.string(), message: z.string() }),
          }),
          z.object({ type: z.literal('data-tool-progress'), data: z.record(z.unknown()) }),
          z.object({ type: z.literal('data-workflow-step'), data: z.record(z.unknown()) }),
        ])
      )
      .returns(z.promise(z.void())),
  })
  .describe('Stream writer for reasoning updates');
