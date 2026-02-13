import { Context } from 'hono';
import { errorService } from '../services/error-service';
import { getLogger } from '../utils/core/logger';
import { logErrorInfo, normalizeError } from '../utils/core/error-utils';
import { emailIRWorkflow } from '../workflows/email-ir-workflow';
import { fetchEmailInputSchema } from '../tools/email-ir/fetch-email';
import { emailIrAnalyzeSuccessResponseSchema } from './email-ir-route.schemas';

/**
 * POST /email-ir/analyze
 *
 * Payload:
 * {
 *   "id": "email_resource_id",
 *   "accessToken": "bearer_token",
 *   "apiBaseUrl": "https://optional-custom-url.com"
 * }
 */
export const emailIRAnalyzeHandler = async (c: Context) => {
  const logger = getLogger('EmailIRHandler');

  try {
    const body = await c.req.json();

    // Validate Input
    const validation = fetchEmailInputSchema.safeParse(body);
    if (!validation.success) {
      const errorInfo = errorService.validation('Invalid input', {
        route: '/email-ir/analyze',
        details: validation.error.format(),
      });
      logErrorInfo(logger, 'warn', 'email_ir_invalid_input', errorInfo);
      return c.json(
        {
          success: false,
          error: 'Invalid input',
          details: validation.error.format(),
        },
        400
      );
    }

    const inputData = validation.data;

    logger.info('Starting Email IR Analysis', { id: inputData.id });

    // Start Workflow
    const run = await emailIRWorkflow.createRunAsync();
    const result = await run.start({ inputData });

    if (result.status === 'failed') {
      throw new Error(result.error ? String(result.error) : 'Workflow execution failed');
    }

    // Return final report
    const stepResult = result.steps['email-ir-reporting-step'];
    const report = stepResult && stepResult.status === 'success' ? stepResult.output : null;
    if (!report) {
      throw new Error('Workflow completed without reporting output');
    }

    const responsePayload = {
      success: true,
      report,
      runId: run.runId,
    };

    const responseValidation = emailIrAnalyzeSuccessResponseSchema.safeParse(responsePayload);
    if (!responseValidation.success) {
      throw new Error('Workflow produced invalid report schema');
    }

    return c.json(responsePayload);
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.internal(err.message, {
      route: '/email-ir/analyze',
      event: 'error',
    });
    logErrorInfo(logger, 'error', 'email_ir_analysis_failed', errorInfo);
    return c.json(
      {
        success: false,
        error: err.message,
      },
      500
    );
  }
};
