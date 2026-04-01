// @ts-nocheck
// NOTE: WorkflowEntrypoint import is added by post-build script (fix-cloudflare-shims.js)
// to avoid Mastra bundler trying to npm install 'cloudflare:workers' which fails
// Original: import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
declare const WorkflowEntrypoint: any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const WorkflowStep: any;
import { executeAutonomousGeneration } from '../services/autonomous';
import { getLogger } from '../utils/core/logger';
import { KVService } from '../services/kv-service';
import { KV_NAMESPACES, WORKFLOW_KV_KEYS, WORKFLOW_STATUS_TTL_SECONDS } from '../constants';
import type { AutonomousRequestBody } from '../types/api-types';
import { mastra } from '../index';
/**
 * Cloudflare Workflow entrypoint for autonomous generation.
 * Runs long-lived generation outside the HTTP request to avoid timeouts.
 * Uses durable step.do with retry for resilience against transient failures.
 */
export class AutonomousWorkflow extends WorkflowEntrypoint {
  async run(event: { payload: AutonomousRequestBody }, step: WorkflowStep) {
    const logger = getLogger('AutonomousWorkflow');
    // @ts-ignore this is because of the way mastra is exported in the index.mjs file
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _mastraObj = mastra();

    const {
      token,
      companyId,
      actionBatchResourceIds,
      firstName,
      lastName,
      actions,
      sendAfterPhishingSimulation,
      preferredLanguage,
      targetUserResourceId,
      targetGroupResourceId,
      baseApiUrl,
      batchResourceId,
      rejectingReason,
      rejectedScenarioResourceId,
    } = event.payload;

    // Write "running" status to KV for status polling
    // this.id = Cloudflare Workflow instance ID (set by workflow.create() in route)
    // Fallback chain: this.id → batchResourceId → timestamp-based ID
    const workflowId = this.id || event.payload.batchResourceId || `wf-${Date.now()}`;
    const kvService = new KVService(KV_NAMESPACES.BATCH_WORKFLOW);

    logger.info('autonomous_workflow_started', {
      workflowId,
      targetUserResourceId,
      targetGroupResourceId,
      actions: actions?.length,
      batchResourceId,
    });

    try {
      await step.do('write-running-status', async () => {
        await kvService.put(WORKFLOW_KV_KEYS.status(workflowId), {
          status: 'running',
          startedAt: new Date().toISOString(),
          actions,
          targetUserResourceId,
          targetGroupResourceId,
        }, { expirationTtl: WORKFLOW_STATUS_TTL_SECONDS });
      });
    } catch {
      // Non-critical — status polling won't work but generation continues
      logger.warn('autonomous_workflow_running_status_write_failed', { workflowId });
    }

    let result;
    try {
      result = await step.do(
        'execute-generation',
        { retries: { limit: 2, delay: '30 seconds', backoff: 'exponential' }, timeout: '10 minutes' },
        async () => {
          return await executeAutonomousGeneration({
            token,
            companyId,
            actionBatchResourceIds,
            baseApiUrl,
            firstName,
            lastName,
            actions,
            sendAfterPhishingSimulation,
            preferredLanguage,
            targetUserResourceId,
            targetGroupResourceId,
            batchResourceId,
            rejectingReason,
            rejectedScenarioResourceId,
            env: this.env,
          });
        },
      );
    } catch (executionError) {
      // Generation failed after all retries — write "failed" status so polling doesn't hang
      logger.error('autonomous_workflow_generation_failed', {
        workflowId,
        error: executionError instanceof Error ? executionError.message : String(executionError),
      });

      await step.do('write-failed-status', async () => {
        await kvService.put(WORKFLOW_KV_KEYS.status(workflowId), {
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: executionError instanceof Error ? executionError.message : 'Generation failed after retries',
          actions,
          targetUserResourceId,
          targetGroupResourceId,
        }, { expirationTtl: WORKFLOW_STATUS_TTL_SECONDS });
      });

      throw executionError; // Re-throw so Cloudflare marks workflow as failed
    }

    // Write final status to KV (success or partial failure)
    try {
      await step.do('write-final-status', async () => {
        await kvService.put(WORKFLOW_KV_KEYS.status(workflowId), {
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date().toISOString(),
          actions,
          targetUserResourceId,
          targetGroupResourceId,
          trainingResult: result.trainingResult ? {
            success: result.trainingResult.success,
            contentId: result.trainingResult.data?.contentId,
            trainingUrl: result.trainingResult.data?.trainingUrl,
            resourceId: result.trainingResult.data?.resourceId,
            sendTrainingLanguageId: result.trainingResult.data?.sendTrainingLanguageId,
          } : undefined,
          phishingResult: result.phishingResult ? { success: result.phishingResult.success } : undefined,
          smishingResult: result.smishingResult ? { success: result.smishingResult.success } : undefined,
          error: result.error,
        }, { expirationTtl: WORKFLOW_STATUS_TTL_SECONDS });
      });
    } catch (kvError) {
      // KV write failed — log but don't fail the workflow (content was already generated)
      logger.warn('autonomous_workflow_status_write_failed', {
        workflowId,
        error: kvError instanceof Error ? kvError.message : String(kvError),
      });
    }

    logger.info('autonomous_workflow_completed', {
      success: result.success,
      workflowId,
      targetUserResourceId,
      batchResourceId,
    });

    return result;
  }
}
