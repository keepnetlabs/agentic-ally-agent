import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { z } from 'zod';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';

const logger = getLogger('ReasoningTool');

/**
 * Reasoning Tool - Allows agent to show its thinking process
 * Agent calls this tool to emit reasoning events to the frontend
 * 
 * v1 Migration: Updated to (inputData, context) signature
 */

export const reasoningTool = createTool({
  id: 'show_reasoning',
  description: 'Show your thinking process to the user. Call this before making any important decision or analysis.',
  inputSchema: z.object({
    thought: z.string()
      .max(2000, 'Reasoning must not exceed 2000 characters')
      .describe('Your reasoning, analysis, or thinking process (1-2 sentences)')
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  // v1: (inputData, context) signature
  execute: async (inputData: { thought?: string }, ctx?: ToolExecutionContext) => {
    // v1: inputData is the direct input from inputSchema
    const thought = inputData?.thought || '';

    logger.info('Reasoning tool called', { thought: thought.substring(0, 100), hasWriter: !!ctx?.writer });

    try {
      if (!thought) {
        const errorInfo = errorService.validation('Thought is required for reasoning tool');
        logErrorInfo(logger, 'warn', 'Reasoning tool called without thought', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      // v1: writer is now ctx.writer
      const writer = ctx?.writer;

      if (writer) {
        const id = crypto.randomUUID();

        // Emit reasoning events (v1: data- prefix for toAISdkStream compatibility)
        await writer.write({
          type: 'data-reasoning',
          data: { event: 'start', id }
        });

        await writer.write({
          type: 'data-reasoning',
          data: { event: 'delta', id, text: thought }
        });

        await writer.write({
          type: 'data-reasoning',
          data: { event: 'end', id }
        });

        logger.info('Reasoning emitted', { thought: thought.substring(0, 100) + (thought.length > 100 ? '...' : '') });
      } else {
        logger.debug('Reasoning (no writer)', { thought });
      }

      return {
        success: true
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.internal(err.message, {
        thought: thought?.substring(0, 100),
        step: 'reasoning-emission',
        stack: err.stack
      });
      logErrorInfo(logger, 'error', 'Reasoning tool error', errorInfo);
      return createToolErrorResponse(errorInfo);
    }
  }
});
