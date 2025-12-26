import { z } from 'zod';
import { StreamWriterSchema } from '../types/stream-writer';
import { LanguageModelSchema } from '../types/language-model';

export const GenerateLanguageJsonSchema = z.object({
  analysis: z.object({
    language: z.string(),
    topic: z.string(),
    title: z.string(),
    department: z.string(),
    level: z.string(),
    category: z.string(),
    subcategory: z.string(),
    learningObjectives: z.array(z.string()),
    duration: z.number(),
    industries: z.array(z.string()),
    roles: z.array(z.string()),
    keyTopics: z.array(z.string()),
    practicalApplications: z.array(z.string()),
    assessmentAreas: z.array(z.string()),
    regulationCompliance: z.array(z.string()).optional(),
    hasRichContext: z.boolean().optional(),
    additionalContext: z.string().optional(),
    customRequirements: z.string().optional(),
  }),
  microlearning: z.any(),
  model: LanguageModelSchema,
  writer: StreamWriterSchema.optional(),
  policyContext: z.string().optional().describe('Company policy context'),
});

export const GenerateLanguageJsonOutputSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type GenerateLanguageJsonInput = z.infer<typeof GenerateLanguageJsonSchema>;
export type GenerateLanguageJsonOutput = z.infer<typeof GenerateLanguageJsonOutputSchema>;