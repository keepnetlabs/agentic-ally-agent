/**
 * Phishing simulation generation and assignment handlers
 * Isolated phishing-specific logic for autonomous service
 */

import { phishingEmailAgent } from '../../agents/phishing-email-agent';
import { AGENT_CALL_TIMEOUT_MS, AUTONOMOUS_DEFAULTS, PHISHING } from '../../constants';
import { phishingWorkflowExecutorTool } from '../../tools/orchestration';
import { assignPhishingTool, uploadPhishingTool } from '../../tools/user-management';
import { withTimeout, withRetry } from '../../utils/core/resilience-utils';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../error-service';
import { normalizeDifficultyValue } from '../../utils/difficulty-level-mapper';
import { isSafeId } from '../../utils/core/id-utils';
import { validateBCP47LanguageCode, DEFAULT_LANGUAGE } from '../../utils/language/language-utils';
import {
  buildPhishingGenerationPrompt,
  buildPhishingGenerationPromptSimplified,
  buildUploadPrompt,
  buildUploadAndAssignPrompt,
  buildAssignPhishingWithTrainingPrompt,
} from '../../utils/prompt-builders/autonomous-prompts';

interface PhishingSimulationRecommendation {
  title?: string;
  difficulty?: string;
  vector?: string;
  persuasion_tactic?: string;
  scenario_type?: string;
  [key: string]: any;
}

interface AutonomousToolResult {
  userInfo?: {
    targetUserResourceId?: string;
    department?: string;
    preferredLanguage?: string;
  };
}

function resolveAttackMethod(scenarioType?: string): (typeof PHISHING.ATTACK_METHODS)[number] | undefined {
  if (!scenarioType) return undefined;
  const normalized = scenarioType.toUpperCase();
  if (normalized.includes('CLICK')) return 'Click-Only';
  if (normalized.includes('DATA') || normalized.includes('SUBMISSION')) return 'Data-Submission';
  return undefined;
}

