import { z } from 'zod';

/**
 * Stream event types for real-time updates.
 * Uses data- prefix for toAISdkStream compatibility (Mastra v1).
 *
 * Event types:
 * - data-reasoning: Agent thinking process (start/delta/end lifecycle)
 * - data-ui-signal: UI signals for content display (phishing email, training URL, etc.)
 * - data-tool-progress: Tool execution progress (started → running → completed/error)
 * - data-workflow-step: Workflow step-by-step progress tracker
 */

// ─── Tool Progress ───────────────────────────────────────────────
export type ToolProgressStatus = 'started' | 'running' | 'completed' | 'error';

export interface ToolProgressData {
  /** Unique ID for this tool call (use crypto.randomUUID()) */
  toolCallId: string;
  /** Tool identifier (e.g. "get-user-info", "workflow-executor") */
  toolName: string;
  /** Current execution status */
  status: ToolProgressStatus;
  /** Human-readable progress message */
  message?: string;
  /** Elapsed time in ms (set on completed/error) */
  durationMs?: number;
  /** Brief result summary (set on completed) */
  resultSummary?: string;
}

// ─── Workflow Step ───────────────────────────────────────────────
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface WorkflowStepData {
  /** Unique ID for this workflow run */
  workflowRunId: string;
  /** Workflow name (e.g. "create-microlearning", "create-phishing") */
  workflowName: string;
  /** Current step index (0-based) */
  stepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Step name (e.g. "Analyzing prompt", "Generating scenes") */
  stepName: string;
  /** Current step status */
  status: WorkflowStepStatus;
  /** Human-readable status message */
  message?: string;
}

export type StreamEvent =
  | { type: 'data-reasoning'; data: { event: 'start' | 'delta' | 'end'; id: string; text?: string } }
  | { type: 'data-ui-signal'; data: { signal: string; message: string } }
  | { type: 'data-tool-progress'; data: ToolProgressData }
  | { type: 'data-workflow-step'; data: WorkflowStepData };

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
          z.object({
            type: z.literal('data-tool-progress'),
            data: z.object({
              toolCallId: z.string(),
              toolName: z.string(),
              status: z.enum(['started', 'running', 'completed', 'error']),
              message: z.string().optional(),
              durationMs: z.number().optional(),
              resultSummary: z.string().optional(),
            }),
          }),
          z.object({
            type: z.literal('data-workflow-step'),
            data: z.object({
              workflowRunId: z.string(),
              workflowName: z.string(),
              stepIndex: z.number(),
              totalSteps: z.number(),
              stepName: z.string(),
              status: z.enum(['pending', 'running', 'completed', 'error']),
              message: z.string().optional(),
            }),
          }),
        ])
      )
      .returns(z.promise(z.void())),
  })
  .describe('Stream writer for reasoning updates');
