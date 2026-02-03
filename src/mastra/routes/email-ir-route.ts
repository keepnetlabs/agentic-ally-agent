import { Context } from 'hono';
import { getLogger } from '../utils/core/logger';
import { normalizeError } from '../utils/core/error-utils';
import { emailIRWorkflow } from '../workflows/email-ir-workflow';
import { fetchEmailInputSchema } from '../tools/email-ir/fetch-email';

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
            return c.json({
                success: false,
                error: 'Invalid input',
                details: validation.error.format()
            }, 400);
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

        return c.json({
            success: true,
            report,
            runId: run.runId
        });

    } catch (error) {
        const err = normalizeError(error);
        logger.error('Email IR Analysis Failed', { error: err.message });
        return c.json({
            success: false,
            error: err.message
        }, 500);
    }
};