async function executePhishingToolFirst(params: {
  simulation: PhishingSimulationRecommendation;
  executiveReport?: string;
  toolResult: AutonomousToolResult;
  language: string;
  uploadOnly: boolean;
  targetUserResourceId?: string;
  targetGroupResourceId?: string | number;
}): Promise<any> {
  const logger = getLogger('ExecutePhishingToolFirst');
  const { simulation, executiveReport, toolResult, language, uploadOnly, targetUserResourceId, targetGroupResourceId } =
    params;

  try {
    const topic = simulation.title || AUTONOMOUS_DEFAULTS.PHISHING_TOPIC;
    const additionalContextParts = [
      simulation.rationale ? `Rationale: ${simulation.rationale}` : undefined,
      simulation.persuasion_tactic ? `Persuasion tactic: ${simulation.persuasion_tactic}` : undefined,
      simulation.scenario_type ? `Scenario type: ${simulation.scenario_type}` : undefined,
      executiveReport ? `Executive report:\n${executiveReport}` : undefined,
    ].filter(Boolean);

    const normalizedDifficulty = normalizeDifficultyValue(simulation.difficulty) || PHISHING.DEFAULT_DIFFICULTY;

    const resolvedMethod = resolveAttackMethod(simulation.scenario_type);

    const toolGeneration = await phishingWorkflowExecutorTool.execute({
      context: {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic,
        difficulty: normalizedDifficulty,
        language,
        method: resolvedMethod,
        includeEmail: true,
        includeLandingPage: true,
        additionalContext: additionalContextParts.length > 0 ? additionalContextParts.join('\n') : undefined,
        targetProfile: {
          department: toolResult.userInfo?.department,
        },
      },
    } as any);

    if (!toolGeneration?.success || !toolGeneration.data?.phishingId || !isSafeId(toolGeneration.data.phishingId)) {
      return {
        success: false,
        error: toolGeneration?.error || 'Phishing tool generation failed',
        toolGeneration,
      };
    }

    const uploadResult = await uploadPhishingTool.execute({
      context: {
        phishingId: toolGeneration.data.phishingId,
      },
    } as any);

    if (!uploadResult?.success || !uploadResult.data?.resourceId) {
      return {
        success: false,
        error: uploadResult?.error || 'Phishing upload failed',
        uploadResult,
      };
    }

    if (uploadOnly) {
      return {
        success: true,
        message: 'Phishing simulation generated and uploaded (tool-first)',
        toolGeneration,
        uploadResult,
      };
    }

    if (!targetUserResourceId && !targetGroupResourceId) {
      return {
        success: false,
        error: 'Missing target user or group for phishing assignment',
      };
    }

    const assignmentContext = targetUserResourceId
      ? { targetUserResourceId }
      : { targetGroupResourceId: String(targetGroupResourceId) };

    const assignResult = await assignPhishingTool.execute({
      context: {
        resourceId: uploadResult.data.resourceId,
        languageId: uploadResult.data.languageId,
        isQuishing: uploadResult.data.isQuishing,
        ...assignmentContext,
      },
    } as any);

    if (!assignResult?.success) {
      return {
        success: false,
        error: assignResult?.error || 'Phishing assign failed',
        uploadResult,
        assignResult,
      };
    }

    return {
      success: true,
      message: 'Phishing simulation generated, uploaded and assigned (tool-first)',
      toolGeneration,
      uploadResult,
      uploadAssignResult: assignResult,
    };
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, { step: 'tool-first-phishing', stack: err.stack });
    logErrorInfo(logger, 'warn', 'Tool-first phishing flow failed', errorInfo);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Generate phishing simulation using agent - FOR USER ASSIGNMENTS ONLY
 * Implements 3-level fallback pattern per Cursor Rules
 *
 * @param simulation - Simulation metadata (title, difficulty, etc.)
 * @param executiveReport - Executive report from user analysis
 * @param toolResult - User info/tool result
 * @param phishingThreadId - Thread ID for agent memory
 * @param uploadOnly - Whether to upload without assigning
 */
export async function generatePhishingSimulation(
  simulation: PhishingSimulationRecommendation,
  executiveReport: string | undefined,
  toolResult: AutonomousToolResult,
  phishingThreadId: string,
  uploadOnly: boolean = false
): Promise<any> {
  const logger = getLogger('GeneratePhishingSimulation');
  logger.info('🎯 USER: Generating phishing simulation with executive report');

  // Use user's preferredLanguage if available, otherwise fall back to default
  const preferredLanguageRaw = toolResult.userInfo?.preferredLanguage || '';
  const language = preferredLanguageRaw ? validateBCP47LanguageCode(preferredLanguageRaw) : DEFAULT_LANGUAGE;

  // TOOL-FIRST: Try direct tool calls before agent generation
  const toolFirstResult = await executePhishingToolFirst({
    simulation,
    executiveReport,
    toolResult,
    language,
    uploadOnly,
    targetUserResourceId: toolResult.userInfo?.targetUserResourceId,
  });
  if (toolFirstResult?.success) {
    return {
      success: true,
      message: toolFirstResult.message,
      agentResponse: toolFirstResult.toolGeneration?.message,
      uploadResult: toolFirstResult.uploadResult,
      uploadAssignResult: toolFirstResult.uploadAssignResult,
    };
  }
  if (toolFirstResult?.error) {
    logger.warn('Tool-first phishing failed, falling back to agent', { error: toolFirstResult.error });
  }

  // First, add context to agent's memory
  if (executiveReport) {
    try {
      logger.debug('Adding executive report to phishingEmailAgent memory');
      await withTimeout(
        phishingEmailAgent.generate(`[CONTEXT FROM ORCHESTRATOR: ${executiveReport}]`, {
          memory: {
            thread: phishingThreadId,
            resource: 'agentic-ally-autonomous',
          },
        }),
        AGENT_CALL_TIMEOUT_MS
      );
      logger.debug('Executive report added to agent memory');
    } catch (memoryError) {
      const err = normalizeError(memoryError);
      logger.warn('Failed to add context to agent memory', { error: err.message });
      // Continue anyway - agent can work without full context
    }
  }

  // Build prompt from standard generation (USER assignment)
  const fullPrompt = buildPhishingGenerationPrompt({
    simulation,
    toolResult,
    language,
  });

  const simplifiedPrompt = buildPhishingGenerationPromptSimplified({
    simulation,
    toolResult,
    language,
  });

  const memoryConfig = {
    memory: {
      thread: phishingThreadId,
      resource: 'agentic-ally-autonomous',
    },
  };

  // LEVEL 1: Primary path - Full context with timeout + retry
  try {
    logger.debug('Calling phishingEmailAgent (Level 1: Primary with full context)');
    const agentResult = await withRetry(
      () => withTimeout(phishingEmailAgent.generate(fullPrompt, memoryConfig), AGENT_CALL_TIMEOUT_MS),
      'Phishing agent generation (Level 1)'
    );

    logger.info('Phishing agent executed successfully');

    // CRITICAL: Send STOP message after phishing generation to prevent agent from continuing
    // This prevents agent from processing any remaining prompts in memory
    try {
      logger.info('Sending STOP message after phishing generation to prevent further processing');
      await withTimeout(
        phishingEmailAgent.generate(
          '**GENERATION COMPLETE - WAIT FOR UPLOAD INSTRUCTIONS**\n\nPhishing generation has been completed. Do NOT generate again. Do NOT call phishingExecutor again. Wait for upload/assign instructions. STOP.',
          {
            memory: {
              thread: phishingThreadId,
              resource: 'agentic-ally-autonomous',
            },
          }
        ),
        5000
      );
      logger.info('STOP message sent after phishing generation');
    } catch (stopError) {
      logger.warn('STOP message after generation failed (non-critical)', {
        error: stopError instanceof Error ? stopError.message : String(stopError),
      });
    }

    // Step 4: Upload (and optionally assign)
    if (uploadOnly) {
      const uploadResult = await uploadPhishingOnly(phishingThreadId);
      return {
        success: true,
        message: 'Phishing simulation generated and uploaded',
        agentResponse: agentResult.text,
        uploadResult,
      };
    } else {
      // Extract phishingId from agent response for upload/assign
      const phishingIdMatch = agentResult.text?.match(/"phishingId":\s*"([^"]+)"/);
      const generatedPhishingId = phishingIdMatch?.[1];

      const uploadAssignResult = await uploadAndAssignPhishing(
        toolResult.userInfo?.targetUserResourceId,
        phishingThreadId,
        generatedPhishingId
      );
      return {
        success: true,
        message:
          'Phishing simulation generated' +
          (uploadAssignResult?.success ? ', uploaded and assigned' : ' (upload/assign failed)'),
        agentResponse: agentResult.text,
        uploadAssignResult,
      };
    }
  } catch (primaryError) {
    const err = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
    logger.warn('Primary failed, attempting fallback 1', { error: err.message });

    // LEVEL 2: Fallback - Simplified prompt without full context
    try {
      logger.debug('Attempting fallback 1: Simplified prompt');
      const agentResult = await withTimeout(
        phishingEmailAgent.generate(simplifiedPrompt, memoryConfig),
        AGENT_CALL_TIMEOUT_MS
      );

      logger.info('Fallback 1 succeeded');
      if (uploadOnly) {
        const uploadResult = await uploadPhishingOnly(phishingThreadId);
        return {
          success: true,
          message: 'Phishing simulation generated via agent (simplified) and uploaded',
          agentResponse: agentResult.text,
          uploadResult,
        };
      } else {
        // Extract phishingId from agent response for upload/assign
        const phishingIdMatch = agentResult.text?.match(/"phishingId":\s*"([^"]+)"/);
        const generatedPhishingId = phishingIdMatch?.[1];

        const uploadAssignResult = await uploadAndAssignPhishing(
          toolResult.userInfo?.targetUserResourceId,
          phishingThreadId,
          generatedPhishingId
        );
        return {
          success: true,
          message:
            'Phishing simulation generated via agent (simplified)' +
            (uploadAssignResult?.success ? ', uploaded and assigned' : ' (upload/assign failed)'),
          agentResponse: agentResult.text,
          uploadAssignResult,
        };
      }
    } catch (fallback1Error) {
      const err2 = normalizeError(fallback1Error);
      logger.warn('Fallback 1 failed, using basic', { error: err2.message });

      // LEVEL 3: Guaranteed fallback - Return structured error with recommendations
      return {
        success: false,
        error: 'Agent generation failed after all fallbacks',
        message: 'Phishing simulation generation unavailable. Recommended parameters:',
        recommendedParams: {
          topic: simulation.title || 'Security Update',
          difficulty: simulation.difficulty || 'Medium',
          department: toolResult.userInfo?.department || 'All',
          vector: simulation.vector || 'EMAIL',
          persuasionTactic: simulation.persuasion_tactic || 'Authority',
        },
      };
    }
  }
}

