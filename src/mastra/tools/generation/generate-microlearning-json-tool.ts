import { Tool } from '@mastra/core/tools';
import { z } from 'zod';
import { PromptAnalysis } from '../../types/prompt-analysis';
import { LanguageModelSchema } from '../../types/language-model';
import { getLogger } from '../../utils/core/logger';
import { errorService } from '../../services/error-service';
import { normalizeError, createToolErrorResponse, logErrorInfo } from '../../utils/core/error-utils';
import { generateMicrolearningJsonWithAI } from './utils/microlearning-generator';

const GenerateMicrolearningJsonSchema = z.object({
  analysis: z.object({
    title: z.string().max(500, 'Title must not exceed 500 characters'),
    category: z.string().max(200, 'Category must not exceed 200 characters'),
    subcategory: z.string().max(200, 'Subcategory must not exceed 200 characters'),
    industries: z.array(z.string().max(200)),
    department: z.string().max(200, 'Department must not exceed 200 characters'),
    roles: z.array(z.string().max(200)),
    regulationCompliance: z.array(z.string().max(200)).optional(),
    topic: z.string().max(500, 'Topic must not exceed 500 characters'),
    level: z.string().max(50, 'Level must not exceed 50 characters'),
    language: z.string().max(10, 'Language code must not exceed 10 characters'),
    learningObjectives: z.array(z.string().max(1000)),
    duration: z.number(),
    additionalContext: z.string()
      .max(5000, 'Additional context must not exceed 5000 characters')
      .optional().describe('User context, vulnerabilities, or specific requirements'),
  }),
  microlearningId: z.string().max(256, 'Microlearning ID must not exceed 256 characters'),
  model: LanguageModelSchema,
  policyContext: z.string()
    .max(10000, 'Policy context must not exceed 10000 characters')
    .optional().describe('Company policy context'),
});

const GenerateMicrolearningJsonOutputSchema = z.object({
  success: z.boolean(),
  data: z.any(), // MicrolearningContent - using z.any() for flexibility with complex nested structure
  error: z.string().optional(),
});

export const generateMicrolearningJsonTool = new Tool({
  id: 'generate_microlearning_json',
  description: 'Generate complete microlearning JSON structure with AI-enhanced metadata and content',
  inputSchema: GenerateMicrolearningJsonSchema,
  outputSchema: GenerateMicrolearningJsonOutputSchema,
  execute: async (context: any) => {
    const input = context?.inputData || context?.input || context;
    const { analysis, microlearningId, model, policyContext } = input;
    const logger = getLogger('GenerateMicrolearningJsonTool');

    try {
      const result = await generateMicrolearningJsonWithAI(analysis, microlearningId, model, policyContext);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      const err = normalizeError(error);
      const errorInfo = errorService.aiModel(err.message, {
        microlearningId,
        step: 'json-generation',
        stack: err.stack
      });

      logErrorInfo(logger, 'error', 'JSON generation failed', errorInfo);

      return {
        ...createToolErrorResponse(errorInfo),
        data: null
      };
    }
  },
});


export type GenerateMicrolearningJsonInput = z.infer<typeof GenerateMicrolearningJsonSchema>;
export type GenerateMicrolearningJsonOutput = z.infer<typeof GenerateMicrolearningJsonOutputSchema>;