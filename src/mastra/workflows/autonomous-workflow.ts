// @ts-nocheck
// NOTE: WorkflowEntrypoint import is added by post-build script (fix-cloudflare-shims.js)
// to avoid Mastra bundler trying to npm install 'cloudflare:workers' which fails
// Original: import { WorkflowEntrypoint, WorkflowStep } from 'cloudflare:workers';
declare const WorkflowEntrypoint: any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const WorkflowStep: any;
import { executeAutonomousGeneration } from '../services/autonomous';
import { getLogger } from '../utils/core/logger';
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

    logger.info('autonomous_workflow_started', {
      targetUserResourceId,
      targetGroupResourceId,
      actions: actions?.length,
      batchResourceId,
    });

    const result = await step.do(
      'execute-generation',
      { retries: { limit: 2, delay: '30 seconds', backoff: 'exponential' }, timeout: '10 minutes' },
      async () => {
        return await executeAutonomousGeneration({
          token,
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
        });
      },
    );

    logger.info('autonomous_workflow_completed', {
      success: result.success,
      targetUserResourceId,
      batchResourceId,
    });

    return result;
  }
}
