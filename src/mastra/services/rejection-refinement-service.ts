/**
 * Rejection Refinement Service
 *
 * When a user rejects a previously generated activity and provides a reason,
 * this service:
 *   1. Fetches the original content metadata from D1 (via rejectedScenarioResourceId)
 *   2. Calls an LLM to understand what went wrong and produce per-action instructions
 *   3. Returns { phishingInstruction?, trainingInstruction?, smishingInstruction? }
 *      which are injected as high-priority `rejectionFeedback` into the generation tools.
 *
 * If D1 lookup fails or LLM call fails → returns null (normal flow continues unaffected).
 */

import { trackedGenerateText } from '../utils/core/tracked-generate';
import { getLogger } from '../utils/core/logger';
import { normalizeError } from '../utils/core/error-utils';
import { getRefinementModel } from '../model-providers';
import { getCampaignMetadata } from './campaign-metadata-service';
import type { CloudflareEnv } from '../types/api-types';
import type { AutonomousAction } from '../types/autonomous-types';

const logger = getLogger('RejectionRefinementService');

export interface RefinementContext {
  phishingInstruction?: string;
  trainingInstruction?: string;
  smishingInstruction?: string;
}

interface LLMRefinementOutput {
  phishingInstruction?: string | null;
  trainingInstruction?: string | null;
  smishingInstruction?: string | null;
}

/**
 * Builds per-action refinement instructions from rejection feedback.
 * Returns null if inputs are invalid or any step fails — caller proceeds with normal flow.
 */
export async function buildRefinementContext(params: {
  rejectedScenarioResourceId: string;
  rejectingReason: string;
  actions: AutonomousAction[];
  userDepartment?: string;
  env: CloudflareEnv | undefined;
}): Promise<RefinementContext | null> {
  const { rejectedScenarioResourceId, rejectingReason, actions, userDepartment, env } = params;

  if (!rejectedScenarioResourceId || !rejectingReason.trim()) {
    logger.debug('Rejection refinement skipped: missing required params');
    return null;
  }

  try {
    // 1. Fetch original content metadata from D1
    const metadataMap = await getCampaignMetadata(env as Record<string, unknown>, [rejectedScenarioResourceId]);
    const originalMeta = metadataMap.get(rejectedScenarioResourceId);

    if (!originalMeta) {
      logger.warn('Rejection refinement: no D1 metadata found, skipping LLM call', {
        rejectedScenarioResourceId,
      });
      return null;
    }

    const contentType = originalMeta.content_type ?? 'unknown';
    const originalSummary = buildOriginalContentSummary(originalMeta);

    // 2. Build LLM prompt
    const prompt = buildRefinementPrompt({
      contentType,
      originalSummary,
      rejectingReason,
      actions,
      userDepartment,
    });

    logger.debug('Calling LLM for rejection refinement', {
      rejectedScenarioResourceId,
      contentType,
      rejectingReason,
    });

    // 3. Call LLM
    const { text } = await trackedGenerateText('rejection-refinement', {
      model: getRefinementModel(),
      system:
        'You are a cybersecurity training expert. Respond ONLY with valid JSON. No markdown, no explanation.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    // 4. Parse JSON response
    const parsed = parseRefinementOutput(text);
    if (!parsed) {
      logger.warn('Rejection refinement: LLM returned unparseable output', { text });
      return null;
    }

    const result: RefinementContext = {
      ...(parsed.phishingInstruction ? { phishingInstruction: parsed.phishingInstruction } : {}),
      ...(parsed.trainingInstruction ? { trainingInstruction: parsed.trainingInstruction } : {}),
      ...(parsed.smishingInstruction ? { smishingInstruction: parsed.smishingInstruction } : {}),
    };

    logger.info('Rejection refinement context built', {
      rejectedScenarioResourceId,
      hasPhishing: !!result.phishingInstruction,
      hasTraining: !!result.trainingInstruction,
      hasSmishing: !!result.smishingInstruction,
    });

    return result;
  } catch (error) {
    const err = normalizeError(error);
    logger.warn('Rejection refinement failed (non-blocking), continuing with normal flow', {
      rejectedScenarioResourceId,
      error: err.message,
    });
    return null;
  }
}

function buildOriginalContentSummary(meta: {
  content_type: string | null;
  scenario: string | null;
  tactic: string | null;
  difficulty: string | null;
  scenario_type: string | null;
  reasoning: string | null;
}): string {
  const parts: string[] = [];
  if (meta.content_type) parts.push(`Type: ${meta.content_type}`);
  if (meta.scenario) parts.push(`Title/Topic: "${meta.scenario}"`);
  if (meta.tactic) parts.push(`Tactic: ${meta.tactic}`);
  if (meta.difficulty) parts.push(`Difficulty: ${meta.difficulty}`);
  if (meta.scenario_type) parts.push(`Scenario type: ${meta.scenario_type}`);
  if (meta.reasoning) parts.push(`AI reasoning: "${meta.reasoning}"`);
  return parts.join('\n');
}

function buildRefinementPrompt(params: {
  contentType: string;
  originalSummary: string;
  rejectingReason: string;
  actions: string[];
  userDepartment?: string;
}): string {
  const { contentType, originalSummary, rejectingReason, actions, userDepartment } = params;

  const userContext = userDepartment
    ? `\n--- USER PROFILE ---\nDepartment: ${userDepartment}`
    : '';

  // Only generate instructions for explicitly requested actions (vishing has no content to refine)
  const needsPhishing = actions.includes('phishing');
  const needsTraining = actions.includes('training');
  const needsSmishing = actions.includes('smishing');

  const schemaFields: string[] = [];
  if (needsPhishing) schemaFields.push(`  "phishingInstruction": "string"`);
  if (needsTraining) schemaFields.push(`  "trainingInstruction": "string"`);
  if (needsSmishing) schemaFields.push(`  "smishingInstruction": "string"`);

  return `A previously generated security awareness activity was rejected.

--- ORIGINAL CONTENT ---
${originalSummary}
${userContext}
--- REJECTION REASON ---
"${rejectingReason}"

--- TASK ---
Provide specific regeneration instructions for each requested content type below.
Each instruction: 1-2 sentences, actionable, directly addressing the rejection reason.
Original content type for context: ${contentType}.

Respond with ONLY valid JSON containing exactly these fields:
{
${schemaFields.join(',\n')}
}`;
}

function parseRefinementOutput(text: string): LLMRefinementOutput | null {
  try {
    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as LLMRefinementOutput;
    // Validate it has at least one of the expected fields
    if (
      'phishingInstruction' in parsed ||
      'trainingInstruction' in parsed ||
      'smishingInstruction' in parsed
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
