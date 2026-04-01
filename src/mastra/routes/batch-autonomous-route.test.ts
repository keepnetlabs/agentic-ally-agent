import { describe, it, expect, beforeEach, vi } from 'vitest';
import { batchAutonomousHandler, batchAutonomousStatusHandler } from './batch-autonomous-route';
import { Context } from 'hono';

const { kvGetMock, kvPutMock } = vi.hoisted(() => ({
  kvGetMock: vi.fn(),
  kvPutMock: vi.fn().mockResolvedValue(undefined),
}));

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
  KVService: vi.fn().mockImplementation(function (this: any) {
    return { put: kvPutMock, get: kvGetMock };
  }),
}));

const validPayload = {
  token: 'test-token',
  companyId: 'company-123',
  targetGroupResourceId: 'group-456',
  actions: ['phishing', 'training'],
};

describe('batchAutonomousHandler', () => {
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
      ...validPayload,
      token: '',
    });

    await batchAutonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Missing token' },
      400
    );
  });

  it('should return 400 when targetGroupResourceId is missing', async () => {
    mockContext.req.json.mockResolvedValue({
      token: 't',
      actions: ['phishing-simulation'],
    });

    await batchAutonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Missing targetGroupResourceId' },
      400
    );
  });

  it('should return 400 when actions is invalid', async () => {
    mockContext.req.json.mockResolvedValue({
      token: 't',
      targetGroupResourceId: 'g',
      actions: ['invalid-action'] as any,
    });

    await batchAutonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Actions must be one or more of'),
      }),
      400
    );
  });

  it('should return 400 when only vishing-call (group-ineligible)', async () => {
    mockContext.req.json.mockResolvedValue({
      token: 't',
      targetGroupResourceId: 'g',
      actions: ['vishing-call'],
    });

    await batchAutonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('No eligible actions for group'),
      }),
      400
    );
  });

  it('should return 503 when workflow binding is not available', async () => {
    mockContext.env = {};
    mockContext.req.json.mockResolvedValue(validPayload);

    await batchAutonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Batch orchestrator workflow binding not available',
      },
      503
    );
  });

  it('should return 202 when workflow creates successfully', async () => {
    const mockCreate = vi.fn().mockResolvedValue(undefined);
    mockContext.env = { BATCH_ORCHESTRATOR_WORKFLOW: { create: mockCreate } };
    mockContext.req.json.mockResolvedValue(validPayload);

    await batchAutonomousHandler(mockContext as unknown as Context);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          companyId: 'company-123',
          actionBatchResourceIds: expect.objectContaining({
            phishing: expect.any(String),
            training: expect.any(String),
          }),
        }),
      })
    );
    const createPayload = mockCreate.mock.calls[0]?.[0]?.params;
    expect(createPayload.actionBatchResourceIds.phishing).not.toBe(createPayload.actionBatchResourceIds.training);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        status: 'accepted',
        batchResourceId: expect.any(String),
        targetGroupResourceId: 'group-456',
      }),
      202
    );
  });

  it('should return 500 when workflow create fails', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Workflow error'));
    mockContext.env = { BATCH_ORCHESTRATOR_WORKFLOW: { create: mockCreate } };
    mockContext.req.json.mockResolvedValue(validPayload);

    await batchAutonomousHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Failed to create orchestrator'),
      }),
      500
    );
  });
});

describe('batchAutonomousStatusHandler', () => {
  let mockContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    kvPutMock.mockResolvedValue(undefined);
    mockContext = {
      req: { param: vi.fn().mockReturnValue('batch-123') },
      json: vi.fn().mockReturnValue('response'),
    };
  });

  it('should return 400 when batchId is missing', async () => {
    mockContext.req.param.mockReturnValue(undefined);

    await batchAutonomousStatusHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Missing batchId' },
      400
    );
  });

  it('should return 404 when batch not found', async () => {
    kvGetMock.mockResolvedValue(null);

    await batchAutonomousStatusHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      { success: false, error: 'Batch not found' },
      404
    );
  });

  it('should return 200 with meta when batch found', async () => {
    const meta = {
      batchResourceId: 'batch-123',
      status: 'completed',
      targetGroupResourceId: 'g',
    };
    kvGetMock.mockResolvedValue(meta);

    await batchAutonomousStatusHandler(mockContext as unknown as Context);

    expect(mockContext.json).toHaveBeenCalledWith(
      { success: true, ...meta },
      200
    );
  });
});
