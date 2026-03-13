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
    createRun: vi.fn(),
  },
}));

vi.mock('../../workflows/add-language-workflow', () => ({
  addLanguageWorkflow: {
    createRun: vi.fn(),
  },
}));

vi.mock('../../workflows/add-multiple-languages-workflow', () => ({
  addMultipleLanguagesWorkflow: {
    createRun: vi.fn(),
  },
}));

vi.mock('../../workflows/update-microlearning-workflow', () => ({
  updateMicrolearningWorkflow: {
    createRun: vi.fn(),
  },
}));

vi.mock('../../utils/core/policy-cache', () => ({
  getPolicySummary: vi.fn(),
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('WorkflowExecutorTool', () => {
  const mockWriter = {
    write: vi.fn(),
  };

  const mockRun = {
    start: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    (createMicrolearningWorkflow.createRun as any).mockResolvedValue(mockRun);
    (addLanguageWorkflow.createRun as any).mockResolvedValue(mockRun);
    (addMultipleLanguagesWorkflow.createRun as any).mockResolvedValue(mockRun);
    (updateMicrolearningWorkflow.createRun as any).mockResolvedValue(mockRun);
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
            department: 'HR',
          },
        },
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'Create a course about safety',
        department: 'HR',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(getPolicySummary).toHaveBeenCalled();
      expect(createMicrolearningWorkflow.createRun).toHaveBeenCalled();

      // Verify inputData passed to workflow
      expect(mockRun.start).toHaveBeenCalledWith(
        expect.objectContaining({
          inputData: expect.objectContaining({
            prompt: 'Create a course about safety',
            department: 'HR',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.title).toBe('Safety 101');
    });

    it('should pass model overrides to workflow', async () => {
      mockRun.start.mockResolvedValue({ status: 'success', result: { metadata: { trainingUrl: 'url' } } });

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'test prompt',
        modelProvider: 'OPENAI',
        model: 'gpt-4o',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(mockRun.start).toHaveBeenCalledWith(
        expect.objectContaining({
          inputData: expect.objectContaining({
            modelProvider: 'OPENAI',
            model: 'gpt-4o',
          }),
        })
      );
    });

    it('should emit UI signals to writer', async () => {
      const mockResult = {
        status: 'success',
        result: {
          metadata: {
            trainingUrl: 'https://example.com/training',
            title: 'Safety 101',
            microlearningId: 'm-123',
          },
        },
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'test prompt',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'canvas_open',
            message: expect.stringContaining('::ui:canvas_open::https://example.com/training'),
          }),
        })
      );
      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'training_meta',
            message: expect.stringContaining('::ui:training_meta::'),
          }),
        })
      );
    });

    it('should handle validation error for missing prompt', async () => {
      const params = {
        workflowType: 'create-microlearning',
        // prompt is missing
        department: 'HR',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      // Mastra v1.1.0: Zod superRefine returns a ValidationError object
      expect(result.error).toBe(true);
      expect(result.message).toContain('Prompt is required');
      expect(createMicrolearningWorkflow.createRun).not.toHaveBeenCalled();
    });

    it('should return failure when create workflow result validation fails', async () => {
      mockRun.start.mockResolvedValue({
        status: 'failed',
        result: null,
      });

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'Create a course about safety',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Microlearning creation failed');
    });
  });

  describe('add-language workflow', () => {
    it('should execute add-language workflow successfully', async () => {
      const mockResult = {
        status: 'success',
        result: {
          data: {
            trainingUrl: 'https://example.com/training/es',
            courseId: '123',
          },
        },
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'add-language',
        existingMicrolearningId: '123',
        targetLanguage: 'es',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(addLanguageWorkflow.createRun).toHaveBeenCalled();
      expect(mockRun.start).toHaveBeenCalledWith(
        expect.objectContaining({
          inputData: expect.objectContaining({
            existingMicrolearningId: '123',
            targetLanguage: 'es',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'canvas_open',
            message: expect.stringContaining('::ui:canvas_open::https://example.com/training/es'),
          }),
        })
      );
    });

    it('should return error if missing required params', async () => {
      const params = {
        workflowType: 'add-language',
        // Missing params
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      // Mastra v1.1.0: Zod superRefine returns a ValidationError object
      expect(result.error).toBe(true);
      expect(result.message).toContain('required');
    });

    it('should return failure when add-language workflow result validation fails', async () => {
      mockRun.start.mockResolvedValue({
        status: 'failed',
        result: null,
      });

      const params = {
        workflowType: 'add-language',
        existingMicrolearningId: '123',
        targetLanguage: 'es',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Add language workflow result validation failed');
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
            { language: 'fr', success: true, trainingUrl: 'url-fr' },
          ],
        },
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'add-multiple-languages',
        existingMicrolearningId: '123',
        targetLanguages: ['es', 'fr'],
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(addMultipleLanguagesWorkflow.createRun).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);

      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'canvas_open',
            message: expect.stringContaining('::ui:canvas_open::url-es'),
          }),
        })
      );
    });
  });

  describe('update-microlearning workflow', () => {
    it('should execute update-microlearning workflow successfully', async () => {
      const mockResult = {
        status: 'success',
        result: {
          success: true,
          updateStatus: 'complete',
          metadata: { trainingUrl: 'updated-url' },
        },
      };
      mockRun.start.mockResolvedValue(mockResult);

      const params = {
        workflowType: 'update-microlearning',
        existingMicrolearningId: '123',
        updates: { theme: { primaryColor: '#000' } },
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(updateMicrolearningWorkflow.createRun).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'canvas_open',
            message: expect.stringContaining('::ui:canvas_open::updated-url'),
          }),
        })
      );
    });
  });

  describe('Error Handling & Validation', () => {
    // Zod schema prevents execution with invalid workflowType
    // it('should return error if workflowType is invalid', ...);

    it('should handle catastrophic failure and write to writer', async () => {
      (createMicrolearningWorkflow.createRun as any).mockRejectedValue(new Error('Internal Crash'));

      const params = {
        workflowType: 'create-microlearning',
        prompt: 'test prompt',
      };

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Internal Crash');

      expect(mockWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-ui-signal',
          data: expect.objectContaining({
            signal: 'workflow_error',
            message: expect.stringContaining('Internal Crash'),
          }),
        })
      );
    });

    describe('add-multiple-languages validation', () => {
      it('should fail if existingMicrolearningId is missing', async () => {
        const params = {
          workflowType: 'add-multiple-languages',
          targetLanguages: ['es'],
        };
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);
        // Mastra v1.1.0: Zod superRefine returns a ValidationError object
        expect(result.error).toBe(true);
        expect(result.message).toContain('required');
      });

      it('should fail if targetLanguages is empty', async () => {
        const params = {
          workflowType: 'add-multiple-languages',
          existingMicrolearningId: '123',
          targetLanguages: [],
        };
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);
        // Mastra v1.1.0: Zod superRefine returns a ValidationError object
        expect(result.error).toBe(true);
        expect(result.message).toContain('required');
      });
    });

    describe('update-microlearning validation', () => {
      it('should fail if updates object is missing', async () => {
        const params = {
          workflowType: 'update-microlearning',
          existingMicrolearningId: '123',
        };
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const result: any = await workflowExecutorTool.execute!(params as any, { writer: mockWriter } as any);
        // Mastra v1.1.0: Zod superRefine returns a ValidationError object
        expect(result.error).toBe(true);
        expect(result.message).toContain('required');
      });
    });
  });
});
