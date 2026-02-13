import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createSmishingWorkflow } from '../../workflows/create-smishing-workflow';
import { uuidv4 } from '../../utils/core/id-utils';
import { SMISHING, MODEL_PROVIDERS, ERROR_MESSAGES, PROMPT_ANALYSIS } from '../../constants';
import { getLogger } from '../../utils/core/logger';
import { getPolicySummary } from '../../utils/core/policy-cache';
import { errorService } from '../../services/error-service';
import { validateToolResult } from '../../utils/tool-result-validation';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { normalizeDifficultyValue } from '../../utils/difficulty-level-mapper';

const smishingWorkflowSchema = z.object({
    workflowType: z.literal(SMISHING.WORKFLOW_TYPE).describe('Workflow to execute'),
    topic: z.string().describe('Topic for smishing simulation (e.g. "Delivery Update")'),
    targetProfile: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
        behavioralTriggers: z.array(z.string()).optional(),
        vulnerabilities: z.array(z.string()).optional(),
    }).optional().describe('Target user profile for personalization'),
    difficulty: z
        .preprocess((value) => normalizeDifficultyValue(value) ?? value, z.enum(SMISHING.DIFFICULTY_LEVELS))
        .optional()
        .default(SMISHING.DEFAULT_DIFFICULTY),
    language: z
        .string()
        .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
        .optional()
        .default('en-gb')
        .describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
    method: z.enum(SMISHING.ATTACK_METHODS).optional().default(SMISHING.DEFAULT_ATTACK_METHOD).describe('Type of smishing attack'),
    includeSms: z.boolean().optional().default(true).describe('Whether to generate SMS templates'),
    includeLandingPage: z.boolean().optional().default(true).describe('Whether to generate a landing page'),
    additionalContext: z.string().optional().describe('Strategic context from Agent reasoning for targeted smishing'),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
});

const smishingWorkflowOutputSchema = z.object({
    success: z.boolean(),
    status: z.string().optional(),
    message: z.string().optional(),
    data: z.object({
        smishingId: z.string(),
        topic: z.string().optional(),
        language: z.string().optional(),
        difficulty: z.string().optional(),
        method: z.string().optional(),
        scenario: z.string().optional(),
        category: z.string().optional(),
        psychologicalTriggers: z.array(z.string()).optional(),
        keyRedFlags: z.array(z.string()).optional(),
        targetAudience: z.any().optional(),
    }).optional(),
    error: z.string().optional(),
});

