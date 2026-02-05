import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailIRAnalyzeHandler } from './email-ir-route';
import { Context } from 'hono';

vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: any) => ({
    message: err?.message || 'Unknown error',
    code: 'UNKNOWN'
  }))
}));

vi.mock('../workflows/email-ir-workflow', () => ({
  emailIRWorkflow: {
    createRunAsync: vi.fn().mockResolvedValue({
      runId: 'run-123',
      start: vi.fn().mockResolvedValue({
        status: 'completed',
        steps: {
          'email-ir-reporting-step': {
            status: 'success',
            output: { report: 'Email is benign' }
          }
        }
      })
    })
  }
}));

describe('emailIRAnalyzeHandler', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      req: {
        json: vi.fn()
      },
      json: vi.fn().mockReturnValue('response')
    };
  });

  it('should successfully process valid email analysis request', async () => {
    mockContext.req.json.mockResolvedValue({
      id: 'email-123',
      accessToken: 'bearer-token',
      apiBaseUrl: 'https://api.example.com'
    });

    const response = await emailIRAnalyzeHandler(mockContext as unknown as Context);

    expect(response).toBe('response');
    expect(mockContext.json).toHaveBeenCalled();
  });

  it('should handle JSON parse errors', async () => {
    mockContext.req.json.mockRejectedValue(new Error('Invalid JSON'));

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalled();
    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[1]).toBe(500);
  });

  it('should extract and return report from workflow', async () => {
    mockContext.req.json.mockResolvedValue({
      id: 'email-456',
      accessToken: 'token'
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[0].success).toBe(true);
  });

  it('should include run ID in response', async () => {
    mockContext.req.json.mockResolvedValue({
      id: 'email-789',
      accessToken: 'token'
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[0].runId).toBeDefined();
  });

  it('should handle workflow failures gracefully', async () => {
    const { emailIRWorkflow } = await import('../workflows/email-ir-workflow');
    (emailIRWorkflow.createRunAsync as any).mockResolvedValue({
      runId: 'run-fail',
      start: vi.fn().mockResolvedValue({
        status: 'failed',
        error: 'Workflow failed'
      })
    });

    mockContext.req.json.mockResolvedValue({
      id: 'email-fail',
      accessToken: 'token'
    });

    await emailIRAnalyzeHandler(mockContext as unknown as Context);

    const lastCall = (mockContext.json as any).mock.calls[0];
    expect(lastCall[1]).toBe(500);
  });
});
