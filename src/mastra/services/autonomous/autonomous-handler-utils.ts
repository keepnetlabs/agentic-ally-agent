/**
 * Shared utilities for autonomous handlers
 *
 * Consolidates patterns duplicated across phishing/training/smishing/vishing handlers:
 *   - STOP message sending (was 10 copies)
 *   - Thread ID generation (was 4 copies)
 *   - Shared types (was 4 copies of AutonomousToolResult)
 */

import { withTimeout } from '../../utils/core/resilience-utils';
import type { Logger } from '../../utils/core/logger';

// ============================================
// Shared Types
// ============================================

/**
 * Minimal interface for an agent with `.generate()` — avoids importing concrete Agent class.
 * All Mastra agents satisfy this.
 */
interface GeneratableAgent {
  generate(prompt: string, options?: Record<string, unknown>): Promise<{ text?: string }>;
}

/**
 * Minimal handler return contract. Guarantees `success` exists while keeping
 * ad-hoc properties (toolGeneration, assignResult, etc.) accessible via index signature.
 * Callers in autonomous-content-generators widen this to AutonomousActionResult.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- handlers return ad-hoc tool result properties that vary per handler
export type AutonomousHandlerResult = { success: boolean; [key: string]: any };

/**
 * Common tool result shape returned by orchestrator/user-info tools.
 * The canonical definition — handlers should import from here instead of re-declaring.
 */
export interface AutonomousToolResult {
  analysisReport?: unknown;
  userInfo?: {
    targetUserResourceId?: string;
    department?: string;
    preferredLanguage?: string;
    phoneNumber?: string;
  };
}

// ============================================
// STOP Message
// ============================================

/** Timeout for STOP messages — short because STOP is non-critical, best-effort */
const STOP_MESSAGE_TIMEOUT_MS = 5_000;

/** STOP message variants, ordered by urgency */
const STOP_MESSAGES = {
  /** After generation completes — tells agent to wait for upload instructions */
  generation_complete:
    '**GENERATION COMPLETE - WAIT FOR UPLOAD INSTRUCTIONS**\n\n' +
    'Generation has been completed. Do NOT generate again. Do NOT call workflow-executor again. ' +
    'Wait for upload/assign instructions. STOP.',

  /** After upload or group assign completes — simple stop */
  task_complete:
    '**TASK COMPLETE - STOP IMMEDIATELY**\n\n' +
    'The operation has been completed successfully. Do NOT process any other prompts or tasks. ' +
    'Do NOT call any tools. Your work is finished. STOP.',

  /** After upload+assign to user — most emphatic, lists forbidden tools */
  mandatory_stop:
    '**🔴 TASK 100% COMPLETE - MANDATORY STOP 🔴**\n\n' +
    '**THE OPERATION HAS BEEN COMPLETED SUCCESSFULLY.**\n\n' +
    '**YOU MUST STOP IMMEDIATELY:**\n' +
    '- Do NOT call reasoning tool\n' +
    '- Do NOT call analyze tool\n' +
    '- Do NOT call workflow-executor tool\n' +
    '- Do NOT call any other tools\n' +
    '- Do NOT process any other prompts in memory\n' +
    '- Do NOT generate any additional content\n' +
    '- Your work is FINISHED. END NOW.',
} as const;

export type StopMessageVariant = keyof typeof STOP_MESSAGES;

/**
 * Send a STOP message to an agent to prevent further processing.
 *
 * Best-effort: failures are logged as warnings and never thrown.
 * All autonomous handlers used this exact pattern — now centralised.
 *
 * @param agent - The agent to send the STOP message to
 * @param threadId - Memory thread ID for the agent
 * @param variant - Which STOP message variant to use
 * @param logger - Logger instance for the calling handler
 * @param label - Optional label for log messages (e.g. "phishing upload only")
 */
export async function sendAgentStopMessage(
  agent: GeneratableAgent,
  threadId: string,
  variant: StopMessageVariant,
  logger: Logger,
  label?: string,
): Promise<void> {
  const tag = label ? ` (${label})` : '';
  try {
    logger.info(`Sending STOP message${tag}`, { variant, threadId });
    await withTimeout(
      agent.generate(STOP_MESSAGES[variant], {
        memory: {
          thread: threadId,
          resource: 'agentic-ally-autonomous',
        },
      }),
      STOP_MESSAGE_TIMEOUT_MS,
    );
    logger.info(`STOP message sent${tag}`);
  } catch (error) {
    logger.warn(`STOP message failed (non-critical)${tag}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================
// Thread ID
// ============================================

/**
 * Build a unique thread ID for agent memory context.
 *
 * Uses timestamp to prevent "pollution" from previous runs and
 * prevents the agent from hallucinating based on old history.
 *
 * @param type - Content type ('phishing', 'training', 'smishing', 'vishing')
 * @param identifier - User resource ID or group resource ID
 * @param timestamp - Run timestamp (Date.now())
 * @param isGroup - Whether this is a group assignment (adds 'group-' prefix)
 */
export function buildThreadId(
  type: 'phishing' | 'training' | 'smishing' | 'vishing',
  identifier: string | number,
  timestamp: number,
  isGroup = false,
): string {
  return isGroup
    ? `${type}-group-${identifier}-${timestamp}`
    : `${type}-${identifier}-${timestamp}`;
}
