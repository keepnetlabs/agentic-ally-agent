import { z } from 'zod';

/**
 * Stream event types for real-time updates
 */
export type StreamEvent =
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
export const StreamWriterSchema = z
  .object({
    write: z
      .function()
      .args(
        z.union([
          z.object({ type: z.literal('reasoning-start'), id: z.string() }),
          z.object({ type: z.literal('reasoning-delta'), id: z.string(), delta: z.string() }),
          z.object({ type: z.literal('reasoning-end'), id: z.string() }),
          z.object({ type: z.literal('text-delta'), id: z.string(), delta: z.string() }),
        ])
      )
      .returns(z.promise(z.void())),
  })
  .describe('Stream writer for reasoning updates');
