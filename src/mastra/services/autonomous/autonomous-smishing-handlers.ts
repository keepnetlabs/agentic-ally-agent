/**
 * Smishing simulation generation and assignment handlers
 * Isolated smishing-specific logic for autonomous service
 */

import { AGENT_CALL_TIMEOUT_MS, SMISHING } from '../../constants';
import { smishingWorkflowExecutorTool } from '../../tools/orchestration';
import { assignSmishingTool, uploadSmishingTool } from '../../tools/user-management';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../error-service';
import { normalizeDifficultyValue } from '../../utils/difficulty-level-mapper';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../utils/language/language-utils';
import { isSafeId } from '../../utils/core/id-utils';
import { withRetry, withTimeout } from '../../utils/core/resilience-utils';

interface SmishingSimulationRecommendation {
  title?: string;
  difficulty?: string;
  scenario_type?: string;
  persuasion_tactic?: string;
  rationale?: string;
}

interface AutonomousToolResult {
  userInfo?: {
    targetUserResourceId?: string;
    department?: string;
    preferredLanguage?: string;
  };
}

/**
 * Derive contentCategory from simulation metadata for the Agentic AI Activities API.
 * Example output: "Smishing | Click-Only | Urgency | Medium"
 */
function buildContentCategory(simulation: SmishingSimulationRecommendation): string {
  const parts = [
    'Smishing',
    simulation.scenario_type,
    simulation.persuasion_tactic,
    simulation.difficulty,
  ].filter(Boolean);
  return parts.join(' | ');
}

function resolveSmishingMethod(scenarioType?: string): (typeof SMISHING.ATTACK_METHODS)[number] {
  if (!scenarioType) return SMISHING.DEFAULT_ATTACK_METHOD;
  const normalized = scenarioType.toUpperCase();
  if (normalized.includes('CLICK')) return 'Click-Only';
  if (normalized.includes('DATA') || normalized.includes('SUBMISSION')) return 'Data-Submission';
  return SMISHING.DEFAULT_ATTACK_METHOD;
}

export async function generateSmishingSimulation(params: {
  simulation: SmishingSimulationRecommendation;
  executiveReport?: string;
  toolResult: AutonomousToolResult;
  targetGroupResourceId?: string | number;
}): Promise<any> {
  const logger = getLogger('GenerateSmishingSimulation');
  const { simulation, executiveReport, toolResult, targetGroupResourceId } = params;

  const preferredLanguageRaw = toolResult.userInfo?.preferredLanguage || '';
  const language = preferredLanguageRaw ? validateBCP47LanguageCode(preferredLanguageRaw) : DEFAULT_LANGUAGE;
  const topic = simulation.title || 'Security Verification Alert';
  const difficulty = normalizeDifficultyValue(simulation.difficulty) || SMISHING.DEFAULT_DIFFICULTY;
  const method = resolveSmishingMethod(simulation.scenario_type);

  /* eslint-disable @typescript-eslint/no-non-null-assertion -- guarded at function entry */
  try {
    const additionalContextParts = [
      simulation.rationale ? `Rationale: ${simulation.rationale}` : undefined,
      simulation.persuasion_tactic ? `Persuasion tactic: ${simulation.persuasion_tactic}` : undefined,
      executiveReport ? `Executive report:\n${executiveReport}` : undefined,
    ].filter(Boolean);

    if (!smishingWorkflowExecutorTool.execute) throw new Error('Smishing workflow executor tool is not executable');
    if (!uploadSmishingTool.execute) throw new Error('Upload smishing tool is not executable');
    if (!assignSmishingTool.execute) throw new Error('Assign smishing tool is not executable');

    const generation: Record<string, any> = await withRetry(
      () =>
        withTimeout(
          smishingWorkflowExecutorTool.execute!({
            workflowType: SMISHING.WORKFLOW_TYPE,
            topic,
            difficulty,
            language,
            method,
            includeSms: true,
            includeLandingPage: true,
            additionalContext: additionalContextParts.length > 0 ? additionalContextParts.join('\n') : undefined,
            targetProfile: {
              department: toolResult.userInfo?.department,
            },
          }, {}),
          AGENT_CALL_TIMEOUT_MS
        ),
      'Autonomous smishing generation'
    );

    const smishingId = generation?.data?.smishingId;
    if (!generation?.success || !smishingId || !isSafeId(smishingId)) {
      return {
        success: false,
        error: generation?.error || 'Smishing generation failed',
        generation,
      };
    }

    const uploadResult: Record<string, any> = await withRetry(
      () =>
        withTimeout(
          uploadSmishingTool.execute!({ smishingId }, {}),
          AGENT_CALL_TIMEOUT_MS
        ),
      'Autonomous smishing upload'
    );

    const uploadedResourceId = uploadResult?.data?.resourceId;
    if (!uploadResult?.success || !uploadedResourceId) {
      return {
        success: false,
        error: uploadResult?.error || 'Smishing upload failed',
        generation,
        uploadResult,
      };
    }

    const targetUserResourceId = toolResult.userInfo?.targetUserResourceId;
    if (!targetUserResourceId && !targetGroupResourceId) {
      return {
        success: false,
        error: 'Missing target user or group for smishing assignment',
        generation,
        uploadResult,
      };
    }

    const assignmentContext = targetUserResourceId
      ? { targetUserResourceId }
      : { targetGroupResourceId: String(targetGroupResourceId) };

    const reasoningText = uploadResult?.data?.explanationReasoningText;

    const assignResult: Record<string, any> = await withRetry(
      () =>
        withTimeout(
          assignSmishingTool.execute!({
            resourceId: uploadedResourceId,
            languageId: uploadResult?.data?.languageId,
            contentCategory: buildContentCategory(simulation),
            ...(reasoningText && { explanationJson: { reasoningText } }),
            ...assignmentContext,
          }, {}),
          AGENT_CALL_TIMEOUT_MS
        ),
      'Autonomous smishing assign'
    );

    if (!assignResult?.success) {
      return {
        success: false,
        error: assignResult?.error || 'Smishing assign failed',
        generation,
        uploadResult,
        assignResult,
      };
    }

    return {
      success: true,
      message: 'Smishing simulation generated, uploaded and assigned',
      generation,
      uploadResult,
      uploadAssignResult: assignResult,
    };
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'smishing-autonomous-flow',
      stack: err.stack,
      topic,
      difficulty,
      method,
      language,
    });
    logErrorInfo(logger, 'error', 'Smishing autonomous flow failed', errorInfo);
    return {
      success: false,
      error: err.message,
    };
  }
  /* eslint-enable @typescript-eslint/no-non-null-assertion */
}
