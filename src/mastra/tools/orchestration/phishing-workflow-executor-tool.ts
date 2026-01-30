import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { createPhishingWorkflow } from '../../workflows/create-phishing-workflow';
import { PHISHING, ERROR_MESSAGES, TIMEOUT_VALUES } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { getPolicySummary } from '../../utils/core/policy-cache';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { phishingWorkflowSchema, phishingWorkflowOutputSchema } from './phishing-workflow-executor-schemas';
import { z } from 'zod';

// v1: Infer input type from schema
type PhishingWorkflowInput = z.infer<typeof phishingWorkflowSchema>;

export const phishingWorkflowExecutorTool = createTool({
    id: 'phishing-workflow-executor',
    description: 'Execute phishing simulation generation workflows',
    // v1: Cast to satisfy SchemaWithValidation (preprocess schemas have complex input types)
    inputSchema: phishingWorkflowSchema as z.ZodType<PhishingWorkflowInput>,
    outputSchema: phishingWorkflowOutputSchema,

    // v1: (inputData, context) signature
    execute: async (inputData: PhishingWorkflowInput, ctx?: ToolExecutionContext) => {
        const params = inputData;
        const writer = ctx?.writer;
        const logger = getLogger('PhishingWorkflowExecutor');

        try {
            logger.info('Starting Phishing Workflow', { topic: params.topic });

            // Get cached policy summary ONCE at workflow start
            logger.info('Getting policy summary for workflow');
            const policyContext = await getPolicySummary();
            logger.info('Policy summary ready', { hasContent: !!policyContext, length: policyContext.length });

            const workflow = createPhishingWorkflow;
            // v1: createRunAsync → createRun
            const run = await workflow.createRun();

            const result = await run.start({
                inputData: {
                    topic: params.topic,
                    isQuishing: params.isQuishing || false, // Agent determines if this is quishing
                    targetProfile: params.targetProfile,
                    difficulty: params.difficulty || PHISHING.DEFAULT_DIFFICULTY,
                    language: params.language || 'en',
                    method: params.method, // Pass user choice or undefined
                    includeEmail: params.includeEmail,
                    includeLandingPage: params.includeLandingPage,
                    additionalContext: params.additionalContext,
                    modelProvider: params.modelProvider,
                    model: params.model,
                    writer: writer,
                    policyContext: policyContext || undefined // Pass if available
                }
            });

            logger.info('Workflow Completed', { status: result.status });

            if (result.status === 'success' && result.result) {
                const output = result.result;

                // Stream result to frontend
                // EMIT UI SIGNALS (v1: data- prefix for toAISdkStream compatibility)
                if (writer) {
                    try {
                        // Wait to let reasoning streams finish and build anticipation
                        await new Promise(resolve => setTimeout(resolve, TIMEOUT_VALUES.PHISHING_WORKFLOW_STREAM_DELAY_MS));

                        const normalizedLanguage = (params.language || 'en-gb').toLowerCase();
                        const emailKey = `phishing:${output.phishingId}:email:${normalizedLanguage}`;
                        const landingKey = `phishing:${output.phishingId}:landing:${normalizedLanguage}`;

                        // 1. Email Preview (if exists)
                        if (output.template) {
                            const emailObject = {
                                phishingId: output.phishingId,
                                emailKey,
                                language: normalizedLanguage,
                                subject: output.subject,
                                template: output.template,
                                fromAddress: output.fromAddress,
                                fromName: output.fromName,
                                method: output.analysis?.method,
                                isQuishing: params.isQuishing || false,
                            };
                            const emailJson = JSON.stringify(emailObject);
                            const encodedEmail = Buffer.from(emailJson).toString('base64');

                            await writer.write({
                                type: 'data-ui-signal',
                                data: {
                                    signal: 'phishing_email',
                                    message: `::ui:phishing_email::${encodedEmail}::/ui:phishing_email::\n`
                                }
                            });
                        }

                        // 2. Landing Page (if exists)
                        if (output.landingPage && output.landingPage.pages.length > 0) {
                            const landingPageObject = {
                                phishingId: output.phishingId,
                                landingKey,
                                language: normalizedLanguage,
                                ...output.landingPage,
                                isQuishing: params.isQuishing || false,
                            };
                            const landingPageJson = JSON.stringify(landingPageObject);
                            const encodedLandingPage = Buffer.from(landingPageJson).toString('base64');

                            await writer.write({
                                type: 'data-ui-signal',
                                data: {
                                    signal: 'landing_page',
                                    message: `::ui:landing_page::${encodedLandingPage}::/ui:landing_page::\n`
                                }
                            });
                        }
                    } catch (err) {
                        const error = err instanceof Error ? err : new Error(String(err));
                        logger.error('Failed to stream phishing email', { error: error.message, stack: error.stack });
                    }
                }

                const toolResult = {
                    success: true,
                    status: 'success',
                    message: '✅ Phishing simulation generated successfully. Phishing ID: ' + output.phishingId + '. **STOP - Do NOT call this tool again. The simulation is complete.**',
                    // Return rich metadata for Agent Memory (context handover)
                    data: {
                        phishingId: output.phishingId,
                        topic: params.topic,
                        language: params.language,
                        difficulty: params.difficulty,
                        method: output.analysis?.method,
                        subject: output.subject,
                        fromAddress: output.fromAddress,
                        fromName: output.fromName,
                        scenario: output.analysis?.scenario,
                        category: output.analysis?.category,
                        psychologicalTriggers: output.analysis?.psychologicalTriggers,
                        keyRedFlags: output.analysis?.keyRedFlags,
                        targetAudience: output.analysis?.targetAudienceAnalysis,
                    }
                };

                // Validate result against output schema
                const validation = validateToolResult(toolResult, phishingWorkflowOutputSchema, 'phishing-workflow-executor');
                if (!validation.success) {
                    logger.error('Phishing workflow result validation failed', { code: validation.error.code, message: validation.error.message });
                    return {
                        success: false,
                        error: JSON.stringify(validation.error),
                        message: '❌ Phishing workflow result validation failed.'
                    };
                }

                return validation.data;

            }

            // Workflow succeeded but no result
            logger.error('Phishing workflow produced no output', {});
            return {
                success: false,
                error: ERROR_MESSAGES.PHISHING.NO_OUTPUT,
                message: '❌ Phishing workflow completed but produced no output. Do NOT retry - check logs for details.'
            };

        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                topic: inputData?.topic,
                difficulty: inputData?.difficulty,
                step: 'phishing-workflow-execution',
                stack: err.stack
            });

            logErrorInfo(logger, 'error', 'Phishing workflow error', errorInfo);

            // User-friendly error message
            const userMessage = err.message.includes('analysis')
                ? ERROR_MESSAGES.PHISHING.ANALYSIS_FAILED
                : err.message.includes('email')
                    ? ERROR_MESSAGES.PHISHING.GENERATION_FAILED
                    : ERROR_MESSAGES.PHISHING.GENERIC;

            return {
                ...createToolErrorResponse(errorInfo),
                message: userMessage
            };
        }
    }
});

