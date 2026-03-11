// @ts-nocheck
import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
import { getLogger } from '../utils/core/logger';
import { fetchGroupMembersPage } from '../utils/core/group-members';
import { CF_WORKFLOW_LIMITS, BATCH_KV_KEYS, BATCH_META_TTL_SECONDS } from '../constants';
import type { AutonomousAction } from '../types/autonomous-types';
import { mastra } from '../index';

const CHUNK_SIZE = 100;

/** Payload passed to the orchestrator from the route handler. */
export interface BatchOrchestratorPayload {
  token: string;
  targetGroupResourceId: string;
  eligibleActions: AutonomousAction[];
  batchResourceId: string;
  sendAfterPhishingSimulation?: boolean;
  preferredLanguage?: string;
  baseApiUrl: string;
  /** Original requested actions (may include vishing-call which was filtered). */
  requestedActions?: string[];
  /** ISO timestamp from route handler for consistent metadata. */
  _createdAt?: string;
}

/**
 * Durable fan-out orchestrator for batch autonomous generation.
 *
 * Runs as a CF Workflow so it can scale to 100K+ users without
 * HTTP timeout constraints. Each page of users is fetched and
 * dispatched in its own durable step with CF-native retry.
 *
 * Architecture:
 *   Route handler ─(create)─> BatchOrchestratorWorkflow
 *     step "fetch-page-count"  → get total pages
 *     step "dispatch-page-N"   → fetch 1000 users + createBatch(100) × 10
 *     step.sleep "throttle"    → rate limit between pages
 *     step "save-meta"         → persist final status to KV
 */
export class BatchOrchestratorWorkflow extends WorkflowEntrypoint {
  async run(event: { payload: BatchOrchestratorPayload }, step: WorkflowStep) {
    const logger = getLogger('BatchOrchestratorWorkflow');
    // @ts-ignore this is because of the way mastra is exported in the index.mjs file
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _mastraObj = mastra();

    const {
      token,
      targetGroupResourceId,
      eligibleActions,
      batchResourceId,
      sendAfterPhishingSimulation,
      preferredLanguage,
      baseApiUrl,
      requestedActions,
    } = event.payload;

    const autonomousWorkflow = this.env.AUTONOMOUS_WORKFLOW;

    // ── Step 1: Fetch first page to discover total page count ──
    const { totalPages, totalRecords } = await step.do(
      'fetch-page-count',
      { retries: { limit: 3, delay: '5 seconds', backoff: 'exponential' }, timeout: '2 minutes' },
      async () => {
        logger.info('batch_orchestrator_started', { batchResourceId, targetGroupResourceId });
        const result = await fetchGroupMembersPage(token, targetGroupResourceId, baseApiUrl, 1);
        return { totalPages: result.totalPages, totalRecords: result.totalRecords };
      },
    );

    let totalCreated = 0;
    let totalFailed = 0;
    const MAX_FAILED_ENTRIES = 200; // Cap to prevent unbounded growth hitting 1 MiB step state limit
    const failedPages: Array<{ page: number; error: string }> = [];

    // ── Step 2: Process each page (fetch users + dispatch chunks) ──
    for (let page = 1; page <= totalPages; page++) {
      const pageResult = await step.do(
        `dispatch-page-${page}`,
        { retries: { limit: 3, delay: '10 seconds', backoff: 'exponential' }, timeout: '5 minutes' },
        async () => {
          // Fetch this page of users
          const { users } = await fetchGroupMembersPage(token, targetGroupResourceId, baseApiUrl, page);

          let created = 0;
          let failed = 0;
          const errors: string[] = [];

          // Dispatch in chunks of 100 with inline throttle
          for (let c = 0; c < users.length; c += CHUNK_SIZE) {
            const chunk = users.slice(c, c + CHUNK_SIZE);
            const chunkParams = chunk.map(user => {
              const instanceId = `batch-${batchResourceId}-${user.resourceId}`;
              return {
                id: instanceId.length > CF_WORKFLOW_LIMITS.MAX_INSTANCE_ID_LENGTH
                  ? instanceId.slice(0, CF_WORKFLOW_LIMITS.MAX_INSTANCE_ID_LENGTH)
                  : instanceId,
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
                  baseApiUrl,
                },
              };
            });

            try {
              const results = await autonomousWorkflow.createBatch(chunkParams);
              created += results.filter((r: { id?: string }) => r?.id).length;
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              failed += chunk.length;
              errors.push(errMsg);
              logger.error('batch_chunk_dispatch_failed', {
                batchResourceId,
                page,
                chunkStart: c,
                chunkSize: chunk.length,
                error: errMsg,
              });
            }

            // Rate limit throttle between chunks (except last)
            if (c + CHUNK_SIZE < users.length) {
              await new Promise(r => setTimeout(r, CF_WORKFLOW_LIMITS.CHUNK_THROTTLE_MS));
            }
          }

          logger.info('batch_page_dispatched', { batchResourceId, page, created, failed });
          return { created, failed, errors: errors.length > 0 ? errors : undefined };
        },
      );

      totalCreated += pageResult.created;
      totalFailed += pageResult.failed;
      if (pageResult.errors && failedPages.length < MAX_FAILED_ENTRIES) {
        const remaining = MAX_FAILED_ENTRIES - failedPages.length;
        const newEntries = pageResult.errors.map((e: string) => ({ page, error: e }));
        failedPages.push(...newEntries.slice(0, remaining));
      }

      // Throttle between pages to let rate limit window reset
      if (page < totalPages) {
        await step.sleep(`throttle-page-${page}`, '2 seconds');
      }
    }

    // ── Step 3: Save final batch metadata to KV ──
    const batchStatus = totalCreated === 0 && totalFailed > 0
      ? 'failed'
      : totalFailed > 0
        ? 'partial'
        : 'completed';

    await step.do(
      'save-meta',
      { retries: { limit: 3, delay: '2 seconds', backoff: 'constant' } },
      async () => {
        const meta = {
          batchResourceId,
          targetGroupResourceId,
          status: batchStatus,
          userCount: totalRecords,
          workflowsCreated: totalCreated,
          workflowsFailed: totalFailed,
          totalPages,
          failedPages: failedPages.length > 0 ? failedPages : undefined,
          actions: eligibleActions,
          skippedActions: requestedActions
            ? requestedActions.filter(a => !eligibleActions.includes(a as AutonomousAction))
            : undefined,
          createdAt: event.payload._createdAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
        };

        // Use KV binding from env (BATCH_WORKFLOW_KV)
        const kv = this.env.BATCH_WORKFLOW_KV;
        if (kv) {
          await kv.put(
            BATCH_KV_KEYS.meta(batchResourceId),
            JSON.stringify(meta),
            { expirationTtl: BATCH_META_TTL_SECONDS },
          );
        }

        logger.info('batch_orchestrator_completed', {
          batchResourceId,
          status: batchStatus,
          totalCreated,
          totalFailed,
          totalPages,
        });

        return meta;
      },
    );

    return { success: batchStatus !== 'failed', batchResourceId, status: batchStatus, totalCreated, totalFailed };
  }
}
