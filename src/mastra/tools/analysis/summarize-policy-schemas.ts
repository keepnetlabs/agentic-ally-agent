/**
 * Summarize Policy Tool – input and output schemas
 *
 * Input: question, focusArea, language, modelProvider, model.
 * Output: success, data (question, summary, key_points, …), error.
 */

import { z } from 'zod';

export const summarizePolicySchema = z.object({
  question: z
    .string()
    .min(1, 'Question about company policy is required')
    .max(5000, 'Question must not exceed 5000 characters'),
  focusArea: z
    .string()
    .max(200, 'Focus area must not exceed 200 characters')
    .optional()
    .describe('Optional focus area (e.g., "phishing", "password", "data protection")'),
  language: z
    .string()
    .max(10, 'Language code must not exceed 10 characters')
    .optional()
    .default('en')
    .describe('Target language for summary (BCP-47 code)'),
  modelProvider: z.enum(['OPENAI', 'WORKERS_AI', 'GOOGLE']).optional(),
  model: z
    .string()
    .max(100, 'Model name must not exceed 100 characters')
    .optional(),
});

export const summarizePolicyOutputSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      question: z.string(),
      summary: z.string().describe('1-2 paragraph executive summary of the relevant policy section'),
      key_points: z.array(z.string()).describe('3-5 key takeaways from the policy'),
      recommendations: z.array(z.string()).describe('Actionable recommendations based on the policy'),
      relevant_sections: z.array(z.string()).optional().describe('Names of relevant policy sections found'),
    })
    .optional(),
  error: z.string().optional(),
});
