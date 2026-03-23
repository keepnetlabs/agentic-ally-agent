/**
 * Explainability Types — EU AI Act Art. 13 Compliance
 *
 * Provides structured decision rationale for all AI-generated content.
 * Three-layer model (ICO guidance):
 *   Layer 1: System-level — "What is this AI system?" (in tool JSDoc metadata)
 *   Layer 2: Decision-level — "Why was this specific content generated?" (this type)
 *   Layer 3: Technical — Model, provider, version traceability (this type)
 *
 * @see docs/AI_COMPLIANCE_INVENTORY.md — Tool risk classification
 * @see docs/AI_COMPLIANCE_PROGRESS.md — PBI 44872
 */

/**
 * Core explainability object embedded in every content base JSON.
 * Designed to be consistent across phishing, smishing, and microlearning.
 */
export interface Explainability {
  // --- Layer 2: Decision-level (EU AI Act Art. 13) ---

  /** Primary reasoning: why was this scenario/content chosen? Undefined if model did not provide reasoning. */
  reasoning?: string;

  /** Why does this content fit the target audience/profile? Undefined if model did not provide reasoning. */
  targetAudienceReasoning?: string;

  /** Content strategy justification (subject line, SMS, learning approach). Undefined if model did not provide reasoning. */
  contentStrategy?: string;

  /** User-specific reasoning: why was this content chosen for THIS user based on their behavioral profile? Only populated when user behavior context was available during generation. */
  userContextReasoning?: string;

  /** Key factors that influenced the decision (triggers, objectives, risk areas) */
  keyFactors: string[];

  // --- Layer 3: Technical documentation (EU AI Act Art. 11) ---

  /** Model identifier used for generation (e.g. "gpt-oss-120b", "gpt-4o-mini") */
  modelId?: string;

  /** Model provider (e.g. "WORKERS_AI", "OPENAI", "GOOGLE") */
  modelProvider?: string;

  // --- Metadata ---

  /** ISO 8601 timestamp — when was this explanation generated */
  generatedAt: string;

  /** Schema version for backward compatibility (e.g. "1.0") */
  version: string;
}

/** Current explainability schema version */
export const EXPLAINABILITY_VERSION = '1.0';

/**
 * Build an Explainability object from analysis output.
 * Common factory used by phishing, smishing, and microlearning KV writes.
 *
 * @param params.reasoning - AI's primary reasoning about the scenario/content
 * @param params.targetAudienceReasoning - Why this fits the target audience
 * @param params.contentStrategy - Content approach justification
 * @param params.keyFactors - Key decision factors (triggers, objectives, etc.)
 * @param params.modelId - Model identifier (optional)
 * @param params.modelProvider - Model provider (optional)
 */
export function buildExplainability(params: {
  reasoning?: string;
  targetAudienceReasoning?: string;
  contentStrategy?: string;
  userContextReasoning?: string;
  keyFactors?: string[];
  modelId?: string;
  modelProvider?: string;
}): Explainability {
  return {
    // Only include reasoning fields when model actually provided them (avoids fake/placeholder strings in KV)
    ...(params.reasoning ? { reasoning: params.reasoning } : {}),
    ...(params.targetAudienceReasoning ? { targetAudienceReasoning: params.targetAudienceReasoning } : {}),
    ...(params.contentStrategy ? { contentStrategy: params.contentStrategy } : {}),
    ...(params.userContextReasoning ? { userContextReasoning: params.userContextReasoning } : {}),
    keyFactors: Array.isArray(params.keyFactors) ? params.keyFactors : [],
    ...(params.modelId ? { modelId: params.modelId } : {}),
    ...(params.modelProvider ? { modelProvider: params.modelProvider } : {}),
    generatedAt: new Date().toISOString(),
    version: EXPLAINABILITY_VERSION,
  };
}
