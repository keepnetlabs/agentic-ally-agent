/**
 * Batch Autonomous Route
 *
 * Fan-out autonomous generation to all users in a target group.
 * Creates individual Cloudflare Workflow instances per user, chunked at 100.
 *
 * POST /batch-autonomous
 *   → 202 { batchResourceId, status, workflowsCreated, ... }
 *
 * GET /batch-autonomous/:batchId/status
 *   → 200 { batchResourceId, status, userCount, ... }
 */

import { Context } from 'hono';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { KVService } from '../services';
import { MAX_BATCH_USERS, BATCH_KV_KEYS, BATCH_META_TTL_SECONDS, KV_NAMESPACES } from '../constants';
import { resolveBaseApiUrl } from '../utils/core/url-validator';
import { generateBatchId } from '../utils/core/short-id';
import { fetchGroupMembers } from '../utils/core/group-members';
import {
  AUTONOMOUS_ACTIONS,
  isValidAutonomousAction,
  getGroupEligibleActions,
} from '../types';
import type { BatchAutonomousRequestBody, CloudflareEnv } from '../types';

const logger = getLogger('BatchAutonomousRoute');
const CHUNK_SIZE = 100;

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

    // Validation
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
        400
      );
    }

    const effectiveBaseApiUrl = resolveBaseApiUrl(baseApiUrl);

    // Step 1: Fetch group members
    const users = await fetchGroupMembers(token, targetGroupResourceId, effectiveBaseApiUrl);

    if (users.length === 0) {
      return c.json({ success: false, error: 'No active users found in group' }, 400);
    }

    if (users.length > MAX_BATCH_USERS) {
      return c.json(
        {
          success: false,
          error: `Group has ${users.length} users, exceeds maximum of ${MAX_BATCH_USERS}. Split into smaller groups.`,
        },
        400
      );
    }

    // Step 2: Filter out vishing-call (requires per-user phone, not suitable for group ops)
    const eligibleActions = getGroupEligibleActions(actions);
    if (eligibleActions.length === 0) {
      return c.json(
        { success: false, error: 'No eligible actions for group assignment (vishing-call requires individual user endpoint)' },
        400
      );
    }

    // Step 3: Shared batch ID for all activities
    const batchResourceId = generateBatchId();

    logger.info('batch_autonomous_started', {
      targetGroupResourceId,
      userCount: users.length,
      batchResourceId,
      requestedActions: actions,
      eligibleActions,
    });

    // Step 4: Chunked fan-out (max 100 per chunk)
    // Prefer createBatch (1 subrequest, idempotent) → fallback to Promise.all(create())
    const workflow = env?.AUTONOMOUS_WORKFLOW;

    if (!workflow || (!workflow.createBatch && !workflow.create)) {
      return c.json({ success: false, error: 'Workflow binding not available' }, 503);
    }

    const useBatch = typeof workflow.createBatch === 'function';
    const workflowIds: string[] = [];
    const failedChunks: Array<{ chunkIndex: number; userCount: number; error: string }> = [];
    const totalChunks = Math.ceil(users.length / CHUNK_SIZE);

    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      const chunkIndex = Math.floor(i / CHUNK_SIZE);
      const chunk = users.slice(i, i + CHUNK_SIZE);
      const chunkParams = chunk.map(user => ({
        id: `batch-${batchResourceId}-${user.resourceId}`,
        params: {
          token,
          targetUserResourceId: user.resourceId,
          firstName: user.firstName,
          lastName: user.lastName,
          departmentName: user.department,
          actions: eligibleActions,
          batchResourceId,
          sendAfterPhishingSimulation,
          preferredLanguage: user.preferredLanguage || preferredLanguage,
          baseApiUrl: effectiveBaseApiUrl,
        },
      }));

      try {
        let results: Array<{ id?: string }>;
        if (useBatch) {
          results = await workflow.createBatch(chunkParams);
        } else {
          results = await Promise.all(chunkParams.map(p => workflow.create(p)));
        }
        workflowIds.push(...results.map(r => r?.id).filter(Boolean) as string[]);
      } catch (firstError) {
        const firstMsg = firstError instanceof Error ? firstError.message : String(firstError);
        logger.warn('batch_chunk_failed_retrying', { chunkIndex, totalChunks, error: firstMsg });
        try {
          let retryResults: Array<{ id?: string }>;
          if (useBatch) {
            retryResults = await workflow.createBatch(chunkParams);
          } else {
            retryResults = await Promise.all(chunkParams.map(p => workflow.create(p)));
          }
          workflowIds.push(...retryResults.map(r => r?.id).filter(Boolean) as string[]);
          logger.info('batch_chunk_retry_succeeded', { chunkIndex });
        } catch (retryError) {
          const retryMsg = retryError instanceof Error ? retryError.message : String(retryError);
          logger.error('batch_chunk_retry_failed', { chunkIndex, totalChunks, userCount: chunk.length, error: retryMsg });
          failedChunks.push({ chunkIndex, userCount: chunk.length, error: retryMsg });
        }
      }
    }

    // Step 5: Evaluate results
    const allFailed = workflowIds.length === 0 && failedChunks.length > 0;

    logger.info('batch_autonomous_fan_out_complete', {
      batchResourceId,
      workflowsCreated: workflowIds.length,
      totalChunks,
      failedChunks: failedChunks.length,
    });

    const batchStatus = allFailed ? 'failed' : failedChunks.length > 0 ? 'partial' : 'started';

    // Step 6: Save batch metadata to KV (fire-and-forget)
    const batchMeta = {
      batchResourceId,
      targetGroupResourceId,
      status: batchStatus,
      userCount: users.length,
      workflowsCreated: workflowIds.length,
      totalChunks,
      failedChunks: failedChunks.length > 0 ? failedChunks : undefined,
      actions: eligibleActions,
      skippedActions: eligibleActions.length < actions.length
        ? actions.filter(a => !eligibleActions.includes(a as any))
        : undefined,
      createdAt: new Date().toISOString(),
    };

    const kvService = new KVService(KV_NAMESPACES.BATCH_WORKFLOW);
    kvService.put(BATCH_KV_KEYS.meta(batchResourceId), batchMeta, { ttlSeconds: BATCH_META_TTL_SECONDS }).catch(err => {
      logger.warn('batch_metadata_kv_save_failed', { batchResourceId, error: String(err) });
    });

    if (allFailed) {
      return c.json(
        {
          success: false,
          error: 'All chunks failed to create workflows',
          batchResourceId,
          failedChunks,
        },
        500
      );
    }

    return c.json(
      {
        success: true,
        status: batchStatus,
        batchResourceId,
        targetGroupResourceId,
        userCount: users.length,
        workflowsCreated: workflowIds.length,
        totalChunks,
        ...(failedChunks.length > 0 && { failedChunks }),
        actions: eligibleActions,
        ...(eligibleActions.length < actions.length && {
          skippedActions: actions.filter(a => !eligibleActions.includes(a as any)),
        }),
      },
      202
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
      500
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
    logger.error('batch_status_endpoint_error', { error: err.message });
    return c.json({ success: false, error: err.message }, 500);
  }
}
