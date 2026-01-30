/**
 * Workflow Executor – input and output schemas
 *
 * Input: workflowType-discriminated params (create / add-language / add-multiple / update).
 * Conditional requirements enforced via superRefine per workflow type.
 */

import { z } from 'zod';
import { PROMPT_ANALYSIS, MODEL_PROVIDERS } from '../../constants';

export const workflowExecutorSchema = z
  .object({
    workflowType: z
      .enum(['create-microlearning', 'add-language', 'add-multiple-languages', 'update-microlearning'])
      .describe('Which workflow to execute'),

    // Create microlearning parameters
    prompt: z
      .string()
      .min(PROMPT_ANALYSIS.MIN_PROMPT_LENGTH, `Prompt must be at least ${PROMPT_ANALYSIS.MIN_PROMPT_LENGTH} characters`)
      .max(PROMPT_ANALYSIS.MAX_PROMPT_LENGTH, `Prompt must not exceed ${PROMPT_ANALYSIS.MAX_PROMPT_LENGTH} characters`)
      .optional()
      .describe('User prompt for microlearning creation'),
    additionalContext: z
      .string()
      .max(PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH, `Additional context must not exceed ${PROMPT_ANALYSIS.MAX_ADDITIONAL_CONTEXT_LENGTH} characters`)
      .optional()
      .describe('Additional context for the microlearning'),
    customRequirements: z
      .string()
      .max(PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH, `Custom requirements must not exceed ${PROMPT_ANALYSIS.MAX_CUSTOM_REQUIREMENTS_LENGTH} characters`)
      .optional()
      .describe('Custom requirements or special requests'),
    department: z
      .string()
      .max(PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH, `Department name must not exceed ${PROMPT_ANALYSIS.MAX_DEPARTMENT_NAME_LENGTH} characters`)
      .optional()
      .describe('Target department'),
    level: z
      .enum(PROMPT_ANALYSIS.DIFFICULTY_LEVELS)
      .optional()
      .default('Intermediate')
      .describe('Content difficulty level'),
    priority: z
      .enum(PROMPT_ANALYSIS.PRIORITY_LEVELS)
      .optional()
      .default('medium'),
    language: z
      .string()
      .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
      .optional()
      .describe('Language for new microlearning content (e.g., tr-tr, en-gb)'),

    // Add language parameters
    existingMicrolearningId: z
      .string()
      .min(1, 'Microlearning ID cannot be empty')
      .max(256, 'Microlearning ID must not exceed 256 characters')
      .optional()
      .describe('ID of existing microlearning to translate'),
    targetLanguage: z
      .string()
      .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
      .optional()
      .nullable()
      .describe('Target language for translation (single language)'),
    targetLanguages: z
      .array(
        z.string().regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
      )
      .max(12, 'Maximum 12 languages allowed at once')
      .optional()
      .describe('Target languages for parallel translation (multiple languages)'),
    sourceLanguage: z
      .string()
      .regex(PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX, PROMPT_ANALYSIS.LANGUAGE_CODE_REGEX.toString())
      .optional()
      .nullable()
      .describe('Source language (optional)'),

    // Update microlearning parameters
    updates: z
      .object({
        theme: z.record(z.any()).describe('Theme updates (fontFamily, colors, logo)'),
      })
      .optional()
      .describe('Updates for update-microlearning workflow'),

    // Model override parameters (optional)
    modelProvider: z.enum(MODEL_PROVIDERS.NAMES).optional().describe('Model provider override'),
    model: z.string().optional().describe('Model name override (e.g., OPENAI_GPT_4O_MINI)'),
  })
  .superRefine((data, ctx) => {
    switch (data.workflowType) {
      case 'create-microlearning': {
        if (data.prompt === undefined || data.prompt === null || String(data.prompt).trim() === '') {
          ctx.addIssue({ code: 'custom', message: 'Prompt is required for create-microlearning', path: ['prompt'] });
        }
        break;
      }
      case 'add-language': {
        if (!data.existingMicrolearningId || String(data.existingMicrolearningId).trim() === '') {
          ctx.addIssue({ code: 'custom', message: 'existingMicrolearningId is required for add-language', path: ['existingMicrolearningId'] });
        }
        if (data.targetLanguage === undefined || data.targetLanguage === null || String(data.targetLanguage).trim() === '') {
          ctx.addIssue({ code: 'custom', message: 'targetLanguage is required for add-language', path: ['targetLanguage'] });
        }
        break;
      }
      case 'add-multiple-languages': {
        if (!data.existingMicrolearningId || String(data.existingMicrolearningId).trim() === '') {
          ctx.addIssue({ code: 'custom', message: 'existingMicrolearningId is required for add-multiple-languages', path: ['existingMicrolearningId'] });
        }
        if (!Array.isArray(data.targetLanguages) || data.targetLanguages.length === 0) {
          ctx.addIssue({ code: 'custom', message: 'targetLanguages (non-empty array) is required for add-multiple-languages', path: ['targetLanguages'] });
        }
        break;
      }
      case 'update-microlearning': {
        if (!data.existingMicrolearningId || String(data.existingMicrolearningId).trim() === '') {
          ctx.addIssue({ code: 'custom', message: 'existingMicrolearningId is required for update-microlearning', path: ['existingMicrolearningId'] });
        }
        if (!data.updates || typeof data.updates !== 'object') {
          ctx.addIssue({ code: 'custom', message: 'updates object is required for update-microlearning', path: ['updates'] });
        }
        break;
      }
    }
  });

export const workflowExecutorOutputSchema = z.object({
  success: z.boolean(),
  title: z.string().optional(),
  department: z.string().optional(),
  microlearningId: z.string().optional(),
  status: z.string().optional(),
  successCount: z.number().optional(),
  failureCount: z.number().optional(),
  languages: z.array(z.string()).optional(),
  results: z.array(z.any()).optional(),
  error: z.string().optional(),
});
