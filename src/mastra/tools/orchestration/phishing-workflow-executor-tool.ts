import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createPhishingWorkflow } from '../../workflows/create-phishing-workflow';
import { uuidv4 } from '../../utils/core/id-utils';
import { PHISHING, MODEL_PROVIDERS, ERROR_MESSAGES, TIMEOUT_VALUES } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { getPolicySummary } from '../../utils/core/policy-cache';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { normalizeDifficultyValue } from '../../utils/difficulty-level-mapper';

const phishingWorkflowSchema = z.object({
    workflowType: z.literal(PHISHING.WORKFLOW_TYPE).describe('Workflow to execute'),
    topic: z.string().describe('Topic for phishing simulation (e.g. "Reset Password")'),
    isQuishing: z.boolean().optional().describe('Whether this is a quishing (QR code phishing) simulation. Set to true if user explicitly requests quishing/QR code phishing.'),
    targetProfile: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
        behavioralTriggers: z.array(z.string()).optional(),
        vulnerabilities: z.array(z.string()).optional(),
    }).optional().describe('Target user profile for personalization'),
    difficulty: z
        .preprocess((value) => normalizeDifficultyValue(value) ?? value, z.enum(PHISHING.DIFFICULTY_LEVELS))
        .optional()
        .default(PHISHING.DEFAULT_DIFFICULTY),
    language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
    method: z.enum(PHISHING.ATTACK_METHODS).optional().describe('Type of phishing attack'),
    includeEmail: z.boolean().optional().default(true).describe('Whether to generate an email'),
    includeLandingPage: z.boolean().optional().default(true).describe('Whether to generate a landing page'),
    additionalContext: z.string().optional().describe('Strategic context from Agent reasoning (e.g. "Use Authority trigger", "Focus on Fear", "Simulate CEO"). Also used for vulnerability analysis details.'),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
});

// Output schema for phishing workflow executor tool
const phishingWorkflowOutputSchema = z.object({
    success: z.boolean(),
    status: z.string().optional(),
    message: z.string().optional(),
    data: z.object({
        phishingId: z.string(),
        topic: z.string().optional(),
        language: z.string().optional(),
        difficulty: z.string().optional(),
        method: z.string().optional(),
        subject: z.string().optional(),
        fromAddress: z.string().optional(),
        fromName: z.string().optional(),
        scenario: z.string().optional(),
        category: z.string().optional(),
        psychologicalTriggers: z.array(z.string()).optional(),
        keyRedFlags: z.array(z.string()).optional(),
        targetAudience: z.any().optional(),
    }).optional(),
    error: z.string().optional(),
});

export const phishingWorkflowExecutorTool = createTool({
    id: 'phishing-workflow-executor',
    description: 'Execute phishing simulation generation workflows',
    inputSchema: phishingWorkflowSchema,
    outputSchema: phishingWorkflowOutputSchema,

    execute: async ({ context, writer }) => {
        const params = context;
        const logger = getLogger('PhishingWorkflowExecutor');

        try {
            logger.info('Starting Phishing Workflow', { topic: params.topic });

            // Get cached policy summary ONCE at workflow start
            logger.info('Getting policy summary for workflow');
            const policyContext = await getPolicySummary();
            logger.info('Policy summary ready', { hasContent: !!policyContext, length: policyContext.length });

            const workflow = createPhishingWorkflow;
            const run = await workflow.createRunAsync();

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
                if (writer) {
                    try {
                        // Wait to let reasoning streams finish and build anticipation
                        // This ensures the UI component appears AT THE END, after all reasoning logs
                        await new Promise(resolve => setTimeout(resolve, TIMEOUT_VALUES.PHISHING_WORKFLOW_STREAM_DELAY_MS));

                        const messageId = uuidv4();
                        await writer.write({ type: 'text-start', id: messageId });

                        const normalizedLanguage = (params.language || 'en-gb').toLowerCase();
                        const emailKey = `phishing:${output.phishingId}:email:${normalizedLanguage}`;
                        const landingKey = `phishing:${output.phishingId}:landing:${normalizedLanguage}`;

                        // 1. Email Preview (if exists) - Single object encoding
                        if (output.template) {
                            // Encode entire email object as JSON string
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
                                type: 'text-delta',
                                id: messageId,
                                delta: `::ui:phishing_email::${encodedEmail}::/ui:phishing_email::\n`
                            });
                        }

                        // 2. Landing Page (if exists) - Single object encoding
                        if (output.landingPage && output.landingPage.pages.length > 0) {
                            // Encode entire landingPage object as JSON string
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
                                type: 'text-delta',
                                id: messageId,
                                delta: `::ui:landing_page::${encodedLandingPage}::/ui:landing_page::\n`
                            });
                        }

                        await writer.write({ type: 'text-end', id: messageId });
                    } catch (err) {
                        const error = err instanceof Error ? err : new Error(String(err));
                        logger.error('Failed to stream phishing email', { error: error.message, stack: error.stack });
                    }
                }

                const toolResult = {
                    success: true,
                    status: 'success',
                    message: '[SUCCESS] Phishing simulation generated successfully. Phishing ID: ' + output.phishingId + '. **STOP - Do NOT call this tool again. The simulation is complete.**',
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
                        message: '[ERROR] Phishing workflow result validation failed.'
                    };
                }

                return validation.data;

            }

            // Workflow succeeded but no result
            logger.error('Phishing workflow produced no output', {});
            return {
                success: false,
                error: ERROR_MESSAGES.PHISHING.NO_OUTPUT,
                message: '[ERROR] Phishing workflow completed but produced no output. Do NOT retry - check logs for details.'
            };

        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                topic: context?.topic,
                difficulty: context?.difficulty,
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

