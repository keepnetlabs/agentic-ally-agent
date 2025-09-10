import { z } from 'zod';

export const CreateMicrolearningWorkflowSchema = z.object({
  prompt: z.string().describe('User prompt describing what microlearning content to create'),
  language: z.string().describe('Target language code (e.g., "en", "tr", "de")'),
  department: z.string().describe('Target department for assignment (e.g., "Finance", "Marketing", "IT")'),
  priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Assignment priority'),
  dueDate: z.union([z.string(), z.null()]).transform((val) => {
    if (val === null || val === undefined) {
      const today = new Date();
      const inOneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return inOneWeek.toISOString().split('T')[0];
    }
    return val;
  }).describe('Due date in YYYY-MM-DD format'),
});

export const CreateMicrolearningOutputSchema = z.object({
  success: z.boolean(),
  workflow: z.object({
    step1_microlearning: z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
    }),
    step2_language_content: z.object({
      language: z.string(),
      status: z.string(),
    }),
    step3_inbox_assignment: z.object({
      department: z.string(),
      priority: z.string(),
      dueDate: z.string(),
      status: z.string(),
    }),
  }),
  message: z.string(),
  files_generated: z.array(z.string()),
  microlearning_url: z.string().describe('Complete URL to view the generated microlearning'),
  error: z.string().optional(),
  completed_steps: z.array(z.string()).optional(),
});

export type CreateMicrolearningWorkflowInput = z.infer<typeof CreateMicrolearningWorkflowSchema>;
export type CreateMicrolearningWorkflowOutput = z.infer<typeof CreateMicrolearningOutputSchema>;