export const smishingWorkflowExecutorTool = createTool({
    id: 'smishing-workflow-executor',
    description: 'Execute smishing (SMS) simulation generation workflows',
    inputSchema: smishingWorkflowSchema,
    outputSchema: smishingWorkflowOutputSchema,

    execute: async ({ context, writer }) => {
        const params = context;
        const logger = getLogger('SmishingWorkflowExecutor');

        try {
            logger.info('Starting Smishing Workflow', { topic: params.topic });

            logger.info('Getting policy summary for workflow');
            const policyContext = await getPolicySummary();
            logger.info('Policy summary ready', { hasContent: !!policyContext, length: policyContext.length });

            const workflow = createSmishingWorkflow;
            const run = await workflow.createRunAsync();

            const result = await run.start({
                inputData: {
                    topic: params.topic,
                    targetProfile: params.targetProfile,
                    difficulty: params.difficulty || SMISHING.DEFAULT_DIFFICULTY,
                    language: params.language || 'en-gb',
                    method: params.method,
                    includeSms: params.includeSms,
                    includeLandingPage: params.includeLandingPage,
                    additionalContext: params.additionalContext,
                    modelProvider: params.modelProvider,
                    model: params.model,
                    writer: writer,
                    policyContext: policyContext || undefined
                }
            });

            logger.info('Workflow Completed', { status: result.status });

            if (result.status === 'success' && result.result) {
                const output = result.result;

                // Stream result to frontend
                if (writer) {
                    try {
                        const messageId = uuidv4();
                        await writer.write({ type: 'text-start', id: messageId });

                        const normalizedLanguage = (params.language || 'en-gb').toLowerCase();
                        const smsKey = `smishing:${output.smishingId}:sms:${normalizedLanguage}`;
                        const landingKey = `smishing:${output.smishingId}:landing:${normalizedLanguage}`;

                        if (output.messages && Array.isArray(output.messages) && output.messages.length > 0) {
                            const smsObject = {
                                smishingId: output.smishingId,
                                smsKey,
                                language: normalizedLanguage,
                                messages: output.messages,
                            };
                            const smsJson = JSON.stringify(smsObject);
                            const encodedSms = Buffer.from(smsJson).toString('base64');

                            await writer.write({
                                type: 'text-delta',
                                id: messageId,
                                delta: `::ui:smishing_sms::${encodedSms}::/ui:smishing_sms::\n`
                            });
                        }

                        if (output.landingPage && output.landingPage.pages && output.landingPage.pages.length > 0) {
                            const landingPageObject = {
                                smishingId: output.smishingId,
                                landingKey,
                                language: normalizedLanguage,
                                ...output.landingPage,
                            };
                            const landingPageJson = JSON.stringify(landingPageObject);
                            const encodedLandingPage = Buffer.from(landingPageJson).toString('base64');

                            await writer.write({
                                type: 'text-delta',
                                id: messageId,
                                delta: `::ui:smishing_landing_page::${encodedLandingPage}::/ui:smishing_landing_page::\n`
                            });
                        }

                        await writer.write({ type: 'text-end', id: messageId });
                    } catch (err) {
                        const error = err instanceof Error ? err : new Error(String(err));
                        const errorInfo = errorService.external(error.message, {
                            step: 'stream-smishing-result',
                            stack: error.stack,
                        });
                        logErrorInfo(logger, 'error', 'Failed to stream smishing simulation', errorInfo);
                    }
                }

                const toolResult = {
                    success: true,
                    status: 'success',
                    message: '[SUCCESS] Smishing simulation generated successfully. Smishing ID: ' + output.smishingId + '. **STOP - Do NOT call this tool again. The simulation is complete.**',
                    data: {
                        smishingId: output.smishingId,
                        topic: params.topic,
                        language: params.language,
                        difficulty: params.difficulty,
                        method: output.analysis?.method,
                        scenario: output.analysis?.scenario,
                        category: output.analysis?.category,
                        psychologicalTriggers: output.analysis?.psychologicalTriggers,
                        keyRedFlags: output.analysis?.keyRedFlags,
                        targetAudience: output.analysis?.targetAudienceAnalysis,
                    }
                };

                const validation = validateToolResult(toolResult, smishingWorkflowOutputSchema, 'smishing-workflow-executor');
                if (!validation.success) {
                    logErrorInfo(logger, 'error', 'Smishing workflow result validation failed', validation.error);
                    return {
                        ...createToolErrorResponse(validation.error),
                        message: ERROR_MESSAGES.SMISHING.GENERIC
                    };
                }

                return validation.data;
            }

            logger.error('Smishing workflow produced no output', {});
            const errorInfo = errorService.external(ERROR_MESSAGES.SMISHING.NO_OUTPUT, {
                step: 'smishing-workflow-output-validation',
            });
            return {
                ...createToolErrorResponse(errorInfo),
                message: ERROR_MESSAGES.SMISHING.NO_OUTPUT
            };
        } catch (error) {
            const err = normalizeError(error);
            const errorInfo = errorService.external(err.message, {
                topic: context?.topic,
                difficulty: context?.difficulty,
                step: 'smishing-workflow-execution',
                stack: err.stack
            });

            logErrorInfo(logger, 'error', 'Smishing workflow error', errorInfo);

            const userMessage = err.message.includes('analysis')
                ? ERROR_MESSAGES.SMISHING.ANALYSIS_FAILED
                : err.message.includes('sms')
                    ? ERROR_MESSAGES.SMISHING.GENERATION_FAILED
                    : ERROR_MESSAGES.SMISHING.GENERIC;

            return {
                ...createToolErrorResponse(errorInfo),
                message: userMessage
            };
        }
    }
});

