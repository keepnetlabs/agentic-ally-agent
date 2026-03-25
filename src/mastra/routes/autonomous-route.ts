/**
 * Autonomous Route
 *
 * Single user or group autonomous generation via Cloudflare Workflow.
 * 3-level fallback: Workflow binding → waitUntil → inline execution.
 *
 * POST /autonomous
 *   → 202 { status: 'started', workflowId, ... }
 */

import { Context } from 'hono';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { executeAutonomousGeneration } from '../services';
import {
  AUTONOMOUS_ACTIONS,
  isValidAutonomousAction,
} from '../types';
import type { AutonomousRequestBody, CloudflareEnv } from '../types';

const logger = getLogger('AutonomousRoute');

export async function autonomousHandler(c: Context) {
  try {
    const body = await c.req.json<AutonomousRequestBody>();
    const {
      token,
      firstName,
      lastName,
      targetUserResourceId,
      targetGroupResourceId,
      departmentName,
      actions,
      sendAfterPhishingSimulation,
      preferredLanguage,
      baseApiUrl,
      batchResourceId,
      rejectingReason,
      rejectedScenarioResourceId,
    } = body;
    const env = c.env as CloudflareEnv | undefined;

    // Validation
    if (!token) {
      return c.json({ success: false, error: 'Missing token' }, 400);
    }

    const isUserAssignment = !!(firstName || targetUserResourceId);
    const isGroupAssignment = !!targetGroupResourceId;

    if (isUserAssignment && isGroupAssignment) {
      return c.json(
        {
          success: false,
          error:
            'Cannot specify both user assignment (firstName/targetUserResourceId) and group assignment (targetGroupResourceId)',
        },
        400
      );
    }

    if (!isUserAssignment && !isGroupAssignment) {
      return c.json(
        {
          success: false,
          error: 'Must specify either user assignment (firstName) or group assignment (targetGroupResourceId)',
        },
        400
      );
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return c.json({ success: false, error: 'Missing or invalid actions array' }, 400);
    }
    if (!actions.every((a: unknown) => isValidAutonomousAction(a))) {
      return c.json(
        {
          success: false,
          error: `Actions must be one or more of: ${AUTONOMOUS_ACTIONS.map(a => `"${a}"`).join(', ')}`,
        },
        400
      );
    }

    logger.info('autonomous_request_received', {
      firstName,
      lastName,
      targetUserResourceId,
      targetGroupResourceId,
      actionsCount: actions.length,
      assignmentType: isUserAssignment ? 'user' : 'group',
    });

    // Primary path: Cloudflare Workflow binding
    try {
      const workflow = env?.AUTONOMOUS_WORKFLOW;
      if (workflow && workflow.create) {
        const instance = await workflow.create({
          params: {
            token,
            firstName,
            lastName,
            targetUserResourceId,
            targetGroupResourceId,
            departmentName,
            actions,
            sendAfterPhishingSimulation,
            preferredLanguage,
            baseApiUrl,
            batchResourceId,
            rejectingReason,
            rejectedScenarioResourceId,
          },
        });

        logger.info('autonomous_workflow_started', { workflowId: instance?.id });
        return c.json(
          {
            success: true,
            workflowId: instance?.id ?? null,
            status: 'started',
            firstName,
            lastName,
            targetUserResourceId,
            targetGroupResourceId,
            assignmentType: isUserAssignment ? 'user' : 'group',
            actions,
          },
          202
        );
      }
      logger.warn('autonomous_workflow_binding_missing_falling_back');
    } catch (workflowError) {
      logger.warn('autonomous_workflow_start_failed_falling_back', {
        error: workflowError instanceof Error ? workflowError.message : String(workflowError),
      });
    }

    const requestPayload = {
      token,
      firstName,
      lastName,
      targetUserResourceId,
      targetGroupResourceId,
      departmentName,
      actions,
      sendAfterPhishingSimulation,
      preferredLanguage,
      baseApiUrl,
      batchResourceId,
      rejectingReason,
      rejectedScenarioResourceId,
    };

    // Fallback 1: run in background via waitUntil if available (preferred in Workers)
    try {
      // @ts-ignore - ExecutionContext check for Cloudflare Workers
      if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
        const executionPromise = executeAutonomousGeneration(requestPayload).catch(err => {
          logger.error('autonomous_background_execution_failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        });
        // @ts-ignore
        c.executionCtx.waitUntil(executionPromise);
        logger.debug('background_task_registered_with_waituntil');

        return c.json(
          {
            success: true,
            message: 'Autonomous generation started in background. This process may take 5-10 minutes.',
            status: 'processing',
            firstName,
            lastName,
            targetUserResourceId,
            targetGroupResourceId,
            assignmentType: isUserAssignment ? 'user' : 'group',
            actions,
          },
          200
        );
      }
    } catch (waitUntilError) {
      logger.warn('waituntil_not_available_using_floating_promise', {
        error: waitUntilError instanceof Error ? waitUntilError.message : String(waitUntilError),
      });
    }

    // Fallback 2 (LOCAL DEV): no workflow binding and no waitUntil.
    // Run inline so local requests reliably complete (avoids "floating promise" being dropped).
    logger.warn('autonomous_no_workflow_no_waituntil_running_inline');
    const result = await executeAutonomousGeneration(requestPayload);

    return c.json(
      {
        ...result,
        status: result.success ? 'completed' : 'failed',
      },
      200
    );
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'autonomous-endpoint',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'autonomous_endpoint_error', errorInfo);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
