import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { getPolicySummary } from '../../utils/core/policy-cache';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { validateToolResult } from '../../utils/tool-result-validation';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { withRetry } from '../../utils/core/resilience-utils';

const logger = getLogger('SummarizePolicyTool');

const summarizePolicySchema = z.object({
  question: z.string()
    .min(1, 'Question about company policy is required')
    .max(5000, 'Question must not exceed 5000 characters'),
  focusArea: z.string()
    .max(200, 'Focus area must not exceed 200 characters')
    .optional().describe('Optional focus area (e.g., "phishing", "password", "data protection")'),
  language: z.string()
    .max(10, 'Language code must not exceed 10 characters')
    .optional().default('en').describe('Target language for summary (BCP-47 code)'),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional(),
  model: z.string()
    .max(100, 'Model name must not exceed 100 characters')
    .optional(),
});

const summarizePolicyOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    question: z.string(),
    summary: z.string().describe('1-2 paragraph executive summary of the relevant policy section'),
    key_points: z.array(z.string()).describe('3-5 key takeaways from the policy'),
    recommendations: z.array(z.string()).describe('Actionable recommendations based on the policy'),
    relevant_sections: z.array(z.string()).optional().describe('Names of relevant policy sections found'),
  }).optional(),
  error: z.string().optional(),
});

export const summarizePolicyTool = createTool({
  id: 'summarize-policy',
  description: 'Summarize company policies based on a specific question or focus area',
  inputSchema: summarizePolicySchema,
  outputSchema: summarizePolicyOutputSchema,

  execute: async ({ context }) => {
    const { question, focusArea, language, modelProvider, model } = context;

    try {
      logger.info('Starting policy summarization', { questionLength: question.length, focusArea });

      // Get cached policy summary (fetches and caches on first call)
      logger.debug('Getting policy summary (cached)');
      const policySummary = await getPolicySummary();

      if (!policySummary || policySummary.trim().length === 0) {
        const errorInfo = errorService.validation('No company policies found or policies are empty');
        logErrorInfo(logger, 'warn', 'Policy context empty', errorInfo);
        return createToolErrorResponse(errorInfo);
      }

      logger.debug('Policy summary retrieved', { policyLength: policySummary.length });

      const systemPrompt = `You are a Security Policy Expert. Your task is to:
1. Read the provided company policy
2. Answer the user's specific question about the policy
3. Extract key points and actionable recommendations

IMPORTANT:
- Focus on ONLY the relevant sections of the policy
- If the policy doesn't address the question, say so clearly
- Keep summaries concise but complete
- Be practical with recommendations (not theoretical)
- Always respond in valid JSON only, no markdown or extra text

LANGUAGE: Respond in ${language || 'English'}
`;

      const userPrompt = `COMPANY POLICY SUMMARY (comprehensive, all areas):
${policySummary}

---

USER QUESTION: ${question}
${focusArea ? `\nFOCUS AREA: ${focusArea}` : ''}

---

TASK: Summarize the relevant policy sections that address this question. Provide:
1. A clear, concise summary (1-2 paragraphs)
2. Key points (list 3-5 most important takeaways)
3. Recommendations (list 2-4 actionable recommendations based on the policy)
4. Relevant sections (list any specific policy section names mentioned)

Return ONLY a valid JSON object with this structure (no markdown, no extra text):
{
  "question": "the user's question",
  "summary": "executive summary here",
  "key_points": ["point 1", "point 2", "point 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "relevant_sections": ["section name 1", "section name 2"]
}`;

      const modelToUse = getModelWithOverride(modelProvider as any, model);

      const { text } = await withRetry(
        () => generateText({
          model: modelToUse,
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.7,
        }),
        `[SummarizePolicyTool] policy-summary-${focusArea || 'general'}`
      );

      logger.debug('Policy summary generated', { textLength: text.length });

      const cleanedJson = cleanResponse(text, 'policy-summary');
      const parsed = JSON.parse(cleanedJson);

      const toolResult = {
        success: true,
        data: {
          question,
          summary: parsed.summary || '',
          key_points: parsed.key_points || [],
          recommendations: parsed.recommendations || [],
          relevant_sections: parsed.relevant_sections,
        },
      };

      // Validate result against output schema
      const validation = validateToolResult(toolResult, summarizePolicyOutputSchema, 'summarize-policy');
      if (!validation.success) {
        logger.error('Policy summary result validation failed', { code: validation.error.code, message: validation.error.message });
        return {
          success: false,
          error: JSON.stringify(validation.error),
        };
      }

      return validation.data;
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.external(err.message, {
        question: context?.question,
        focusArea: context?.focusArea,
        step: 'policy-summarization',
        stack: err.stack,
      });

      logErrorInfo(logger, 'error', 'Policy summarization failed', errorInfo);

      return {
        success: false,
        error: errorInfo.message,
      };
    }
  },
});
