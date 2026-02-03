import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createSmishingWorkflow } from '../../workflows/create-smishing-workflow';
import { SMISHING, MODEL_PROVIDERS, ERROR_MESSAGES } from '../../constants';
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
    language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
    method: z.enum(SMISHING.ATTACK_METHODS).optional().describe('Type of smishing attack'),
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
                    language: params.language || 'en',
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

                const toolResult = {
                    success: true,
                    status: 'success',
                    message: '✅ Smishing simulation generated successfully. Smishing ID: ' + output.smishingId + '. **STOP - Do NOT call this tool again. The simulation is complete.**',
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
                    logger.error('Smishing workflow result validation failed', { code: validation.error.code, message: validation.error.message });
                    return {
                        success: false,
                        error: JSON.stringify(validation.error),
                        message: '❌ Smishing workflow result validation failed.'
                    };
                }

                return validation.data;
            }

            logger.error('Smishing workflow produced no output', {});
            return {
                success: false,
                error: ERROR_MESSAGES.WORKFLOW.EXECUTION_FAILED,
                message: '❌ Smishing workflow completed but produced no output. Do NOT retry - check logs for details.'
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
                ? ERROR_MESSAGES.PHISHING.ANALYSIS_FAILED
                : err.message.includes('sms')
                    ? ERROR_MESSAGES.PHISHING.GENERATION_FAILED
                    : ERROR_MESSAGES.PHISHING.GENERIC;

            return {
                ...createToolErrorResponse(errorInfo),
                message: userMessage
            };
        }
    }
});
