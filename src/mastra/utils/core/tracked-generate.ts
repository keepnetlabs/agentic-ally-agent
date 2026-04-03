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
import { requestStorage } from './request-storage';

const logger = getLogger('TrackedGenerate');

/** Extract modelId from AI SDK model instance (works across providers) */
function resolveModelId(model: unknown): string {
  if (model && typeof model === 'object' && 'modelId' in model) {
    return String((model as { modelId: string }).modelId);
  }
  return 'unknown';
}

/**
 * Extract `sub` (user resource ID) from a JWT token without crypto.
 * JWT = header.payload.signature — payload is base64url-encoded JSON.
 * Returns undefined if token is malformed or missing `sub`.
 */
function extractSubFromJwt(token: string): string | undefined {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    // base64url → base64 → decode
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const payload = JSON.parse(json);
    return typeof payload.sub === 'string' && payload.sub.length > 0
      ? payload.sub
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Derive a stable, per-operator end-user identifier from request context.
 * Extracts the opaque `sub` field from the JWT token (e.g. "ptaCdRKjZE2a")
 * — no crypto needed, no PII sent to OpenAI.
 * Falls back to companyId for autonomous/cron jobs where no operator token exists.
 */
export function resolveOpenAIEndUserId(): string | undefined {
  return resolveEndUserId();
}

function resolveEndUserId(): string | undefined {
  const store = requestStorage.getStore();
  const token = store?.token;

  // Primary: extract `sub` from JWT (per-operator granularity)
  if (token) {
    const sub = extractSubFromJwt(token);
    if (sub) return `op-${sub}`;
  }

  // Fallback: companyId for autonomous/cron jobs (no operator token)
  const companyId = store?.companyId;
  if (companyId) return `auto-${companyId}`;

  return undefined;
}

/**
 * Wrapper around AI SDK's generateText that automatically tracks cost
 * and injects OpenAI end-user identification for abuse prevention.
 *
 * @param operation - Short label for this LLM call (e.g., 'header-analysis', 'report-outline')
 * @param params - Same parameters as generateText from 'ai'
 * @returns Same result as generateText — preserves full type inference
 */
export async function trackedGenerateText(
  operation: string,
  params: Parameters<typeof generateText>[0]
): ReturnType<typeof generateText> {
  // Inject OpenAI end-user ID from request context for abuse tracking.
  // This tells OpenAI which company triggered the request so they can
  // isolate violations per-company rather than flagging the whole API key.
  const endUserId = resolveEndUserId();
  if (endUserId) {
    params = {
      ...params,
      providerOptions: {
        ...params.providerOptions,
        openai: {
          ...(params.providerOptions?.openai as Record<string, unknown> | undefined),
          user: endUserId,
        },
      },
    };
  }

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
