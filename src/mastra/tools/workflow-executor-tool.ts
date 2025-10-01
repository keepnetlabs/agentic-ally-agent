import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { createMicrolearningWorkflow } from '../workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from '../workflows/add-language-workflow';
import { getModel, Model, ModelProvider } from '../model-providers';

// Tool için schema
const workflowExecutorSchema = z.object({
  workflowType: z.enum(['create-microlearning', 'add-language']).describe('Which workflow to execute'),

  // Create microlearning parameters
  prompt: z.string().optional().describe('User prompt for microlearning creation'),
  additionalContext: z.string().optional().describe('Additional context for the microlearning'),
  department: z.string().optional().describe('Target department'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),

  // Add language parameters  
  existingMicrolearningId: z.string().optional().describe('ID of existing microlearning to translate'),
  targetLanguage: z.string().optional().nullable().describe('Target language for translation'),
  sourceLanguage: z.string().optional().nullable().describe('Source language (optional)'),
});

export const workflowExecutorTool = createTool({
  id: 'workflow-executor',
  description: 'Execute microlearning workflows with streaming progress updates',
  inputSchema: workflowExecutorSchema,

  execute: async ({ context, writer }) => {
    const { workflowType, ...params } = context;

    try {
      if (workflowType === 'create-microlearning') {
        if (!params.prompt) {
          throw new Error('Prompt is required for create-microlearning workflow');
        }


        // Workflow'u başlat
        const workflow = createMicrolearningWorkflow;
        const run = await workflow.createRunAsync();
                /*
        // Context ve reasoning için değişkenler
        const model = getModel(ModelProvider.OPENAI, Model.OPENAI_GPT_5_NANO);

        // Context tracking için
        let workflowContext = {
          userPrompt: params.prompt,
          department: params.department || 'All',
          stepHistory: [] as Array<{ stepId: string, output: any, reasoning: string }>
        };
        // Watch API ile progress tracking ve AI reasoning
        const unwatch = run.watch((event) => {
          if (event.type === 'watch') {
            const currentStep = event.payload?.currentStep;
            if (currentStep) {
              const stepId = currentStep.id;
              const status = currentStep.status;

              if (status === 'running') {
                // Step başladığında AI reasoning
                const reasoningPrompt = `Creating training for: "${params.prompt}"

Write a brief, friendly explanation of what step "${stepId}" does:
- Keep it SHORT (max 15 words)
- Use simple language
- Start with an emoji
- Same language as user's request
- Focus on the benefit

Examples:
- "📋 Analyzing your needs to create the perfect training level"
- "🎯 Building interactive content that matches your team's skills"
- "📚 Creating scenarios your employees will actually encounter"`;

                generateText({
                  model: model,
                  messages: [
                    { role: 'system', content: 'You are explaining workflow steps to the user. Be concise, clear, and use the same language as their original request.' },
                    { role: 'user', content: reasoningPrompt }
                  ]
                }).then(async (reasoning) => {
                  await writer?.write({
                    type: 'text-start',
                  });
                  await writer?.write({
                    type: 'text-delta',
                    delta: `🔄 ${reasoning.text}\n`
                  });
                  await writer?.write({
                    type: 'text-end',
                  });
                }).catch(async (error) => {
                  await writer?.write({
                    type: 'text-start',
                  });
                  await writer?.write({
                    type: 'text-delta',
                    delta: `🔄 **Step starting:** ${stepId}`
                  });
                  await writer?.write({
                    type: 'text-end',
                  });
                });

              } else if (status === 'success') {
                // Step tamamlandığında AI summary
                const stepOutput = currentStep.output;

                const summaryPrompt = `Training: "${params.prompt}"

Step "${stepId}" finished. Write a SHORT completion message:
- MAX 20 words total
- Start with ✅ 
- Explain what was decided and why it helps
- Same language as user's request
- Be specific and actionable

Examples:
- "✅ Set beginner level - simpler content helps your team learn faster"
- "✅ Added real email examples - practice with actual threats builds confidence" 
- "✅ Created 8 quick lessons - bite-sized learning improves retention"`;

                generateText({
                  model: model,
                  messages: [
                    { role: 'system', content: 'You are providing step completion summaries. Be specific about what was accomplished and what was discovered. Use the same language as the user\'s original request.' },
                    { role: 'user', content: summaryPrompt }
                  ]
                }).then(async (summary) => {
                  // Context'e ekle
                  workflowContext.stepHistory.push({
                    stepId: stepId,
                    output: stepOutput,
                    reasoning: summary.text
                  });

                  await writer?.write({
                    type: 'text-start',
                  });
                  await writer?.write({
                    type: 'text-delta',
                    delta: `${summary.text}\n`
                  });
                  await writer?.write({
                    type: 'text-end',
                  });
                }).catch(async (error) => {
                  await writer?.write({
                    type: 'text-start',
                  });
                  await writer?.write({
                    type: 'text-delta',
                    delta: `✅ **Step ${stepId}** completed successfully`
                  });
                  await writer?.write({
                    type: 'text-end',
                  });
                });
              }
            }
          }
        });
        */

        // Workflow'u başlat - let it fail if it fails
        const workflowResult = await run.start({
          inputData: {
            prompt: params.prompt!,
            additionalContext: params.additionalContext,
            department: params.department || 'All',
            priority: params.priority || 'medium'
          }
        });

        // Watch'ı temizle
        //unwatch();

        // Extract info from result - simple fallback approach
        let trainingUrl = 'URL not available';
        let title = params.prompt?.slice(0, 50) || 'microlearning';
        let department = 'specified department';
        let microlearningId = 'ID not available';

        console.log('🔍 Workflow result:', workflowResult);
        // Try to extract data from workflow result
        if (workflowResult.status === 'success' && workflowResult.result?.metadata) {
          try {
            trainingUrl = workflowResult.result.metadata.trainingUrl || trainingUrl;
            title = workflowResult.result.metadata.title || title;
            department = workflowResult.result.metadata.department || department;
            microlearningId = workflowResult.result.metadata.microlearningId || microlearningId;
          } catch (error) {
            console.warn('Could not extract workflow result data:', error);
          }
        }

        // Emit a custom UI signal for FE to open a canvas
        // Frontend can listen for lines starting with "::ui:canvas_open::" and use the raw URL payload
        try {
          await writer?.write({ type: 'text-start' });
          await writer?.write({
            type: 'text-delta',
            delta: `::ui:canvas_open::${trainingUrl}\n`
          });
          await writer?.write({ type: 'text-end' });
          console.log('URL sent to frontend:', trainingUrl);
        } catch { }

        return {
          success: true,
          title,
          department,
          microlearningId,
          status: 'success'
        };

      } else if (workflowType === 'add-language') {
        if (!params.existingMicrolearningId || !params.targetLanguage) {
          throw new Error('existingMicrolearningId and targetLanguage are required for add-language workflow');
        }

        const workflow = addLanguageWorkflow;
        const run = await workflow.createRunAsync();

        const result = await run.start({
          inputData: {
            existingMicrolearningId: params.existingMicrolearningId!,
            department: params.department || 'All',
            targetLanguage: params.targetLanguage!,
            sourceLanguage: params.sourceLanguage || 'en'
          }
        });

        // Extract trainingUrl from result and send to frontend
        const trainingUrl = result?.status === 'success' ? result.result?.data?.trainingUrl : null;
        const title = result?.status === 'success' ? result.result?.data?.title : null;
        console.log('🔍 Training URL for translated:', trainingUrl);
        if (trainingUrl) {
          try {
            await writer?.write({ type: 'text-start' });
            await writer?.write({
              type: 'text-delta',
              delta: `::ui:canvas_open::${trainingUrl}\n`
            });
            await writer?.write({ type: 'text-end' });
            console.log('URL sent to frontend:', trainingUrl);
          } catch (error) {
            console.error('Failed to send URL to frontend:', error);
          }
        }

        return {
          success: true,
          department: params.department || 'All',
          title: title || 'Microlearning',
          status: 'success'
        };

      } else {
        throw new Error(`Unknown workflow type: ${workflowType}`);
      }

    } catch (error) {
      // Send error message to frontend
      try {
        await writer?.write({ type: 'text-start' });
        await writer?.write({
          type: 'text-delta',
          delta: `❌ Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`
        });
        await writer?.write({ type: 'text-end' });
      } catch (writeError) {
        console.error('Failed to send error message:', writeError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
});