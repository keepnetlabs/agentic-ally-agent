import { Tool } from '@mastra/core/tools';
import { getModelWithOverride } from '../../model-providers';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { analyzeUserPromptWithAI, getFallbackAnalysis } from './utils/prompt-analyzer';
import { AnalyzeUserPromptSchema, AnalyzeUserPromptOutputSchema } from './analyze-user-prompt-schemas';

export type { AnalyzeUserPromptInput, AnalyzeUserPromptOutput } from './analyze-user-prompt-schemas';

export const analyzeUserPromptTool = new Tool({
  id: 'analyze_user_prompt',
  description: 'AI-powered analysis of user prompt with rich context processing and semantic hints',
  inputSchema: AnalyzeUserPromptSchema,
  outputSchema: AnalyzeUserPromptOutputSchema,
  execute: async (context: any) => {
    const logger = getLogger('AnalyzeUserPromptTool');
    const input = context?.inputData || context?.input || context;
    const { userPrompt, additionalContext, suggestedDepartment, customRequirements, modelProvider, model: modelOverride, policyContext, suggestedLevel, suggestedLanguage } = input;
    const writer = input?.writer; // Get writer for streaming

    const model = getModelWithOverride(modelProvider, modelOverride);

    logger.debug('Starting user prompt analysis', { promptLength: userPrompt.length, hasContext: !!additionalContext });

    try {
      return await analyzeUserPromptWithAI({
        userPrompt,
        additionalContext,
        suggestedDepartment,
        suggestedLevel,
        customRequirements,
        suggestedLanguage,
        policyContext,
        model,
        writer
      });
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        userPrompt: userPrompt?.substring(0, 100),
        step: 'prompt-analysis',
        stack: err.stack
      });
      logErrorInfo(logger, 'error', 'Prompt analysis failed, using fallback', errorInfo);

      const fallbackData = await getFallbackAnalysis({
        userPrompt,
        suggestedDepartment,
        additionalContext,
        customRequirements,
        model
      });

      return {
        success: true,
        data: fallbackData,
        policyContext,
        error: JSON.stringify(errorInfo)
      };
    }
  },
});