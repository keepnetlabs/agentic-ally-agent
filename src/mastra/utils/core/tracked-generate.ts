/**
 * Tracked LLM Generation Wrapper
 *
 * Drop-in replacement for `generateText` from 'ai' that automatically
 * tracks token usage and cost via cost-tracker.
 *
 * Usage:
 * ```typescript
 * // Before:
 * import { generateText } from 'ai';
 * const result = await generateText({ model, messages });
 *
 * // After:
 * import { trackedGenerateText } from '../../utils/core/tracked-generate';
 * const result = await trackedGenerateText('header-analysis', { model, messages });
 * ```
 */

import { generateText } from 'ai';
import { trackCost } from './cost-tracker';
import { getLogger } from './logger';

const logger = getLogger('TrackedGenerate');

/** Extract modelId from AI SDK model instance (works across providers) */
function resolveModelId(model: unknown): string {
  if (model && typeof model === 'object' && 'modelId' in model) {
    return String((model as { modelId: string }).modelId);
  }
  return 'unknown';
}

/**
 * Wrapper around AI SDK's generateText that automatically tracks cost.
 *
 * @param operation - Short label for this LLM call (e.g., 'header-analysis', 'report-outline')
 * @param params - Same parameters as generateText from 'ai'
 * @returns Same result as generateText — preserves full type inference
 */
export async function trackedGenerateText(
  operation: string,
  params: Parameters<typeof generateText>[0]
): ReturnType<typeof generateText> {
  const result = await generateText(params);

  try {
    const modelId = resolveModelId(params.model);
    if (result.usage) {
      trackCost(operation, modelId, result.usage);
    }
  } catch (err) {
    // Fire-and-forget — tracking failure must never break the LLM call
    logger.debug('Cost tracking failed', { operation, error: (err as Error).message });
  }

  return result;
}

/**
 * Track cost for agent.generate() calls.
 * Call after result is received — fire-and-forget, never throws.
 *
 * @param operation - Short label (e.g., 'email-ir-triage')
 * @param result - The generate result (must have .usage)
 * @param model - AI SDK model instance (has .modelId)
 */
export function trackAgentCost(operation: string, result: { usage?: Record<string, unknown> }, model: unknown): void {
  try {
    const modelId = resolveModelId(model);
    if (result.usage) {
      trackCost(operation, modelId, result.usage);
    }
  } catch (err) {
    logger.debug('Agent cost tracking failed', { operation, error: (err as Error).message });
  }
}
