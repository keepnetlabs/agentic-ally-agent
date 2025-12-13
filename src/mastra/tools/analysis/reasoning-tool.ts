import { Tool } from '@mastra/core/tools';
import { z } from 'zod';

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
    // Mastra wraps input in context.context
    const toolInput = context?.context || context?.inputData || context?.input || context;
    const thought = toolInput?.thought || '';

    console.log('🧠 Reasoning tool called with:', { thought, hasWriter: !!context?.writer });

    try {
      if (!thought) {
        console.warn('⚠️ Reasoning tool called without thought');
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

        console.log('✅ Reasoning emitted:', thought.substring(0, 100) + (thought.length > 100 ? '...' : ''));
      } else {
        console.log('📝 Reasoning (no writer):', thought);
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('❌ Reasoning tool error:', error);
      return {
        success: false
      };
    }
  }
});
