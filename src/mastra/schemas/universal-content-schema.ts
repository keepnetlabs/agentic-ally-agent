import { z } from 'zod';

export const UniversalMicrolearningInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  department: z.string().optional().default('All'),
  additionalContext: z.string().optional(),
  customRequirements: z.string().optional(),
});

export const UniversalMicrolearningOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    microlearningId: z.string(),
    title: z.string(),
    microlearningMetadata: z.any(),
    detectedLanguage: z.string(),
    languageContent: z.any(),
    languageFilePath: z.string(),
    targetDepartment: z.string(),
    trainingUrl: z.string(),
    filesGenerated: z.array(z.string()),
  }).optional(),
  pipeline_summary: z.object({
    step1_prompt_analysis: z.object({
      detected_language: z.string(),
      extracted_topic: z.string(),
      target_department: z.string(),
      difficulty_level: z.string(),
      has_rich_context: z.boolean(),
      has_custom_requirements: z.boolean(),
    }),
    step2_microlearning_json: z.object({
      generated: z.boolean(),
      scenes_count: z.number(),
      total_points: z.number(),
    }),
    step3_language_content: z.object({
      language_code: z.string(),
      content_type: z.string(),
      ai_generated: z.boolean(),
    }),
    step4_inbox_assignment: z.object({
      department: z.string(),
      file_path: z.string(),
      assigned: z.boolean(),
    }),
  }).optional(),
  error: z.string().optional(),
});

export type UniversalMicrolearningInput = z.infer<typeof UniversalMicrolearningInputSchema>;
export type UniversalMicrolearningOutput = z.infer<typeof UniversalMicrolearningOutputSchema>;