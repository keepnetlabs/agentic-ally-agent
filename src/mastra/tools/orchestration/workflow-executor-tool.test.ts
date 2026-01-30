
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workflowExecutorTool } from './workflow-executor-tool';
import { createMicrolearningWorkflow } from '../../workflows/create-microlearning-workflow';
import { addLanguageWorkflow } from '../../workflows/add-language-workflow';
import { addMultipleLanguagesWorkflow } from '../../workflows/add-multiple-languages-workflow';
import { updateMicrolearningWorkflow } from '../../workflows/update-microlearning-workflow';
import { getPolicySummary } from '../../utils/core/policy-cache';

// Mock dependencies
vi.mock('../../workflows/create-microlearning-workflow', () => ({
  createMicrolearningWorkflow: {
    createRunAsync: vi.fn()
  }
}));

vi.mock('../../workflows/add-language-workflow', () => ({
  addLanguageWorkflow: {
    createRunAsync: vi.fn()
  }
}));

vi.mock('../../workflows/add-multiple-languages-workflow', () => ({
  addMultipleLanguagesWorkflow: {
    createRunAsync: vi.fn()
  }
}));

vi.mock('../../workflows/update-microlearning-workflow', () => ({
  updateMicrolearningWorkflow: {
    createRunAsync: vi.fn()
  }
}));

vi.mock('../../utils/core/policy-cache', () => ({
  getPolicySummary: vi.fn()
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}));

