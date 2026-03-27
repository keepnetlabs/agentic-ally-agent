/**
 * Batch Autonomous Route
 *
 * Thin validation layer that delegates fan-out to BatchOrchestratorWorkflow.
 * The orchestrator runs as a durable CF Workflow — no HTTP timeout risk.
 *
 * POST /batch-autonomous
 *   → 202 { batchResourceId, status: "accepted", ... }
 *
 * GET /batch-autonomous/:batchId/status
 *   → 200 { batchResourceId, status, userCount, ... }
 */

import { Context } from 'hono';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { KVService } from '../services';
import { BATCH_KV_KEYS, BATCH_META_TTL_SECONDS, KV_NAMESPACES } from '../constants';
import { resolveBaseApiUrl } from '../utils/core/url-validator';
import { generateBatchId } from '../utils/core/short-id';
import {
  AUTONOMOUS_ACTIONS,
  isValidAutonomousAction,
  getGroupEligibleActions,
} from '../types';
import type { BatchAutonomousRequestBody, CloudflareEnv } from '../types';

const logger = getLogger('BatchAutonomousRoute');

export async function batchAutonomousHandler(c: Context) {
  try {
    const body = await c.req.json<BatchAutonomousRequestBody>();
    const {
      token,
      targetGroupResourceId,
      actions,
      sendAfterPhishingSimulation,
      preferredLanguage,
      baseApiUrl,
    } = body;
    const env = c.env as CloudflareEnv | undefined;

    // ── Validation ──
    if (!token) {
      return c.json({ success: false, error: 'Missing token' }, 400);
    }
    if (!targetGroupResourceId) {
      return c.json({ success: false, error: 'Missing targetGroupResourceId' }, 400);
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
        400,
      );
    }

    const eligibleActions = getGroupEligibleActions(actions);
    if (eligibleActions.length === 0) {
      return c.json(
        { success: false, error: 'No eligible actions for group assignment (vishing-call requires individual user endpoint)' },
        400,
      );
    }

    const effectiveBaseApiUrl = resolveBaseApiUrl(baseApiUrl);
    const batchResourceId = generateBatchId();

    // ── Dispatch to BatchOrchestratorWorkflow ──
    const orchestrator = env?.BATCH_ORCHESTRATOR_WORKFLOW;
    if (!orchestrator) {
      return c.json({ success: false, error: 'Batch orchestrator workflow binding not available' }, 503);
    }

    try {
      await orchestrator.create({
        id: `orchestrator-${batchResourceId}`,
        params: {
          token,
          targetGroupResourceId,
          eligibleActions,
          batchResourceId,
          sendAfterPhishingSimulation,
          preferredLanguage,
          baseApiUrl: effectiveBaseApiUrl,
          requestedActions: actions,
          _createdAt: new Date().toISOString(),
        },
      });
    } catch (createErr) {
      const normalized = normalizeError(createErr);
      const errorInfo = errorService.external(normalized.message, {
        step: 'batch-orchestrator-create',
        batchResourceId,
        stack: normalized.stack,
      });
      logErrorInfo(logger, 'error', 'batch_orchestrator_create_failed', errorInfo);
      return c.json({ success: false, error: `Failed to create orchestrator workflow: ${normalized.message}` }, 500);
    }

    logger.info('batch_orchestrator_dispatched', {
      batchResourceId,
      targetGroupResourceId,
      eligibleActions,
    });

    // Save initial "accepted" metadata so status endpoint works immediately
    const kvService = new KVService(KV_NAMESPACES.BATCH_WORKFLOW);
    kvService
      .put(
        BATCH_KV_KEYS.meta(batchResourceId),
        {
          batchResourceId,
          targetGroupResourceId,
          status: 'accepted',
          actions: eligibleActions,
          skippedActions: eligibleActions.length < actions.length
            ? actions.filter(a => !(eligibleActions as readonly string[]).includes(a))
            : undefined,
          createdAt: new Date().toISOString(),
        },
        { ttlSeconds: BATCH_META_TTL_SECONDS },
      )
      .catch(err => {
        logger.warn('batch_initial_meta_save_failed', { batchResourceId, error: String(err) });
      });

    return c.json(
      {
        success: true,
        status: 'accepted',
        batchResourceId,
        targetGroupResourceId,
        actions: eligibleActions,
        ...(eligibleActions.length < actions.length && {
          skippedActions: actions.filter(a => !(eligibleActions as readonly string[]).includes(a)),
        }),
      },
      202,
    );
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'batch-autonomous-endpoint',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'batch_autonomous_endpoint_error', errorInfo);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function batchAutonomousStatusHandler(c: Context) {
  try {
    const batchId = c.req.param('batchId');
    if (!batchId) {
      return c.json({ success: false, error: 'Missing batchId' }, 400);
    }

    const kvService = new KVService(KV_NAMESPACES.BATCH_WORKFLOW);
    const meta = await kvService.get(BATCH_KV_KEYS.meta(batchId));

    if (!meta) {
      return c.json({ success: false, error: 'Batch not found' }, 404);
    }

    return c.json({ success: true, ...(typeof meta === 'object' ? meta : {}) }, 200);
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'batch-status-endpoint',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'batch_status_endpoint_error', errorInfo);
    return c.json({ success: false, error: err.message }, 500);
  }
}
