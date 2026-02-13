import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generatePhishingSimulation,
  uploadAndAssignPhishing,
  assignPhishingWithTraining,
} from './autonomous-phishing-handlers';
import '../../../../src/__tests__/setup';
import * as orchestrationModule from '../../tools/orchestration';
import * as userManagementModule from '../../tools/user-management';

vi.mock('../../tools/orchestration', () => ({
  phishingWorkflowExecutorTool: {
    execute: vi.fn(),
  },
}));

vi.mock('../../tools/user-management', () => ({
  uploadPhishingTool: { execute: vi.fn() },
  assignPhishingTool: { execute: vi.fn() },
}));

const mockPhishingAgentGenerate = vi.fn();
vi.mock('../../agents/phishing-email-agent', () => ({
  phishingEmailAgent: {
    generate: (...args: unknown[]) => mockPhishingAgentGenerate(...args),
  },
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

describe('autonomous-phishing-handlers', () => {
  const mockPhishingExecute = vi.mocked(
    (orchestrationModule as any).phishingWorkflowExecutorTool.execute
  );
  const mockUploadExecute = vi.mocked(
    (userManagementModule as any).uploadPhishingTool.execute
  );
  const mockAssignExecute = vi.mocked(
    (userManagementModule as any).assignPhishingTool.execute
  );

  const baseSimulation = {
    title: 'Phishing Test',
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
    mockPhishingAgentGenerate.mockResolvedValue({ text: 'Agent response' });

    mockPhishingExecute.mockResolvedValue({
      success: true,
      data: { phishingId: 'phish-abc-123' },
    });

    mockUploadExecute.mockResolvedValue({
      success: true,
      data: {
        resourceId: 'res-456',
        languageId: 'en-gb',
        isQuishing: false,
      },
    });

    mockAssignExecute.mockResolvedValue({
      success: true,
    });
  });

  describe('generatePhishingSimulation (tool-first path)', () => {
    it('returns success when all tools succeed (upload + assign)', async () => {
      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-phish-1',
        false
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('generated, uploaded and assigned');
      expect(mockPhishingExecute).toHaveBeenCalled();
      expect(mockUploadExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ phishingId: 'phish-abc-123' }),
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

    it('returns success for uploadOnly without assignment', async () => {
      const result = await generatePhishingSimulation(
        baseSimulation as any,
        undefined,
        baseToolResult as any,
        'thread-phish-2',
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('uploaded');
      expect(mockAssignExecute).not.toHaveBeenCalled();
    });

  });

  describe('uploadAndAssignPhishing', () => {
    it('returns success when agent completes upload and assign', async () => {
      const result = await uploadAndAssignPhishing(
        'user-789',
        'thread-upload-1',
        'phish-xyz'
      );

      expect(result.success).toBe(true);
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });

    it('returns failure when targetUserResourceId is missing', async () => {
      const result = await uploadAndAssignPhishing(
        undefined as any,
        'thread-upload-2',
        'phish-xyz'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetUserResourceId');
    });
  });

  describe('assignPhishingWithTraining', () => {
    it('uses tool-first path when phishingResourceId is provided', async () => {
      const result = await assignPhishingWithTraining(
        'user-999',
        'thread-assign-1',
        'training-res-1',
        'en-gb',
        'res-999',
        'en-gb',
        false
      );

      expect(result.success).toBe(true);
      expect(mockAssignExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            resourceId: 'res-999',
            targetUserResourceId: 'user-999',
            trainingId: 'training-res-1',
          }),
        })
      );
    });

    it('returns failure when targetUserResourceId is missing', async () => {
      const result = await assignPhishingWithTraining(
        undefined as any,
        'thread-assign-2'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetUserResourceId');
    });
  });
});
