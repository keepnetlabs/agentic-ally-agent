import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createPhishingWorkflow } from '../workflows/create-phishing-workflow';
import { v4 as uuidv4 } from 'uuid';
import { PROMPT_ANALYSIS } from '../constants';

const phishingWorkflowSchema = z.object({
    workflowType: z.literal('create-phishing').describe('Workflow to execute'),
    topic: z.string().describe('Topic for phishing simulation (e.g. "Reset Password")'),
    targetProfile: z.object({
        name: z.string().optional(),
        department: z.string().optional(),
        behavioralTriggers: z.array(z.string()).optional(),
        vulnerabilities: z.array(z.string()).optional(),
    }).optional().describe('Target user profile for personalization'),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().default('Medium'),
    language: z.string().optional().default('en'),
    modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional(),
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
                    difficulty: params.difficulty || 'Medium',
                    language: params.language || 'en',
                    modelProvider: params.modelProvider,
                    model: params.model,
                }
            });

            console.log('🎣 Workflow Completed:', result.status);

            if (result.status === 'success' && result.result) {
                const output = result.result;

                // Stream result to frontend
                if (writer) {
                    try {
                        const messageId = uuidv4();
                        await writer.write({ type: 'text-start', id: messageId });

                        // UI event (not visible in chat - frontend should filter ::ui:: prefixes)
                        await writer.write({
                            type: 'text-delta',
                            id: messageId,
                            delta: `::ui:phishing_email::${output.bodyHtml}::/ui:phishing_email::\n`
                        });

                        await writer.write({ type: 'text-end', id: messageId });
                    } catch (err) {
                        console.error('Failed to stream phishing email:', err);
                    }
                }

                return {
                    success: true,
                    data: {
                        subject: output.subject,
                        analysis: output.analysis
                    },
                    status: 'success'
                };

            }

            throw new Error('Phishing workflow failed or produced no output');

        } catch (error) {
            console.error('❌ Phishing workflow error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
});

