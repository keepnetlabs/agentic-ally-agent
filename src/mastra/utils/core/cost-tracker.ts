/**
 * Minimal Cost Tracking - No over-engineering
 *
 * Purpose: Track LLM costs in console logs for Cloudflare Analytics
 * Strategy: Simple, structured logging - let Cloudflare aggregate
 */

import { getLogger } from './logger';

const logger = getLogger('CostTracker');

// Pricing (USD per 1M tokens)
const PRICING = {
  // OpenAI Models
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-5-nano': { input: 0.05, output: 0.40 },
  'gpt-5-mini': { input: 0.25, output: 2.00 },

  // Cloudflare Workers AI
  '@cf/openai/gpt-oss-120b': { input: 0.01, output: 0.03 },

  // Google Gemini Models
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-2.5-flash': { input: 0.10, output: 0.40 },
  'gemini-3-pro': { input: 1.25, output: 10.00 },
} as const;

interface Usage {
  // AI SDK v5 format (camelCase)
  promptTokens?: number;
  completionTokens?: number;
  // Legacy format support
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;  // Optional: OpenAI prompt caching support
}

/**
 * Normalize model ID to match PRICING keys
 * Handles versioned model names (e.g., "gpt-4o-2024-10-01" -> "gpt-4o")
 */
function normalizeModelId(modelId: string): string {
  // Remove version suffixes (e.g., "-2024-10-01")
  const withoutVersion = modelId.replace(/-\d{4}-\d{2}-\d{2}$/, '');

  // Check if exact match exists
  if (PRICING[withoutVersion as keyof typeof PRICING]) {
    return withoutVersion;
  }

  // Check for prefix matches (e.g., "gpt-4o" in "gpt-4o-mini-2024-10-01")
  for (const key in PRICING) {
    if (modelId.startsWith(key) || withoutVersion.startsWith(key)) {
      return key;
    }
  }

  // Return original if no match found
  return modelId;
}

/**
 * Calculate and log LLM cost
 *
 * Usage:
 * ```typescript
 * const response = await generateText({...});
 * if (response.usage) {
 *   trackCost('generate-scene1', 'gpt-oss-120b', response.usage);
 * }
 * ```
 */
export function trackCost(
  operation: string,
  model: string,
  usage: Usage
): void {
  // Normalize model ID (handle versioned model names like "gpt-4o-2024-10-01" -> "gpt-4o")
  const normalizedModel = normalizeModelId(model);

  // Find pricing (fallback to Workers AI default)
  const pricing = PRICING[normalizedModel as keyof typeof PRICING] || PRICING['@cf/openai/gpt-oss-120b'];

  // Warn if using fallback pricing for unknown model
  if (!PRICING[normalizedModel as keyof typeof PRICING] && normalizedModel !== '@cf/openai/gpt-oss-120b') {
    logger.warn('Unknown model, using fallback pricing', {
      originalModel: model,
      normalizedModel
    });
  }

  // Calculate cost (cache hits are 50% cheaper for OpenAI)
  // Support both AI SDK v5 (promptTokens/completionTokens) and legacy (inputTokens/outputTokens)
  const promptTokens = usage.promptTokens ?? usage.inputTokens ?? 0;
  const completionTokens = usage.completionTokens ?? usage.outputTokens ?? 0;
  const cachedTokens = usage.cachedTokens || 0;
  const uncachedPromptTokens = promptTokens - cachedTokens;

  const inputCost = (uncachedPromptTokens / 1_000_000) * pricing.input;
  const cachedCost = (cachedTokens / 1_000_000) * (pricing.input * 0.5); // 50% discount
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  const totalCost = inputCost + cachedCost + outputCost;

  // Structured log (Cloudflare Analytics will aggregate)
  logger.info('LLM cost tracking', {
    type: 'llm_cost',
    operation,
    model,
    tokens: {
      input: promptTokens,
      output: completionTokens,
      cached: cachedTokens,
      uncached: uncachedPromptTokens,
      total: promptTokens + completionTokens
    },
    cost: {
      input: parseFloat(inputCost.toFixed(6)),
      cached: parseFloat(cachedCost.toFixed(6)),
      output: parseFloat(outputCost.toFixed(6)),
      total: parseFloat(totalCost.toFixed(6))
    },
    timestamp: new Date().toISOString()
  });
}
