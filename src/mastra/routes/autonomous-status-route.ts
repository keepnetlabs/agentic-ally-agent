/**
 * Autonomous Workflow Status Route
 *
 * Polls status of a single autonomous workflow by workflowId.
 * Same pattern as batch-autonomous status endpoint.
 *
 * GET /autonomous/:workflowId/status
 *   → 200 { status: 'running' | 'completed' | 'failed', ... }
 */

import { Context } from 'hono';
import { getLogger } from '../utils/core/logger';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { KVService } from '../services';
import { KV_NAMESPACES, WORKFLOW_KV_KEYS } from '../constants';

const logger = getLogger('AutonomousStatusRoute');

export async function autonomousStatusHandler(c: Context) {
  try {
    const workflowId = c.req.param('workflowId');
    if (!workflowId) {
      return c.json({ success: false, error: 'Missing workflowId' }, 400);
    }

    const kvService = new KVService(KV_NAMESPACES.BATCH_WORKFLOW);
    const meta = await kvService.get(WORKFLOW_KV_KEYS.status(workflowId));

    if (!meta) {
      return c.json({ success: false, error: 'Workflow not found', workflowId }, 404);
    }

    return c.json({ success: true, workflowId, ...(typeof meta === 'object' ? meta : {}) }, 200);
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.external(err.message, {
      step: 'autonomous-status-endpoint',
      stack: err.stack,
    });
    logErrorInfo(logger, 'error', 'autonomous_status_error', errorInfo);
    return c.json({ success: false, error: err.message }, 500);
  }
}
