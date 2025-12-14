import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { getLogger } from '../../utils/core/logger';

/**
 * Reasoning Tool - Allows agent to show its thinking process
 * Agent calls this tool to emit reasoning events to the frontend
 */
export const reasoningTool = new Tool({
  id: 'show_reasoning',
  description: 'Show your thinking process to the user. Call this before making any important decision or analysis.',
  inputSchema: z.object({
    thought: z.string().describe('Your reasoning, analysis, or thinking process (1-2 sentences)')
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  execute: async (context: any) => {
    const logger = getLogger('ReasoningTool');
    // Mastra wraps input in context.context
    const toolInput = context?.context || context?.inputData || context?.input || context;
    const thought = toolInput?.thought || '';

    logger.info('Reasoning tool called', { thought: thought.substring(0, 100), hasWriter: !!context?.writer });

    try {
      if (!thought) {
        logger.warn('Reasoning tool called without thought');
        return { success: false };
      }

      // Get writer from context (Mastra stream writer)
      const writer = context?.writer;

      if (writer) {
        const id = crypto.randomUUID();

        // Emit reasoning events using AI SDK protocol
        await writer.write({
          type: 'reasoning-start',
          id
        });

        await writer.write({
          type: 'reasoning-delta',
          id,
          delta: thought
        });

        await writer.write({
          type: 'reasoning-end',
          id
        });

        logger.info('Reasoning emitted', { thought: thought.substring(0, 100) + (thought.length > 100 ? '...' : '') });
      } else {
        logger.debug('Reasoning (no writer)', { thought });
      }

      return {
        success: true
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Reasoning tool error', { error: err.message, stack: err.stack });
      return {
        success: false
      };
    }
  }
});
