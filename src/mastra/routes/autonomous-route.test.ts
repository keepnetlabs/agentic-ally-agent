import { describe, it, expect, beforeEach, vi } from 'vitest';
import { autonomousHandler } from './autonomous-route';
import { Context } from 'hono';


vi.mock('../utils/core/logger', () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('../utils/core/error-utils', () => ({
  normalizeError: vi.fn((err: any) => ({
    message: err?.message || 'Unknown error',
    code: 'UNKNOWN',
  })),
  logErrorInfo: vi.fn(),
}));

vi.mock('../services', () => ({
  executeAutonomousGeneration: vi.fn().mockResolvedValue({ success: true }),
}));

const validUserPayload = {
  token: 'test-token',
  companyId: 'company-123',
  firstName: 'John',
  lastName: 'Doe',
  actions: ['phishing'],
};

const validUserPayloadWithActionBatches = {
  ...validUserPayload,
  actions: ['phishing', 'training'],
  actionBatchResourceIds: {
    phishing: 'batch-phishing-1',
    training: 'batch-training-1',
  },
};

const validGroupPayload = {
  token: 'test-token',
  targetGroupResourceId: 'group-123',
  actions: ['training'],
};

describe('autonomousHandler', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
      req: { json: vi.fn() },
      json: vi.fn().mockReturnValue('response'),
      env: {},
    };
  });

  it('should return 400 when token is missing', async () => {
    mockContext.req.json.mockResolvedValue({
      ...validUserPayload,
      token: '',
    });

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Missing token' },
      400
    );
  });

  it('should return 400 when both user and group assignment specified', async () => {
    mockContext.req.json.mockResolvedValue({
      token: 't',
      firstName: 'John',
      targetGroupResourceId: 'group-123',
      actions: ['phishing-simulation'],
    });

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Cannot specify both'),
      }),
      400
    );
  });

  it('should return 400 when neither user nor group assignment specified', async () => {
    mockContext.req.json.mockResolvedValue({
      token: 't',
      actions: ['phishing-simulation'],
    });

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Must specify either'),
      }),
      400
    );
  });

  it('should return 400 when actions is missing or empty', async () => {
    mockContext.req.json.mockResolvedValue({
      token: 't',
      firstName: 'John',
      actions: [],
    });

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Missing or invalid actions array' },
      400
    );
  });

  it('should return 400 when action is invalid', async () => {
    mockContext.req.json.mockResolvedValue({
      token: 't',
      firstName: 'John',
      actions: ['invalid-action'],
    });

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Actions must be one or more of'),
      }),
      400
    );
  });

  it('should return 202 when workflow binding is available', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'wf-123' });
    mockContext.env = { AUTONOMOUS_WORKFLOW: { create: mockCreate } };
    mockContext.req.json.mockResolvedValue(validUserPayload);

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          companyId: 'company-123',
        }),
      })
    );

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        workflowId: 'wf-123',
        status: 'started',
      }),
      202
    );
  });

  it('should forward actionBatchResourceIds to workflow payload when provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'wf-123' });
    mockContext.env = { AUTONOMOUS_WORKFLOW: { create: mockCreate } };
    mockContext.req.json.mockResolvedValue(validUserPayloadWithActionBatches);

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          actionBatchResourceIds: {
            phishing: 'batch-phishing-1',
            training: 'batch-training-1',
          },
        }),
      })
    );
  });

  it('should run inline when no workflow and no waitUntil', async () => {
    mockContext.env = {};
    mockContext.req.json.mockResolvedValue(validUserPayload);

    await autonomousHandler(mockContext as unknown as Context);

    const { executeAutonomousGeneration } = await import('../services');
    expect(executeAutonomousGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-123',
      })
    );
    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        status: 'completed',
      }),
      200
    );
  });

  it('should accept group assignment with targetGroupResourceId', async () => {
    mockContext.env = {};
    mockContext.req.json.mockResolvedValue(validGroupPayload);

    await autonomousHandler(mockContext as unknown as Context);

    const { executeAutonomousGeneration } = await import('../services');
    expect(executeAutonomousGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        targetGroupResourceId: 'group-123',
        actions: ['training'],
      })
    );
  });

  it('should forward actionBatchResourceIds to inline execution payload when provided', async () => {
    mockContext.env = {};
    mockContext.req.json.mockResolvedValue(validUserPayloadWithActionBatches);

    await autonomousHandler(mockContext as unknown as Context);

    const { executeAutonomousGeneration } = await import('../services');
    expect(executeAutonomousGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        actionBatchResourceIds: {
          phishing: 'batch-phishing-1',
          training: 'batch-training-1',
        },
      })
    );
  });

  it('should return 500 on JSON parse error', async () => {
    mockContext.req.json.mockRejectedValue(new Error('Invalid JSON'));

    await autonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.any(String) }),
      500
    );
  });
});
