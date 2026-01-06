import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeAutonomousGeneration } from './autonomous-service';
import '../../../../src/__tests__/setup';
import * as userManagementModule from '../../tools/user-management';
import * as phishingAgentModule from '../../agents/phishing-email-agent';
import * as trainingAgentModule from '../../agents/microlearning-agent';
import * as resilienceUtilsModule from '../../utils/core/resilience-utils';

// Mock dependencies - factory functions for vi.mock hoisting
vi.mock('../../tools/user-management', () => ({
  getUserInfoTool: {
    execute: vi.fn()
  }
}));

vi.mock('../../agents/phishing-email-agent', () => ({
  phishingEmailAgent: {
    generate: vi.fn()
  }
}));

vi.mock('../../agents/microlearning-agent', () => ({
  microlearningAgent: {
    generate: vi.fn()
  }
}));

vi.mock('../../utils/core/resilience-utils', () => ({
  withTimeout: vi.fn(),
  withRetry: vi.fn()
}));

/**
 * Test Suite: AutonomousService
 * Tests for autonomous generation service (executeAutonomousGeneration)
 * Covers: User info fetching, phishing/training generation, error handling
 */

describe('executeAutonomousGeneration', () => {
  const mockToken = 'test-jwt-token';

  const mockUserInfoResult = {
    success: true,
    userInfo: {
      targetUserResourceId: 'user-123',
      department: 'IT',
      name: 'Test User'
    },
    analysisReport: {
      recommended_next_steps: {
        simulations: [{
          title: 'Test Phishing',
          vector: 'EMAIL',
          scenario_type: 'credential-harvesting',
          difficulty: 'Medium',
          persuasion_tactic: 'Authority',
          rationale: 'Test rationale'
        }],
        microlearnings: [{
          title: 'Test Training',
          objective: 'Learn security',
          duration_min: 5,
          language: 'en-gb',
          rationale: 'Test rationale'
        }]
      }
    },
    recentActivities: []
  };

  const mockAgentResponse = {
    text: 'Agent generated content'
  };

  let mockExecuteTool: any;
  let mockPhishingAgentGenerate: any;
  let mockTrainingAgentGenerate: any;
  let mockWithTimeout: any;
  let mockWithRetry: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mocked functions from modules
    mockExecuteTool = (userManagementModule as any).getUserInfoTool.execute;
    mockPhishingAgentGenerate = (phishingAgentModule as any).phishingEmailAgent.generate;
    mockTrainingAgentGenerate = (trainingAgentModule as any).microlearningAgent.generate;
    mockWithTimeout = (resilienceUtilsModule as any).withTimeout;
    mockWithRetry = (resilienceUtilsModule as any).withRetry;

    // Setup default mocks
    mockExecuteTool.mockResolvedValue(mockUserInfoResult);

    // withTimeout and withRetry should pass through by default - execute the function
    mockWithTimeout.mockImplementation(async (promise: Promise<any>) => promise);
    mockWithRetry.mockImplementation(async (fn: () => Promise<any>) => {
      return await fn();
    });

    // Default agent responses
    mockPhishingAgentGenerate.mockResolvedValue(mockAgentResponse);
    mockTrainingAgentGenerate.mockResolvedValue(mockAgentResponse);
  });

  describe('Input Validation', () => {
    it('should accept valid request with token and actions', async () => {
      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result).toBeDefined();
      expect(mockExecuteTool).toHaveBeenCalled();
    });

    it('should accept actions array with multiple values', async () => {
      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing', 'training'] as ('training' | 'phishing')[]
      };

      await executeAutonomousGeneration(request);

      expect(mockExecuteTool).toHaveBeenCalled();
    });
  });

  describe('User Info Fetching', () => {
    it('should call getUserInfoTool with firstName and lastName', async () => {
      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing'] as ('training' | 'phishing')[]
      };

      await executeAutonomousGeneration(request);

      expect(mockExecuteTool).toHaveBeenCalledWith({
        context: {
          firstName: 'John',
          lastName: 'Doe'
        }
      } as any);
    });

    it('should return error when getUserInfoTool fails', async () => {
      mockExecuteTool.mockResolvedValue({
        success: false,
        error: 'User not found'
      });

      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Phishing Generation', () => {
    it('should generate phishing simulation when actions includes phishing', async () => {
      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result.success).toBe(true);
      expect(result.phishingResult).toBeDefined();
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
    });

    it('should handle phishing generation failure gracefully', async () => {
      mockPhishingAgentGenerate.mockRejectedValue(new Error('Agent error'));

      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      // Should still return result, may have error in phishingResult
      expect(result).toBeDefined();
    });
  });

  describe('Training Generation', () => {
    it('should generate training module when actions includes training', async () => {
      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['training'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result.success).toBe(true);
      expect(result.trainingResult).toBeDefined();
      expect(mockTrainingAgentGenerate).toHaveBeenCalled();
    });
  });

  describe('Both Actions', () => {
    it('should generate both phishing and training when both actions specified', async () => {
      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing', 'training'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result.success).toBe(true);
      expect(result.phishingResult).toBeDefined();
      expect(result.trainingResult).toBeDefined();
      expect(mockPhishingAgentGenerate).toHaveBeenCalled();
      expect(mockTrainingAgentGenerate).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully and return error response', async () => {
      mockExecuteTool.mockRejectedValue(new Error('Network error'));

      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should preserve actions in error response', async () => {
      mockExecuteTool.mockRejectedValue(new Error('Error'));

      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing', 'training'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result.actions).toEqual(['phishing', 'training']);
    });
  });

  describe('Response Structure', () => {
    it('should return complete response structure on success', async () => {
      const request = {
        token: mockToken,
        firstName: 'John',
        lastName: 'Doe',
        actions: ['phishing'] as ('training' | 'phishing')[]
      };

      const result = await executeAutonomousGeneration(request);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('userInfo');
      expect(result).toHaveProperty('actions');
      if (result.success) {
        expect(result).toHaveProperty('phishingResult');
      }
    });
  });
});
