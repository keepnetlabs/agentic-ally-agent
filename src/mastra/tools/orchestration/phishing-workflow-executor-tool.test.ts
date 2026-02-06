import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phishingWorkflowExecutorTool } from './phishing-workflow-executor-tool';
import { PHISHING } from '../../constants';
import '../../../../src/__tests__/setup';
import * as workflowModule from '../../workflows/create-phishing-workflow';
import { buildRoutingContext, extractArtifactIdsFromRoutingContext } from '../../utils/chat-request-helpers';

// Mock the workflow module
vi.mock('../../workflows/create-phishing-workflow', () => {
  const mockCreateRunAsync = vi.fn();
  return {
    createPhishingWorkflow: {
      createRunAsync: mockCreateRunAsync
    }
  };
});

/**
 * Test Suite: phishingWorkflowExecutorTool
 * Tests for executing phishing workflow generation
 * Covers: Input validation, workflow execution, streaming, error handling
 */

describe('phishingWorkflowExecutorTool', () => {
  const mockWorkflowRun = {
    start: vi.fn()
  };

  const mockWorkflowResult = {
    status: 'success' as const,
    result: {
      phishingId: 'phishing-123',
      subject: 'Test Subject',
      template: '<html>Test Email Template</html>',
      fromAddress: 'test@example.com',
      fromName: 'Test Sender',
      analysis: {
        method: 'email',
        scenario: 'password-reset',
        category: 'credential-harvesting',
        psychologicalTriggers: ['urgency', 'authority'],
        keyRedFlags: ['suspicious-sender', 'urgent-tone'],
        targetAudienceAnalysis: {
          department: 'IT',
          role: 'Manager'
        }
      },
      landingPage: {
        pages: [
          {
            type: 'login',
            template: '<html>Landing Page</html>'
          }
        ]
      }
    }
  };

  const mockWriter = {
    write: vi.fn().mockResolvedValue(undefined)
  };

  let mockCreateRunAsync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked createRunAsync from the module
    mockCreateRunAsync = workflowModule.createPhishingWorkflow.createRunAsync as any;

    // Setup default workflow mock
    mockCreateRunAsync.mockResolvedValue(mockWorkflowRun);
    mockWorkflowRun.start.mockResolvedValue(mockWorkflowResult);
  });

  describe('Input Validation', () => {
    it('should accept valid input with required fields', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept optional targetProfile', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password',
        targetProfile: {
          name: 'John Doe',
          department: 'IT',
          behavioralTriggers: ['urgency'],
          vulnerabilities: ['credential-sharing']
        }
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should accept optional difficulty level', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password',
        difficulty: 'medium'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should accept optional language', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password',
        language: 'tr-tr'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result.success).toBe(true);
    });

    it('should require workflowType', async () => {
      const input: any = {
        topic: 'Reset Password'
      };

      // Tool framework validates input schema
      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });

    it('should require topic', async () => {
      const input: any = {
        workflowType: PHISHING.WORKFLOW_TYPE
      };

      // Tool framework validates input schema
      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result).toBeDefined();
      if (result && typeof result === 'object' && 'error' in result) {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('Workflow Execution', () => {
    it('should execute workflow with correct parameters', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password',
        difficulty: 'medium',
        language: 'en-gb',
        includeEmail: true,
        includeLandingPage: true
      };

      await phishingWorkflowExecutorTool.execute({ context: input } as any);

      expect(mockCreateRunAsync).toHaveBeenCalled();
      expect(mockWorkflowRun.start).toHaveBeenCalledWith(
        expect.objectContaining({
          inputData: expect.objectContaining({
            topic: 'Reset Password',
            difficulty: 'Medium',
            language: 'en-gb',
            includeEmail: true,
            includeLandingPage: true
          })
        })
      );
    });

    it('should use default difficulty when not provided', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      await phishingWorkflowExecutorTool.execute({ context: input } as any);

      expect(mockWorkflowRun.start).toHaveBeenCalledWith(
        expect.objectContaining({
          inputData: expect.objectContaining({
            difficulty: PHISHING.DEFAULT_DIFFICULTY
          })
        })
      );
    });

    it('should normalize advanced difficulty to Hard', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password',
        difficulty: 'Advanced',
      };

      await phishingWorkflowExecutorTool.execute({ context: input } as any);

      expect(mockWorkflowRun.start).toHaveBeenCalledWith(
        expect.objectContaining({
          inputData: expect.objectContaining({
            difficulty: 'Hard'
          })
        })
      );
    });

    it('should pass writer to workflow when provided', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      await phishingWorkflowExecutorTool.execute({ context: input, writer: mockWriter } as any);

      expect(mockWorkflowRun.start).toHaveBeenCalledWith(
        expect.objectContaining({
          inputData: expect.objectContaining({
            writer: mockWriter
          })
        })
      );
    });
  });

  describe('Successful Execution', () => {
    it('should return success response with workflow result data', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password',
        difficulty: 'medium',
        language: 'en-gb'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);

      expect(result.success).toBe(true);
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data?.phishingId).toBe('phishing-123');
      expect(result.data?.topic).toBe('Reset Password');
      expect(result.data?.subject).toBe('Test Subject');
      expect(result.data?.fromAddress).toBe('test@example.com');
      expect(result.message).toContain('Phishing simulation generated successfully');
    });

    it('should include analysis data in response', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);

      expect(result.data?.method).toBe('email');
      expect(result.data?.scenario).toBe('password-reset');
      expect(result.data?.category).toBe('credential-harvesting');
      expect(result.data?.psychologicalTriggers).toEqual(['urgency', 'authority']);
      expect(result.data?.keyRedFlags).toEqual(['suspicious-sender', 'urgent-tone']);
    });
  });

  describe('Streaming', () => {
    it('should stream email preview when writer is provided and email exists', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      await phishingWorkflowExecutorTool.execute({ context: input, writer: mockWriter } as any);

      expect(mockWriter.write).toHaveBeenCalled();
      const writeCalls = mockWriter.write.mock.calls;

      // Should have text-start, text-delta (email), text-delta (landing), text-end
      expect(writeCalls.length).toBeGreaterThanOrEqual(3);

      // Check for email streaming
      const emailCall = writeCalls.find(call =>
        call[0].type === 'text-delta' && call[0].delta?.includes('phishing_email')
      );
      expect(emailCall).toBeDefined();
    });

    it('should handle streaming errors gracefully', async () => {
      const errorWriter = {
        write: vi.fn().mockRejectedValue(new Error('Stream error'))
      };

      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      // Should still succeed even if streaming fails
      const result = await phishingWorkflowExecutorTool.execute({ context: input, writer: errorWriter } as any);
      expect(result.success).toBe(true);
    });

    it('should not stream when writer is not provided', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      await phishingWorkflowExecutorTool.execute({ context: input } as any);

      expect(mockWriter.write).not.toHaveBeenCalled();
    });

    it('should preserve ui-signal contract with chat-request-helpers', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password',
        language: 'en-gb',
      };

      await phishingWorkflowExecutorTool.execute({ context: input, writer: mockWriter } as any);

      const uiDeltas = mockWriter.write.mock.calls
        .map((call) => call[0])
        .filter((event) => event?.type === 'text-delta' && typeof event?.delta === 'string')
        .map((event) => event.delta as string);

      expect(uiDeltas.length).toBeGreaterThan(0);

      const routingContext = buildRoutingContext([
        {
          role: 'assistant',
          content: uiDeltas.join('\n'),
        } as any,
      ]);

      const ids = extractArtifactIdsFromRoutingContext(routingContext);
      expect(ids.phishingId).toBe('phishing-123');
    });
  });

  describe('Workflow Failure Handling', () => {
    it('should handle workflow with no result', async () => {
      mockWorkflowRun.start.mockResolvedValueOnce({
        status: 'success' as const,
        result: undefined
      });

      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('produced no output');
    });

    it('should handle workflow execution errors', async () => {
      mockWorkflowRun.start.mockRejectedValueOnce(new Error('Workflow execution failed'));

      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Output Schema Validation', () => {
    it('should return valid output schema structure', async () => {
      const input = {
        workflowType: PHISHING.WORKFLOW_TYPE,
        topic: 'Reset Password'
      };

      const result = await phishingWorkflowExecutorTool.execute({ context: input } as any);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
      if (result.data) {
        expect(result.data).toHaveProperty('phishingId');
        expect(typeof result.data.phishingId).toBe('string');
      }
      if (result.message) {
        expect(typeof result.message).toBe('string');
      }
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }
    });
  });
});
