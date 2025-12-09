import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createPhishingWorkflow } from '../workflows/create-phishing-workflow';
import { v4 as uuidv4 } from 'uuid';
import { PHISHING, MODEL_PROVIDERS, ERROR_MESSAGES } from '../constants';

const phishingWorkflowSchema = z.object({
    workflowType: z.literal(PHISHING.WORKFLOW_TYPE).describe('Workflow to execute'),
    topic: z.string().describe('Topic for phishing simulation (e.g. "Reset Password")'),
    targetProfile: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
        behavioralTriggers: z.array(z.string()).optional(),
        vulnerabilities: z.array(z.string()).optional(),
    }).optional().describe('Target user profile for personalization'),
    difficulty: z.enum(PHISHING.DIFFICULTY_LEVELS).optional().default(PHISHING.DEFAULT_DIFFICULTY),
    language: z.string().optional().default('en-gb').describe('Target language (BCP-47 code, e.g. en-gb, tr-tr)'),
    method: z.enum(PHISHING.ATTACK_METHODS).optional().describe('Type of phishing attack'),
    includeEmail: z.boolean().optional().default(true).describe('Whether to generate an email'),
    includeLandingPage: z.boolean().optional().default(true).describe('Whether to generate a landing page'),
    additionalContext: z.string().optional().describe('User behavior context / vulnerability analysis for targeted phishing'),
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional(),
    model: z.string().optional(),
});

export const phishingWorkflowExecutorTool = createTool({
    id: 'phishing-workflow-executor',
    description: 'Execute phishing simulation generation workflows',
    inputSchema: phishingWorkflowSchema,

    execute: async ({ context, writer }) => {
        const { workflowType, ...params } = context;

        try {
            console.log('🎣 Starting Phishing Workflow:', params.topic);

            const workflow = createPhishingWorkflow;
            const run = await workflow.createRunAsync();

            const result = await run.start({
                inputData: {
                    topic: params.topic,
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
                }
            });

            console.log('🎣 Workflow Completed:', result.status);

            if (result.status === 'success' && result.result) {
                const output = result.result;

                // Stream result to frontend
                if (writer) {
                    try {
                        // Wait 3 seconds to let reasoning streams finish and build anticipation
                        // This ensures the UI component appears AT THE END, after all reasoning logs
                        await new Promise(resolve => setTimeout(resolve, 3000));

                        const messageId = uuidv4();
                        await writer.write({ type: 'text-start', id: messageId });

                        // 1. Email Preview (if exists) - Single object encoding
                        if (output.template) {
                            // Encode entire email object as JSON string
                            const emailObject = {
                                subject: output.subject,
                                template: output.template,
                                fromAddress: output.fromAddress,
                                fromName: output.fromName,
                                method: output.analysis?.method,
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
                            const landingPageJson = JSON.stringify(output.landingPage);
                            const encodedLandingPage = Buffer.from(landingPageJson).toString('base64');

                            await writer.write({
                                type: 'text-delta',
                                id: messageId,
                                delta: `::ui:landing_page::${encodedLandingPage}::/ui:landing_page::\n`
                            });
                        }

                        await writer.write({ type: 'text-end', id: messageId });
                    } catch (err) {
                        console.error('Failed to stream phishing email:', err);
                    }
                }

                return {
                    success: true,
                    status: 'success',
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

            }

            // Workflow succeeded but no result
            console.error('❌ Phishing workflow produced no output');
            return {
                success: false,
                error: ERROR_MESSAGES.PHISHING.NO_OUTPUT
            };

        } catch (error) {
            console.error('❌ Phishing workflow error:', error);

            // User-friendly error message
            const userMessage = error instanceof Error && error.message.includes('analysis')
                ? ERROR_MESSAGES.PHISHING.ANALYSIS_FAILED
                : error instanceof Error && error.message.includes('email')
                    ? ERROR_MESSAGES.PHISHING.GENERATION_FAILED
                    : ERROR_MESSAGES.PHISHING.GENERIC;

            return {
                success: false,
                error: userMessage
            };
        }
    }
});

