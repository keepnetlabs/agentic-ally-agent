// @ts-nocheck
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { executeAutonomousGeneration } from '../services/autonomous-service';
import { getLogger } from '../utils/core/logger';
import type { AutonomousRequestBody, CloudflareEnv } from '../types/api-types';
import { mastra } from '../index';
/**
 * Cloudflare Workflow entrypoint for autonomous generation.
 * Runs long-lived generation outside the HTTP request to avoid timeouts.
 */
export class AutonomousWorkflow extends WorkflowEntrypoint {
    async run(event: { payload: AutonomousRequestBody }, env: CloudflareEnv) {
        const logger = getLogger('AutonomousWorkflow');
        // @ts-ignore this is because of the way mastra is exported in the index.mjs file
        const mastraObj = mastra()
        try {
            logger.info('autonomous_workflow_started', { hasEnv: !!env });
            const { token, firstName, lastName, actions, sendAfterPhishingSimulation } = event.payload;
            const result = await executeAutonomousGeneration({
                token,
                firstName,
                lastName,
                actions,
                sendAfterPhishingSimulation
            });

            logger.info('autonomous_workflow_completed', { success: result.success });
            return result;
        } catch (error) {
            logger.error('autonomous_workflow_failed', {
                error: error instanceof Error ? error.message : String(error),
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown workflow error',
                actions: event?.payload?.actions || [],
            };
        }
    }
}

