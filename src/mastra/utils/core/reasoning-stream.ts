import { v4 as uuidv4 } from 'uuid';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { getLogger } from './logger';

const logger = getLogger('ReasoningStream');

/**
 * Stream reasoning to frontend using AI SDK reasoning protocol
 * Converts technical AI reasoning to user-friendly progress updates
 * https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#reasoning
 *
 * Protocol:
 * - reasoning-start: Begin reasoning block
 * - reasoning-delta: Stream reasoning content
 * - reasoning-end: Complete reasoning block
 */
export async function streamReasoning(
  reasoningText: string,
  writer: any
): Promise<void> {
  if (!reasoningText || !writer) return;

  const messageId = uuidv4();

  try {
    // Start reasoning block immediately (don't wait for conversion)
    await writer.write({
      type: 'reasoning-start',
      id: messageId
    });

    // Convert technical reasoning to user-friendly summary in background
    // Fire-and-forget (Silent Mode): Don't await, just let it try.
    // If the stream closes before it finishes, we silently ignore the error.
    const model = getModelWithOverride('WORKERS_AI');

    generateText({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that converts technical AI reasoning into user-friendly progress updates. Extract ONLY the AI\'s thinking process and decision-making steps. Explain what the AI is THINKING and considering in simple, clear language. Use phrases like "I\'m thinking about...", "I\'m considering...", "I\'m analyzing...", "I\'m deciding..." to show the AI is actively thinking (e.g., "I\'m thinking about your request for phishing awareness training...", "I\'m considering the IT Department as the target audience...", "I\'m analyzing the best approach for Email Security category..."). IGNORE any JSON structures, code blocks, or technical field names. Focus ONLY on the AI\'s thought process and decisions. NO technical jargon, NO JSON field mentions, NO internal processing details. Just friendly, natural explanations that make sense to end users. Keep it concise and brief.'
        },
        {
          role: 'user',
          content: `Extract the AI's thinking process from this reasoning (ignore JSON and code):\n\n${reasoningText}`
        }
      ],
      temperature: 0.3,
    }).then(async (summaryResponse) => {
      const userFriendlyReasoning = summaryResponse.text;

      try {
        // Send user-friendly reasoning content
        await writer.write({
          type: 'reasoning-delta',
          id: messageId,
          delta: userFriendlyReasoning
        });

        // End reasoning block
        await writer.write({
          type: 'reasoning-end',
          id: messageId
        });

        logger.info('User-friendly reasoning streamed');
      } catch (writeError) {
        // Stream likely closed, ignore silently
      }
    }).catch(() => {
      // Silent catch for generation errors or stream errors
      try {
        writer.write({
          type: 'reasoning-end',
          id: messageId
        }).catch(() => { });
      } catch (e) { }
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to start reasoning stream', {
      error: err.message,
      stack: err.stack
    });
  }
}

/**
 * Stream multiple reasoning updates (for multi-step processes)
 */
export async function streamReasoningUpdates(
  reasoningTexts: string[],
  writer: any
): Promise<void> {
  for (const text of reasoningTexts) {
    await streamReasoning(text, writer);
  }
}

/**
 * Stream reasoning directly to frontend without LLM processing
 * Used when the reasoning is already user-friendly or speed is critical
 */
export async function streamDirectReasoning(
  reasoning: string,
  writer: any
): Promise<void> {
  if (!reasoning || !writer) return;
  const messageId = uuidv4();
  try {
    await writer.write({ type: 'reasoning-start', id: messageId });
    await writer.write({ type: 'reasoning-delta', id: messageId, delta: reasoning });
    await writer.write({ type: 'reasoning-end', id: messageId });
  } catch (e) {
    // Ignore write errors silently (e.g. if stream closed)
  }
}
