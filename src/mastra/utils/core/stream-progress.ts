/**
 * Stream Progress Utilities
 *
 * Helper functions for emitting tool progress and workflow step events
 * to the frontend via the stream writer. These provide real-time visibility
 * into agent tool execution and workflow progress.
 *
 * Usage:
 *   const progress = createWorkflowProgress(writer, 'create-microlearning', 4);
 *   await progress.step(0, 'Analyzing prompt');
 *   // ... do work ...
 *   await progress.complete(0, 'Prompt analyzed');
 *   await progress.step(1, 'Generating scenes');
 *   // ... do work ...
 *   await progress.complete(1, '8 scenes generated');
 */

import type { StreamWriter, ToolProgressData, WorkflowStepData } from '../../types/stream-writer';
import { getLogger } from './logger';

const logger = getLogger('StreamProgress');

// ─── Tool Progress ──────────────────────────────────────────────

/**
 * Emit a tool progress event to the stream.
 * Safe to call even if writer is undefined (no-op).
 */
export async function emitToolProgress(
  writer: StreamWriter | undefined,
  data: ToolProgressData
): Promise<void> {
  if (!writer) return;
  try {
    await writer.write({ type: 'data-tool-progress', data });
  } catch (err) {
    logger.warn('Failed to emit tool progress', { toolName: data.toolName, error: String(err) });
  }
}

// ─── Workflow Step Progress ─────────────────────────────────────

/**
 * Emit a workflow step event to the stream.
 * Safe to call even if writer is undefined (no-op).
 */
export async function emitWorkflowStep(
  writer: StreamWriter | undefined,
  data: WorkflowStepData
): Promise<void> {
  if (!writer) return;
  try {
    await writer.write({ type: 'data-workflow-step', data });
  } catch (err) {
    logger.warn('Failed to emit workflow step', { stepName: data.stepName, error: String(err) });
  }
}

// ─── Workflow Progress Helper ───────────────────────────────────

/**
 * Creates a scoped workflow progress tracker.
 * Provides a clean API for emitting step-by-step progress.
 *
 * @example
 * const progress = createWorkflowProgress(writer, 'create-microlearning', 4);
 * await progress.step(0, 'Analyzing prompt', 'Detecting language and intent...');
 * // ... do work ...
 * await progress.complete(0, 'Prompt analyzed — English, intermediate level');
 * await progress.step(1, 'Generating scenes', 'Creating 8 scenes in parallel...');
 */
export function createWorkflowProgress(
  writer: StreamWriter | undefined,
  workflowName: string,
  totalSteps: number
) {
  const workflowRunId = crypto.randomUUID();
  // Cache step names so complete() can preserve them
  const stepNames = new Map<number, string>();

  return {
    workflowRunId,

    /** Mark a step as running */
    async step(stepIndex: number, stepName: string, message?: string) {
      stepNames.set(stepIndex, stepName);
      await emitWorkflowStep(writer, {
        workflowRunId,
        workflowName,
        stepIndex,
        totalSteps,
        stepName,
        status: 'running',
        message,
      });
    },

    /** Mark a step as completed (preserves step name from initial step() call) */
    async complete(stepIndex: number, message?: string) {
      await emitWorkflowStep(writer, {
        workflowRunId,
        workflowName,
        stepIndex,
        totalSteps,
        stepName: stepNames.get(stepIndex) || '',
        status: 'completed',
        message,
      });
    },

    /** Mark a step as errored (uses cached step name, like complete()) */
    async error(stepIndex: number, message?: string) {
      await emitWorkflowStep(writer, {
        workflowRunId,
        workflowName,
        stepIndex,
        totalSteps,
        stepName: stepNames.get(stepIndex) || '',
        status: 'error',
        message,
      });
    },
  };
}