describe('WorkflowExecutorTool', () => {
  const mockWriter = {
    write: vi.fn()
  };

  const mockRun = {
    start: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    (createMicrolearningWorkflow.createRunAsync as any).mockResolvedValue(mockRun);
    (addLanguageWorkflow.createRunAsync as any).mockResolvedValue(mockRun);
    (addMultipleLanguagesWorkflow.createRunAsync as any).mockResolvedValue(mockRun);
    (updateMicrolearningWorkflow.createRunAsync as any).mockResolvedValue(mockRun);
    (getPolicySummary as any).mockResolvedValue('Mock Policy Context');
  });

  describe('create-microlearning workflow', () => {
    it('should execute create-microlearning workflow successfully', async () => {
      const mockResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training',
            title: 'Safety 101',
            department: 'HR'
          }
        }
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'Create a course about safety',
        department: 'HR'
      };

      const result: any = await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(getPolicySummary).toHaveBeenCalled();
      expect(createMicrolearningWorkflow.createRunAsync).toHaveBeenCalled();

      // Verify writer passed in inputData
      expect(mockRun.start).toHaveBeenCalledWith(expect.objectContaining({
        inputData: expect.objectContaining({
          prompt: 'Create a course about safety',
          department: 'HR',
          writer: mockWriter
        })
      }));

      expect(result.success).toBe(true);
      expect(result.title).toBe('Safety 101');
    });

    it('should pass model overrides to workflow', async () => {
      mockRun.start.mockResolvedValue({ status: 'success', result: { metadata: { trainingUrl: 'url' } } });

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'test prompt',
        modelProvider: 'OPENAI',
        model: 'gpt-4o'
      };

      await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(mockRun.start).toHaveBeenCalledWith(expect.objectContaining({
        inputData: expect.objectContaining({
          modelProvider: 'OPENAI',
          model: 'gpt-4o'
        })
      }));
    });

    it('should emit UI signals to writer', async () => {
      const mockResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training',
            title: 'Safety 101',
            microlearningId: 'm-123'
          }
        }
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'test prompt'
      };

      await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      // Should call writer.write multiple times
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'text-start' }));
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
        type: 'text-delta',
        delta: expect.stringContaining('::ui:canvas_open::https://example.com/training')
      }));
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
        type: 'text-delta',
        delta: expect.stringContaining('::ui:training_meta::')
      }));
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({ type: 'text-end' }));
    });

    it('should handle validation error for missing prompt', async () => {
      const params = {
        workflowType: 'create-microlearning',
        // prompt is missing
        department: 'HR'
      };

      const result: any = await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Prompt is required');
      expect(createMicrolearningWorkflow.createRunAsync).not.toHaveBeenCalled();
    });
  });

  describe('add-language workflow', () => {
    it('should execute add-language workflow successfully', async () => {
      const mockResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training/es',
            courseId: '123'
          }
        }
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'add-language',
        existingMicrolearningId: '123',
        targetLanguage: 'es'
      };

      const result: any = await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(addLanguageWorkflow.createRunAsync).toHaveBeenCalled();
      expect(mockRun.start).toHaveBeenCalledWith(expect.objectContaining({
        inputData: expect.objectContaining({
          existingMicrolearningId: '123',
          targetLanguage: 'es'
        })
      }));

      expect(result.success).toBe(true);
      // Should also emit UI signal
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
        delta: expect.stringContaining('::ui:canvas_open::https://example.com/training/es')
      }));
    });

    it('should return error if missing required params', async () => {
      const params = {
        workflowType: 'add-language',
        // Missing params
      };

      const result: any = await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('add-multiple-languages workflow', () => {
    it('should execute add-multiple-languages workflow successfully', async () => {
      const mockResult = {
        status: 'success',
        result: {
          languages: ['es', 'fr'],
          successCount: 2,
          failureCount: 0,
          results: [
            { language: 'es', success: true, trainingUrl: 'url-es' },
            { language: 'fr', success: true, trainingUrl: 'url-fr' }
          ]
        }
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'add-multiple-languages',
        existingMicrolearningId: '123',
        targetLanguages: ['es', 'fr']
      };

      const result: any = await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(addMultipleLanguagesWorkflow.createRunAsync).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);

      // Should emit first success URL
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
        delta: expect.stringContaining('::ui:canvas_open::url-es')
      }));
    });
  });

  describe('update-microlearning workflow', () => {
    it('should execute update-microlearning workflow successfully', async () => {
      const mockResult = {
        status: 'success',
        result: {
          success: true,
          updateStatus: 'complete',
          metadata: { trainingUrl: 'updated-url' }
        }
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'update-microlearning',
        existingMicrolearningId: '123',
        updates: { theme: { primaryColor: '#000' } }
      };

      const result: any = await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(updateMicrolearningWorkflow.createRunAsync).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
        delta: expect.stringContaining('::ui:canvas_open::updated-url')
      }));
    });
  });

  describe('Error Handling & Validation', () => {

    // Zod schema prevents execution with invalid workflowType
    // it('should return error if workflowType is invalid', ...);

    it('should handle catastrophic failure and write to writer', async () => {
      (createMicrolearningWorkflow.createRunAsync as any).mockRejectedValue(new Error('Internal Crash'));

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'test prompt'
      };

      const result: any = await workflowExecutorTool.execute({
        context: params as any,
        writer: mockWriter as any,
        runId: 'test-run-id',
        runtimeContext: {} as any,
        suspend: async () => { }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal Crash');

      // Should write error emoji to writer
      expect(mockWriter.write).toHaveBeenCalledWith(expect.objectContaining({
        delta: expect.stringContaining('❌ Workflow failed: Internal Crash')
      }));
    });

    describe('add-multiple-languages validation', () => {
      it('should fail if existingMicrolearningId is missing', async () => {
        const params = {
          workflowType: 'add-multiple-languages',
          targetLanguages: ['es']
        };
        const result: any = await workflowExecutorTool.execute({
          context: params as any,
          writer: mockWriter as any,
        } as any);
        expect(result.success).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should fail if targetLanguages is empty', async () => {
        const params = {
          workflowType: 'add-multiple-languages',
          existingMicrolearningId: '123',
          targetLanguages: []
        };
        const result: any = await workflowExecutorTool.execute({
          context: params as any,
          writer: mockWriter as any,
        } as any);
        expect(result.success).toBe(false);
        expect(result.error).toContain('required');
      });
    });

    describe('update-microlearning validation', () => {
      it('should fail if updates object is missing', async () => {
        const params = {
          workflowType: 'update-microlearning',
          existingMicrolearningId: '123'
        };
        const result: any = await workflowExecutorTool.execute({
          context: params as any,
          writer: mockWriter as any,
        } as any);
        expect(result.success).toBe(false);
        expect(result.error).toContain('required');
      });
    });

  });
});
