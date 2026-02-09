/**
 * Smishing simulation generation and assignment handlers
 * Isolated smishing-specific logic for autonomous service
 */

import { AGENT_CALL_TIMEOUT_MS, SMISHING } from '../../constants';
import { smishingWorkflowExecutorTool } from '../../tools/orchestration';
import { assignSmishingTool, uploadSmishingTool } from '../../tools/user-management';
import { getLogger } from '../../utils/core/logger';
import { normalizeError } from '../../utils/core/error-utils';
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

  try {
    const additionalContextParts = [
      simulation.rationale ? `Rationale: ${simulation.rationale}` : undefined,
      simulation.persuasion_tactic ? `Persuasion tactic: ${simulation.persuasion_tactic}` : undefined,
      executiveReport ? `Executive report:\n${executiveReport}` : undefined,
    ].filter(Boolean);

    const generation = await withRetry(
      () =>
        withTimeout(
          smishingWorkflowExecutorTool.execute({
            context: {
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
            },
          } as any),
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

    const uploadResult = await withRetry(
      () =>
        withTimeout(
          uploadSmishingTool.execute({
            context: {
              smishingId,
            },
          } as any),
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

    const assignResult = await withRetry(
      () =>
        withTimeout(
          assignSmishingTool.execute({
            context: {
              resourceId: uploadedResourceId,
              languageId: uploadResult?.data?.languageId,
              ...assignmentContext,
            },
          } as any),
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
    logger.error('Smishing autonomous flow failed', {
      error: err.message,
      topic,
      difficulty,
      method,
      language,
    });
    return {
      success: false,
      error: err.message,
    };
  }
}
