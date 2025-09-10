import { Tool } from '@mastra/core/tools';
import { generateUniversalMicrolearningTool } from './universal-content-generator';
import {
  CreateMicrolearningWorkflowSchema,
  CreateMicrolearningOutputSchema,
  CreateMicrolearningWorkflowInput
} from '../schemas/workflow-schemas';

export const createMicrolearningWorkflowTool = new Tool({
  id: 'create_microlearning_workflow',
  description: 'Complete workflow: Create microlearning from user prompt, generate language content, and assign to department inbox',
  inputSchema: CreateMicrolearningWorkflowSchema,
  outputSchema: CreateMicrolearningOutputSchema,
  execute: async (context: any) => {
    // Extract input from deeply nested context structure  
    const input = context?.context?.context || context?.context || context?.input || context;

    // Handle dueDate being string "null"
    let { prompt, language, department, priority, dueDate } = input as CreateMicrolearningWorkflowInput;
    if (dueDate === 'null' || dueDate === null) {
      const today = new Date();
      const inOneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      dueDate = inOneWeek.toISOString().split('T')[0];
    }

    console.log('🎯 Final values:', { prompt, language, department, priority, dueDate });

    if (!generateUniversalMicrolearningTool.execute) {
      throw new Error('Universal content generator is not executable');
    }

    // Use the universal generator; it detects language and writes remote files
    let result: any;
    try {
      console.log('🚀 Starting microlearning generation with:', { prompt, department });

      // Debug validation issue - try manual execution
      console.log('🔍 Pre-validation check:', {
        hasPrompt: !!prompt,
        promptLength: prompt?.length,
        hasDepartment: !!department
      });

      // Try simple test first
      if (!prompt || prompt.trim() === '') {
        throw new Error('Prompt is empty or invalid');
      }

      result = await generateUniversalMicrolearningTool.execute({
        inputData: {
          prompt: prompt.trim(),
          department: department || 'All',
        }
      });

      console.log('📊 Generation result:', result);

      if (!result?.success) {
        console.error('❌ Generation failed:', result);
        return errorObjFactory(result?.error, language, department, priority, dueDate);
      }
    } catch (error) {
      console.error('💥 Exception in generation:', error);
      return errorObjFactory(error, language, department, priority, dueDate);
    }

    const data = result.data as any;
    const detectedLang = data.detectedLanguage || language;
    const microlearningUrl = generateMicrolearningUrl(data.microlearningId, detectedLang, department);

    return {
      success: true,
      workflow: {
        step1_microlearning: {
          id: data.microlearningId,
          title: data.title,
          status: 'completed'
        },
        step2_language_content: {
          language: detectedLang,
          status: 'completed'
        },
        step3_inbox_assignment: {
          department,
          priority,
          dueDate,
          status: 'completed'
        }
      },
      message: `🎉 Workflow completed successfully! Microlearning "${data.title}" has been created, localized to ${detectedLang}, and assigned to ${department} department.`,
      files_generated: [
        `${data.microlearningId}.json`,
        `${data.microlearningId}/${detectedLang}.json`,
        `inbox/${department || 'all'}/${detectedLang}.json`
      ],
      microlearning_url: microlearningUrl
    };
  },
});

// Helper function to generate microlearning URL
function generateMicrolearningUrl(microlearningId: string, language: string, department: string): string {
  const baseUrl = 'https://microlearning.pages.dev';
  const apiBaseUrl = 'https://microlearning-api.keepnet-labs-ltd-business-profile4086.workers.dev/microlearning';
  const deptForUrl = department?.toLowerCase() || 'all';

  const params = new URLSearchParams({
    baseUrl: `${apiBaseUrl}/${microlearningId}`,
    langUrl: `lang/${language}`,
    inboxUrl: `inbox/${deptForUrl}`
  });

  return `${baseUrl}/?${params.toString()}`;
}
function errorObjFactory(error: any, language: string, department: string, priority: string, dueDate: string) {
  return {
    success: false,
    workflow: {
      step1_microlearning: {
        id: '',
        title: '',
        status: 'failed'
      },
      step2_language_content: {
        language: language,
        status: 'skipped'
      },
      step3_inbox_assignment: {
        department,
        priority,
        dueDate,
        status: 'skipped'
      }
    },
    message: 'Generation exception',
    files_generated: [],
    microlearning_url: '',
    error: `Generation exception: ${error instanceof Error ? error.message : String(error)}`,
    completed_steps: ['generation_exception']
  };
}
