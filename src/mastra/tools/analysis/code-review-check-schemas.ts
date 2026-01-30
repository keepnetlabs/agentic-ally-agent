/**
 * Code Review Check Tool – input and output schemas
 *
 * Input: issueType, originalCode, fixedCode, language, outputLanguage, modelProvider, model.
 * Output: success, data (isCorrect, severity, feedback, …), error.
 */

import { z } from 'zod';
import { MODEL_PROVIDERS } from '../../constants';

export const CodeReviewCheckSchema = z.object({
  issueType: z
    .string()
    .max(200, 'Issue type must not exceed 200 characters')
    .describe('Type of issue to fix (e.g., "SQL Injection", "XSS", "Logic Error", "Performance Issue")'),
  originalCode: z
    .string()
    .max(100000, 'Code must not exceed 100,000 characters')
    .describe('The original code with the issue'),
  fixedCode: z
    .string()
    .max(100000, 'Code must not exceed 100,000 characters')
    .describe('The code after developer attempted to fix it'),
  language: z
    .string()
    .max(50, 'Language name must not exceed 50 characters')
    .describe('Programming language (javascript, python, java, etc.)'),
  outputLanguage: z
    .string()
    .max(10, 'Language code must not exceed 10 characters')
    .optional()
    .default('en')
    .describe('Output language for feedback, explanation and hint (e.g., "en", "tr", "de", "fr", etc.)'),
  modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider'),
  model: z
    .string()
    .max(100, 'Model name must not exceed 100 characters')
    .optional()
    .describe('Model name override'),
});

export const CodeReviewCheckOutputSchema = z.object({
  success: z.boolean(),
  data: z.object({
    isCorrect: z.boolean().describe('Whether the fix properly addresses the vulnerability'),
    severity: z.enum(['correct', 'partial', 'incorrect']).describe('How close the fix is to correct'),
    feedback: z.string().describe('Immediate 1-2 sentence feedback for learner (in requested output language)'),
    explanation: z.string().describe('Detailed explanation why correct/incorrect (in requested output language)'),
    points: z.number().min(0).max(25).describe('Points earned (0-25)'),
    hint: z.string().optional().describe('Solution-oriented hint for next attempt if incorrect (in requested output language)'),
  }),
  error: z.string().optional(),
});

export type CodeReviewCheckInput = z.infer<typeof CodeReviewCheckSchema>;
export type CodeReviewCheckOutput = z.infer<typeof CodeReviewCheckOutputSchema>;