/**
 * Upload only phishing simulation (no assignment)
 */
async function uploadPhishingOnly(threadId: string): Promise<any> {
  const logger = getLogger('UploadPhishingOnly');
  try {
    logger.info('Requesting agent to upload phishing simulation (upload only)');
    // Use goal-based prompt (more agentic)
    const uploadPrompt = buildUploadPrompt('phishing');

    const uploadResponse = await withTimeout(
      phishingEmailAgent.generate(uploadPrompt, {
        memory: {
          thread: threadId,
          resource: 'agentic-ally-autonomous',
        },
      }),
      AGENT_CALL_TIMEOUT_MS
    );

    logger.info('Upload agent executed');
    logger.debug('Upload response preview', { preview: uploadResponse.text?.substring(0, 500) || 'No response' });

    // CRITICAL: Send explicit STOP message IMMEDIATELY to prevent agent from processing any other prompts
    // This is especially important for GPT-4o-mini and similar models that may continue processing
    try {
      logger.info('Sending explicit STOP message to phishing agent (upload only) to prevent further processing');
      await withTimeout(
        phishingEmailAgent.generate(
          '**TASK COMPLETE - STOP IMMEDIATELY**\n\nThe upload operation has been completed successfully. Do NOT process any other prompts or tasks. Do NOT call any tools. Your work is finished. STOP.',
          {
            memory: {
              thread: threadId,
              resource: 'agentic-ally-autonomous',
            },
          }
        ),
        5000 // Short timeout for STOP message
      );
      logger.info('STOP message sent successfully to phishing agent (upload only)');
    } catch (stopError) {
      // Non-critical - log but don't fail
      logger.warn('STOP message failed (non-critical)', {
        error: stopError instanceof Error ? stopError.message : String(stopError),
      });
    }

    return {
      success: true,
      agentResponse: uploadResponse.text,
    };
  } catch (uploadError) {
    const err = uploadError instanceof Error ? uploadError : new Error(String(uploadError));
    logger.error('Upload agent error', { error: err.message, stack: err.stack });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Upload and assign phishing simulation to USER (extracted for clarity)
 * @param targetUserResourceId - User resource ID
 * @param threadId - Agent thread ID
 * @param generatedPhishingId - The phishing ID that was generated (optional, for clarity)
 */
export async function uploadAndAssignPhishing(
  targetUserResourceId: string | undefined,
  threadId: string,
  generatedPhishingId?: string
): Promise<any> {
  const logger = getLogger('UploadAndAssignPhishing');
  if (!targetUserResourceId) {
    logger.warn('Cannot assign: Missing targetUserResourceId');
    return {
      success: false,
      error: 'Missing targetUserResourceId',
    };
  }

  try {
    logger.info('Requesting agent to upload and assign phishing simulation (USER)', {
      userId: targetUserResourceId,
      phishingId: generatedPhishingId,
    });
    // Use goal-based prompt (more agentic) with explicit phishing ID
    const uploadAssignPrompt = buildUploadAndAssignPrompt('phishing', targetUserResourceId, generatedPhishingId);

    const uploadAssignResponse = await withTimeout(
      phishingEmailAgent.generate(uploadAssignPrompt, {
        memory: {
          thread: threadId,
          resource: 'agentic-ally-autonomous',
        },
      }),
      AGENT_CALL_TIMEOUT_MS
    );

    logger.info('✅ Upload and assign agent executed (USER)');
    logger.debug('Upload/Assign response preview', {
      preview: uploadAssignResponse.text?.substring(0, 500) || 'No response',
    });

    // CRITICAL: Send explicit STOP message IMMEDIATELY to prevent agent from processing any other prompts
    // This is especially important for GPT-4o-mini and similar models that may continue processing
    // Send STOP message BEFORE returning to ensure agent stops processing
    try {
      logger.info('Sending explicit STOP message to phishing agent to prevent further processing');
      const stopResponse = await withTimeout(
        phishingEmailAgent.generate(
          '**🔴 TASK 100% COMPLETE - MANDATORY STOP 🔴**\n\n**THE UPLOAD AND ASSIGN OPERATION HAS BEEN COMPLETED SUCCESSFULLY.**\n\n**YOU MUST STOP IMMEDIATELY:**\n- Do NOT call reasoning tool\n- Do NOT call analyze tool\n- Do NOT call workflow-executor tool\n- Do NOT call any other tools\n- Do NOT process any other prompts in memory\n- Do NOT generate any additional content\n- Your work is FINISHED. END NOW.',
          {
            memory: {
              thread: threadId,
              resource: 'agentic-ally-autonomous',
            },
          }
        ),
        5000 // Short timeout for STOP message
      );
      logger.info('STOP message sent successfully to phishing agent', {
        responseLength: stopResponse.text?.length || 0,
      });
    } catch (stopError) {
      // Non-critical - log but don't fail
      logger.warn('STOP message failed (non-critical)', {
        error: stopError instanceof Error ? stopError.message : String(stopError),
      });
    }

    return {
      success: true,
      agentResponse: uploadAssignResponse.text,
    };
  } catch (uploadAssignError) {
    const err = normalizeError(uploadAssignError);
    logger.error('Upload/Assign agent error (USER)', { error: err.message, stack: err.stack });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Upload and assign phishing simulation to GROUP (extracted for clarity)
 * @param targetGroupResourceId - Group resource ID
 * @param threadId - Agent thread ID
 * @param generatedPhishingId - The phishing ID that was generated (optional, for clarity)
 */
export async function uploadAndAssignPhishingForGroup(
  targetGroupResourceId: string | number | undefined,
  threadId: string,
  generatedPhishingId?: string
): Promise<any> {
  const logger = getLogger('UploadAndAssignPhishingForGroup');
  if (!targetGroupResourceId) {
    logger.warn('Cannot assign: Missing targetGroupResourceId');
    return {
      success: false,
      error: 'Missing targetGroupResourceId',
    };
  }

  try {
    logger.info('Requesting agent to upload and assign phishing simulation (GROUP)', {
      groupId: targetGroupResourceId,
      phishingId: generatedPhishingId,
    });
    // Use goal-based prompt (more agentic) - adapted for group with explicit phishing ID
    const uploadAssignPrompt = buildUploadAndAssignPrompt(
      'phishing',
      targetGroupResourceId as string,
      generatedPhishingId
    );

    const uploadAssignResponse = await withTimeout(
      phishingEmailAgent.generate(uploadAssignPrompt, {
        memory: {
          thread: threadId,
          resource: 'agentic-ally-autonomous',
        },
      }),
      AGENT_CALL_TIMEOUT_MS
    );

    logger.info('✅ Upload and assign agent executed (GROUP)');
    logger.debug('Upload/Assign response preview', {
      preview: uploadAssignResponse.text?.substring(0, 500) || 'No response',
    });

    // CRITICAL: Send explicit STOP message to prevent agent from processing any other prompts
    try {
      logger.debug('Sending explicit STOP message to phishing agent (GROUP)');
      await withTimeout(
        phishingEmailAgent.generate(
          '**TASK COMPLETE - STOP IMMEDIATELY**\n\nThe upload and assign operation has been completed successfully. Do NOT process any other prompts or tasks. Do NOT call any tools. Your work is finished. STOP.',
          {
            memory: {
              thread: threadId,
              resource: 'agentic-ally-autonomous',
            },
          }
        ),
        5000 // Short timeout for STOP message
      );
      logger.debug('STOP message sent successfully to phishing agent (GROUP)');
    } catch (stopError) {
      // Non-critical - log but don't fail
      logger.warn('STOP message failed (non-critical)', {
        error: stopError instanceof Error ? stopError.message : String(stopError),
      });
    }

    return {
      success: true,
      agentResponse: uploadAssignResponse.text,
    };
  } catch (uploadAssignError) {
    const err = normalizeError(uploadAssignError);
    logger.error('Upload/Assign agent error (GROUP)', { error: err.message, stack: err.stack });
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Generate phishing simulation using agent - FOR GROUP ASSIGNMENTS ONLY
 * Uses custom topic-based prompt from group-topic-service
 *
 * @param simulation - Simulation metadata (title, difficulty, etc.)
 * @param customPrompt - Custom topic-based prompt from group-topic-service
 * @param preferredLanguage - Preferred language
 * @param phishingThreadId - Thread ID for agent memory
 * @param targetGroupResourceId - Group resource ID (for upload/assign)
 */
export async function generatePhishingSimulationForGroup(
  simulation: PhishingSimulationRecommendation,
  customPrompt: string,
  preferredLanguage: string | undefined,
  phishingThreadId: string,
  targetGroupResourceId: string | number
): Promise<any> {
  const logger = getLogger('GeneratePhishingSimulationForGroup');
  logger.info('🎯 GROUP: Generating phishing simulation with custom topic-based prompt', {
    groupId: targetGroupResourceId,
  });

  const language = preferredLanguage ? validateBCP47LanguageCode(preferredLanguage) : DEFAULT_LANGUAGE;

  const toolFirstResult = await executePhishingToolFirst({
    simulation,
    executiveReport: customPrompt,
    toolResult: { userInfo: { department: undefined } },
    language,
    uploadOnly: false,
    targetGroupResourceId,
  });
  if (toolFirstResult?.success) {
    return {
      success: true,
      message: toolFirstResult.message,
      agentResponse: toolFirstResult.toolGeneration?.message,
      uploadResult: toolFirstResult.uploadResult,
      uploadAssignResult: toolFirstResult.uploadAssignResult,
    };
  }
  if (toolFirstResult?.error) {
    logger.warn('Tool-first phishing (group) failed, falling back to agent', { error: toolFirstResult.error });
  }

  const memoryConfig = {
    memory: {
      thread: phishingThreadId,
      resource: 'agentic-ally-autonomous',
    },
  };

  // LEVEL 1: Primary path - Use custom prompt directly
  try {
    logger.debug('Calling phishingEmailAgent (Level 1: Custom topic-based prompt)');
    const agentResult = await withRetry(
      () => withTimeout(phishingEmailAgent.generate(customPrompt, memoryConfig), AGENT_CALL_TIMEOUT_MS),
      'Phishing agent generation (Level 1)'
    );

    logger.info('✅ Phishing agent executed successfully (GROUP)');

    // CRITICAL: Send STOP message after phishing generation (GROUP) to prevent agent from continuing
    try {
      logger.info('Sending STOP message after phishing generation (GROUP) to prevent further processing');
      await withTimeout(
        phishingEmailAgent.generate(
          '**GENERATION COMPLETE - WAIT FOR UPLOAD INSTRUCTIONS**\n\nPhishing generation has been completed. Do NOT generate again. Do NOT call phishingExecutor again. Wait for upload/assign instructions. STOP.',
          {
            memory: {
              thread: phishingThreadId,
              resource: 'agentic-ally-autonomous',
            },
          }
        ),
        5000
      );
      logger.info('STOP message sent after phishing generation (GROUP)');
    } catch (stopError) {
      logger.warn('STOP message after generation failed (non-critical)', {
        error: stopError instanceof Error ? stopError.message : String(stopError),
      });
    }

    // Extract phishingId from agent response for upload/assign
    const phishingIdMatch = agentResult.text?.match(/"phishingId":\s*"([^"]+)"/);
    const generatedPhishingId = phishingIdMatch?.[1];

    // Upload and assign to group
    const uploadAssignResult = await uploadAndAssignPhishingForGroup(
      targetGroupResourceId,
      phishingThreadId,
      generatedPhishingId
    );

    return {
      success: uploadAssignResult?.success || true,
      message: uploadAssignResult?.success
        ? 'Phishing simulation generated, uploaded and assigned to group'
        : 'Phishing simulation generated (assign may have failed)',
      agentResponse: agentResult.text,
      uploadAssignResult,
    };
  } catch (primaryError) {
    const err = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
    logger.warn('Primary failed, attempting fallback', { error: err.message });

    // LEVEL 2/3: Fallback - use simplified approach
    try {
      logger.debug('Attempting fallback: Simplified prompt');
      const agentResult = await withTimeout(
        phishingEmailAgent.generate(customPrompt, memoryConfig),
        AGENT_CALL_TIMEOUT_MS
      );

      logger.info('✅ Fallback succeeded (GROUP)');

      // Extract phishingId from agent response for upload/assign
      const phishingIdMatch = agentResult.text?.match(/"phishingId":\s*"([^"]+)"/);
      const generatedPhishingId = phishingIdMatch?.[1];

      const uploadAssignResult = await uploadAndAssignPhishingForGroup(
        targetGroupResourceId,
        phishingThreadId,
        generatedPhishingId
      );

      return {
        success: uploadAssignResult?.success || true,
        message: uploadAssignResult?.success
          ? 'Phishing simulation generated, uploaded and assigned to group (fallback)'
          : 'Phishing simulation generated (fallback, assign may have failed)',
        agentResponse: agentResult.text,
        uploadAssignResult,
      };
    } catch (fallbackError) {
      const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
      logger.error('All phishing generation attempts failed (GROUP)', { error: fallbackErr.message });
      return {
        success: false,
        error: fallbackErr.message,
      };
    }
  }
}

/**
 * Assign phishing simulation with training IDs (for sendAfterPhishingSimulation flow)
 */
export async function assignPhishingWithTraining(
  targetUserResourceId: string | undefined,
  phishingThreadId: string,
  trainingId?: string,
  sendTrainingLanguageId?: string,
  phishingResourceId?: string,
  phishingLanguageId?: string,
  isQuishing?: boolean
): Promise<any> {
  const logger = getLogger('AssignPhishingWithTraining');
  if (!targetUserResourceId) {
    logger.warn('Cannot assign: Missing targetUserResourceId');
    return {
      success: false,
      error: 'Missing targetUserResourceId',
    };
  }

  if (phishingResourceId) {
    try {
      logger.info('Assigning phishing with training via tool-first path', {
        targetUserResourceId,
        phishingResourceId,
        trainingId,
        sendTrainingLanguageId,
      });

      const assignResult = await assignPhishingTool.execute({
        context: {
          resourceId: phishingResourceId,
          languageId: phishingLanguageId,
          isQuishing,
          targetUserResourceId,
          trainingId,
          sendTrainingLanguageId,
        },
      } as any);

      if (!assignResult?.success) {
        logger.warn('Tool-first assign phishing with training failed, falling back to agent', {
          error: assignResult?.error || 'Assign phishing with training failed',
        });
      }

      if (assignResult?.success) {
        return {
          success: true,
          agentResponse: assignResult.message,
        };
      }
    } catch (toolError) {
      const err = normalizeError(toolError);
      logger.warn('Tool-first assign phishing with training failed, falling back to agent', { error: err.message });
    }
  }

  try {
    logger.info('Requesting agent to assign phishing simulation with training IDs', {
      targetUserResourceId,
      trainingId,
      sendTrainingLanguageId,
      hasTrainingInfo: !!trainingId,
    });

    // First, add training context to agent memory
    if (trainingId) {
      try {
        const trainingContext = `[TRAINING CONTEXT: Training Resource ID: ${trainingId}, Language ID: ${sendTrainingLanguageId || 'default'}]`;
        logger.debug('Adding training context to agent memory', { trainingId, sendTrainingLanguageId });
        await withTimeout(
          phishingEmailAgent.generate(trainingContext, {
            memory: {
              thread: phishingThreadId,
              resource: 'agentic-ally-autonomous',
            },
          }),
          AGENT_CALL_TIMEOUT_MS
        );
        logger.debug('Training context added to agent memory');
      } catch (memoryError) {
        const err = normalizeError(memoryError);
        logger.warn('Failed to add training context to agent memory', { error: err.message });
        // Continue anyway - agent can work without full context
      }
    }

    // Use goal-based prompt (more agentic) with training IDs
    const assignPrompt = buildAssignPhishingWithTrainingPrompt(
      targetUserResourceId,
      trainingId,
      sendTrainingLanguageId
    );

    const assignResponse = await withTimeout(
      phishingEmailAgent.generate(assignPrompt, {
        memory: {
          thread: phishingThreadId,
          resource: 'agentic-ally-autonomous',
        },
      }),
      AGENT_CALL_TIMEOUT_MS
    );

    logger.info('Assign with training agent executed');
    logger.debug('Assign response preview', { preview: assignResponse.text?.substring(0, 500) || 'No response' });

    // CRITICAL: Send explicit STOP message IMMEDIATELY to prevent agent from processing any other prompts
    // This is especially important for GPT-4o-mini and similar models that may continue processing
    try {
      logger.info(
        'Sending explicit STOP message to phishing agent (assign with training) to prevent further processing'
      );
      await withTimeout(
        phishingEmailAgent.generate(
          '**🔴 TASK 100% COMPLETE - MANDATORY STOP 🔴**\n\n**THE ASSIGNMENT OPERATION HAS BEEN COMPLETED SUCCESSFULLY.**\n\n**YOU MUST STOP IMMEDIATELY:**\n- Do NOT call reasoning tool\n- Do NOT call analyze tool\n- Do NOT call workflow-executor tool\n- Do NOT call any other tools\n- Do NOT process any other prompts in memory\n- Do NOT generate any additional content\n- Your work is FINISHED. END NOW.',
          {
            memory: {
              thread: phishingThreadId,
              resource: 'agentic-ally-autonomous',
            },
          }
        ),
        5000 // Short timeout for STOP message
      );
      logger.info('STOP message sent successfully to phishing agent (assign with training)');
    } catch (stopError) {
      // Non-critical - log but don't fail
      logger.warn('STOP message failed (non-critical)', {
        error: stopError instanceof Error ? stopError.message : String(stopError),
      });
    }

    return {
      success: true,
      agentResponse: assignResponse.text,
    };
  } catch (assignError) {
    const err = assignError instanceof Error ? assignError : new Error(String(assignError));
    logger.error('Assign with training agent error', { error: err.message, stack: err.stack });
    return {
      success: false,
      error: err.message,
    };
  }
}
