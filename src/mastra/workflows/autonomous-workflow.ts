// @ts-nocheck
import { WorkflowEntrypoint } from 'cloudflare:workers';
import { executeAutonomousGeneration } from '../services/autonomous';
import { getLogger } from '../utils/core/logger';
import type { AutonomousRequestBody, CloudflareEnv } from '../types/api-types';
import { normalizeError, logErrorInfo } from '../utils/core/error-utils';
import { errorService } from '../services/error-service';
import { mastra } from '../index';
/**
 * Cloudflare Workflow entrypoint for autonomous generation.
 * Runs long-lived generation outside the HTTP request to avoid timeouts.
 */
export class AutonomousWorkflow extends WorkflowEntrypoint {
  async run(event: { payload: AutonomousRequestBody }, env: CloudflareEnv) {
    const logger = getLogger('AutonomousWorkflow');
    // @ts-ignore this is because of the way mastra is exported in the index.mjs file
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _mastraObj = mastra();
    try {
      logger.info('autonomous_workflow_started', { hasEnv: !!env });
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
      } = event.payload;
      const result = await executeAutonomousGeneration({
        token,
        baseApiUrl,
        firstName,
        lastName,
        actions,
        sendAfterPhishingSimulation,
        preferredLanguage,
        targetUserResourceId,
        targetGroupResourceId,
      });

      logger.info('autonomous_workflow_completed', { success: result.success });
      return result;
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        step: 'autonomous-generation',
        stack: err.stack,
        token_preview: event?.payload?.token ? '***' : undefined,
        targetUserResourceId: event?.payload?.targetUserResourceId,
        actions: event?.payload?.actions?.length,
      });
      logErrorInfo(logger, 'error', 'autonomous_workflow_failed', errorInfo);

      return {
        success: false,
        error: err.message,
        actions: event?.payload?.actions || [],
      };
    }
  }
}
