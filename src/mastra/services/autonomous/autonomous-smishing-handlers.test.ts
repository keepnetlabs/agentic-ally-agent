import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSmishingSimulation } from './autonomous-smishing-handlers';
import '../../../../src/__tests__/setup';
import * as orchestrationModule from '../../tools/orchestration';
import * as userManagementModule from '../../tools/user-management';

vi.mock('../../tools/orchestration', () => ({
  smishingWorkflowExecutorTool: {
    execute: vi.fn(),
  },
}));

vi.mock('../../tools/user-management', () => ({
  uploadSmishingTool: { execute: vi.fn() },
  assignSmishingTool: { execute: vi.fn() },
}));

vi.mock('../../utils/core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../error-service', () => ({
  errorService: {
    external: vi.fn((msg: string) => ({ message: msg })),
  },
}));

describe('autonomous-smishing-handlers', () => {
  const mockSmishingExecute = vi.mocked((orchestrationModule as any).smishingWorkflowExecutorTool.execute);
  const mockUploadExecute = vi.mocked((userManagementModule as any).uploadSmishingTool.execute);
  const mockAssignExecute = vi.mocked((userManagementModule as any).assignSmishingTool.execute);

  const baseSimulation = {
    title: 'SMS Verification Alert',
    difficulty: 'Medium',
    scenario_type: 'CLICK_ONLY',
  };

  const baseToolResult = {
    userInfo: {
      targetUserResourceId: 'user-123',
      department: 'IT',
      preferredLanguage: 'en-gb',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSmishingExecute.mockResolvedValue({
      success: true,
      data: { smishingId: 'smish-abc-123' },
    });

    mockUploadExecute.mockResolvedValue({
      success: true,
      data: {
        resourceId: 'res-456',
        languageId: 'en-gb',
      },
    });

    mockAssignExecute.mockResolvedValue({
      success: true,
    });
  });

  describe('generateSmishingSimulation', () => {
    it('returns success when all tools succeed (user assignment)', async () => {
      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: baseToolResult as any,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('generated, uploaded and assigned');
      expect(mockSmishingExecute).toHaveBeenCalled();
      expect(mockUploadExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ smishingId: 'smish-abc-123' }),
        })
      );
      expect(mockAssignExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            resourceId: 'res-456',
            targetUserResourceId: 'user-123',
          }),
        })
      );
    });

    it('returns success for group assignment', async () => {
      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: { userInfo: {} } as any,
        targetGroupResourceId: 'group-789',
      });

      expect(result.success).toBe(true);
      expect(mockAssignExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            targetGroupResourceId: 'group-789',
          }),
        })
      );
    });

    it('returns failure when smishing workflow tool fails', async () => {
      mockSmishingExecute.mockResolvedValueOnce({
        success: false,
        error: 'Generation failed',
      });

      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: baseToolResult as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockUploadExecute).not.toHaveBeenCalled();
    });

    it('returns failure when upload tool fails', async () => {
      mockUploadExecute.mockResolvedValueOnce({
        success: false,
        error: 'Upload failed',
      });

      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: baseToolResult as any,
      });

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('upload');
    });

    it('returns failure when assign tool fails', async () => {
      mockAssignExecute.mockResolvedValueOnce({
        success: false,
        error: 'Assign failed',
      });

      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: baseToolResult as any,
      });

      expect(result.success).toBe(false);
      expect(result.error?.toLowerCase()).toContain('assign');
    });

    it('returns failure when smishingId is invalid (unsafe)', async () => {
      mockSmishingExecute.mockResolvedValueOnce({
        success: true,
        data: { smishingId: 'invalid..id' },
      });

      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: baseToolResult as any,
      });

      expect(result.success).toBe(false);
      expect(mockUploadExecute).not.toHaveBeenCalled();
    });

    it('returns failure when missing target user and group', async () => {
      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: { userInfo: {} } as any,
        targetGroupResourceId: undefined,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing target');
    });

    it('passes additional context from executive report', async () => {
      await generateSmishingSimulation({
        simulation: { ...baseSimulation, rationale: 'User clicked link' } as any,
        executiveReport: 'Executive summary',
        toolResult: baseToolResult as any,
      });

      expect(mockSmishingExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            additionalContext: expect.stringContaining('Rationale'),
          }),
        })
      );
    });

    it('uses Data-Submission method when scenario_type includes DATA', async () => {
      const result = await generateSmishingSimulation({
        simulation: { ...baseSimulation, scenario_type: 'DATA_SUBMISSION' } as any,
        toolResult: baseToolResult as any,
      });

      expect(result.success).toBe(true);
      expect(mockSmishingExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            method: 'Data-Submission',
          }),
        })
      );
    });

    it('returns failure when generation returns no smishingId', async () => {
      mockSmishingExecute.mockResolvedValueOnce({
        success: true,
        data: {},
      });

      const result = await generateSmishingSimulation({
        simulation: baseSimulation as any,
        toolResult: baseToolResult as any,
      });

      expect(result.success).toBe(false);
      expect(mockUploadExecute).not.toHaveBeenCalled();
    });
  });
});
