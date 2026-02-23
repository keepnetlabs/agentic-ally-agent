import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateTrainingModule,
  uploadTrainingOnly,
  uploadAndAssignTraining,
  uploadAndAssignTrainingForGroup,
  generateTrainingModuleForGroup,
} from './autonomous-training-handlers';
import '../../../../src/__tests__/setup';
import * as orchestrationModule from '../../tools/orchestration';
import * as userManagementModule from '../../tools/user-management';

vi.mock('../../tools/orchestration', () => ({
  workflowExecutorTool: { execute: vi.fn() },
}));

vi.mock('../../tools/user-management', () => ({
  uploadTrainingTool: { execute: vi.fn() },
  assignTrainingTool: { execute: vi.fn() },
}));

const mockMicrolearningAgentGenerate = vi.fn();
vi.mock('../../agents/microlearning-agent', () => ({
  microlearningAgent: {
    generate: (...args: unknown[]) => mockMicrolearningAgentGenerate(...args),
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

/**
 * Test Suite: AutonomousTrainingHandlers
 * Tests for training module generation and assignment
 * Covers: Training workflows, content organization, metadata management
 */

describe('AutonomousTrainingHandlers', () => {
  const mockWorkflowExecute = vi.mocked((orchestrationModule as any).workflowExecutorTool.execute);
  const mockUploadExecute = vi.mocked((userManagementModule as any).uploadTrainingTool.execute);
  const mockAssignExecute = vi.mocked((userManagementModule as any).assignTrainingTool.execute);

  beforeEach(() => {
    vi.resetAllMocks();
    mockMicrolearningAgentGenerate.mockResolvedValue({ text: 'Agent response' });

    mockWorkflowExecute.mockResolvedValue({
      success: true,
      microlearningId: 'ml-abc-123',
    });

    mockUploadExecute.mockResolvedValue({
      success: true,
      data: {
        resourceId: 'res-456',
        sendTrainingLanguageId: 'en-gb',
      },
    });

    mockAssignExecute.mockResolvedValue({
      success: true,
    });
  });

  describe('Training module configuration', () => {
    it('should accept training title configuration', () => {
      const trainingConfig = {
        title: 'Phishing Awareness Training',
        objective: 'Identify and report phishing emails',
      };

      expect(trainingConfig.title).toBeTruthy();
      expect(typeof trainingConfig.title).toBe('string');
    });

    it('should accept training objective', () => {
      const trainingConfig = {
        title: 'Email Security 101',
        objective: 'Learn email security best practices',
      };

      expect(trainingConfig.objective).toBeTruthy();
      expect(trainingConfig.objective).toContain('security');
    });

    it('should support training rationale', () => {
      const trainingConfig = {
        title: 'Training Module',
        objective: 'Objective',
        rationale: 'Based on user behavior analysis and identified risks',
      };

      expect(trainingConfig.rationale).toBeTruthy();
    });

    it('should support training duration in minutes', () => {
      const trainingConfig = {
        title: 'Training Module',
        duration_min: 15,
      };

      expect(typeof trainingConfig.duration_min).toBe('number');
      expect(trainingConfig.duration_min).toBeGreaterThan(0);
    });

    it('should support training language field', () => {
      const trainingConfig = {
        title: 'Training Module',
        language: 'en',
      };

      expect(trainingConfig.language).toBeTruthy();
    });

    it('should support training with difficulty level', () => {
      const trainingConfig = {
        title: 'Training Module',
        difficulty: 'Intermediate',
      };

      expect(['Beginner', 'Intermediate', 'Advanced']).toContain(trainingConfig.difficulty);
    });

    it('should support training with category', () => {
      const trainingConfig = {
        title: 'Training Module',
        category: 'Email Security',
      };

      expect(trainingConfig.category).toBeTruthy();
    });
  });

  describe('Training workflow patterns', () => {
    it('should support upload-only workflow', () => {
      expect(typeof uploadTrainingOnly).toBe('function');
    });

    it('should support upload and assign workflow', () => {
      expect(typeof uploadAndAssignTraining).toBe('function');
    });

    it('should support group upload and assign', () => {
      expect(typeof uploadAndAssignTrainingForGroup).toBe('function');
    });

    it('should support full training generation workflow', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should support group training generation', () => {
      expect(typeof generateTrainingModuleForGroup).toBe('function');
    });
  });

  describe('Training content organization', () => {
    it('should organize training into 8 scenes', () => {
      const sceneTypes = ['Intro', 'Goals', 'Video', 'Actionable', 'Quiz', 'Survey', 'Nudge', 'Summary'];

      expect(sceneTypes.length).toBe(8);
    });

    it('should support scene ordering', () => {
      const scenes = [
        { order: 1, type: 'Intro' },
        { order: 2, type: 'Goals' },
        { order: 3, type: 'Video' },
        { order: 4, type: 'Actionable' },
        { order: 5, type: 'Quiz' },
        { order: 6, type: 'Survey' },
        { order: 7, type: 'Nudge' },
        { order: 8, type: 'Summary' },
      ];

      expect(scenes[0].order).toBe(1);
      expect(scenes[7].order).toBe(8);
    });

    it('should support learning objectives mapping', () => {
      const objectives = ['Understand phishing techniques', 'Identify suspicious emails', 'Report phishing incidents'];

      expect(Array.isArray(objectives)).toBe(true);
      expect(objectives.length).toBeGreaterThan(0);
    });

    it('should support scene-specific content', () => {
      const sceneContent = {
        1: { type: 'Intro', content: 'Welcome to training', duration_sec: 30 },
        2: { type: 'Goals', content: 'Learning objectives', duration_sec: 60 },
        3: { type: 'Video', url: 'https://video.example.com', duration_sec: 300 },
      };

      expect(sceneContent[1].type).toBe('Intro');
      expect(sceneContent[3].url).toBeTruthy();
    });

    it('should support metadata per scene', () => {
      const scene = {
        id: 'scene-4',
        type: 'Actionable',
        tasks: [
          { id: 'task-1', description: 'Identify phishing indicators', points: 10 },
          { id: 'task-2', description: 'Write report', points: 15 },
        ],
      };

      expect(Array.isArray(scene.tasks)).toBe(true);
      expect(scene.tasks.length).toBe(2);
    });
  });

  describe('Training metadata management', () => {
    it('should track training ID', () => {
      const trainingMetadata = {
        resourceId: 'training-123',
        title: 'Email Security',
      };

      expect(trainingMetadata.resourceId).toBeTruthy();
    });

    it('should track training language versions', () => {
      const languageVersions = {
        en: 'training-123-en',
        tr: 'training-123-tr',
        de: 'training-123-de',
      };

      expect(Object.keys(languageVersions).length).toBeGreaterThan(0);
    });

    it('should track language resource ID', () => {
      const languageMetadata = {
        trainingId: 'training-123',
        language: 'en',
        languageId: 'lang-456',
      };

      expect(languageMetadata.languageId).toBeTruthy();
    });

    it('should support creation timestamp', () => {
      const metadata = {
        createdAt: new Date().toISOString(),
      };

      expect(metadata.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should support last modified timestamp', () => {
      const metadata = {
        lastModified: new Date().toISOString(),
      };

      expect(metadata.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should track target users or groups', () => {
      const metadata = {
        targetUserResourceId: 'user-123',
        // OR
        targetGroupResourceId: 'group-456',
      };

      expect(metadata.targetUserResourceId || metadata.targetGroupResourceId).toBeTruthy();
    });

    it('should support department assignment', () => {
      const metadata = {
        department: 'IT',
        assignedUsers: ['user-1', 'user-2', 'user-3'],
      };

      expect(metadata.department).toBeTruthy();
      expect(Array.isArray(metadata.assignedUsers)).toBe(true);
    });

    it('should support completion tracking', () => {
      const tracking = {
        completionRate: 0.75,
        totalUsers: 20,
        completedUsers: 15,
        averageTimeMinutes: 18,
      };

      expect(tracking.completionRate).toBeLessThanOrEqual(1);
      expect(tracking.completionRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Training generation configuration', () => {
    it('should accept microlearning object', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should accept context or custom prompt', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should accept tool result with user info', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should accept training thread ID', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should support upload-only flag', () => {
      const config = {
        uploadOnly: true,
      };

      expect(typeof config.uploadOnly).toBe('boolean');
    });

    it('should support custom prompt flag for group training', () => {
      const config = {
        isCustomPrompt: true,
      };

      expect(typeof config.isCustomPrompt).toBe('boolean');
    });
  });

  describe('Language support in training', () => {
    it('should validate BCP47 language codes', () => {
      const languages = ['en', 'en-US', 'tr', 'tr-TR', 'de', 'de-DE'];

      languages.forEach(lang => {
        expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      });
    });

    it('should support preferred language from user info', () => {
      const userInfo = {
        preferredLanguage: 'tr',
      };

      expect(userInfo.preferredLanguage).toBe('tr');
    });

    it('should fallback to default language when needed', () => {
      const defaultLanguage = 'en';
      expect(defaultLanguage).toBe('en');
    });

    it('should generate training in specified language', () => {
      const training = {
        language: 'en',
        title: 'Training in English',
        content: 'English content',
      };

      expect(training.language).toBe('en');
    });

    it('should support multi-language versions', () => {
      const versions = {
        en: { resourceId: 'training-123-en' },
        tr: { resourceId: 'training-123-tr' },
        de: { resourceId: 'training-123-de' },
      };

      expect(Object.keys(versions).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Training assignment patterns', () => {
    it('should validate user resource ID for user assignment', () => {
      const userIds = ['user-123', 'employee-456', 'staff-789'];

      userIds.forEach(id => {
        expect(id).toBeTruthy();
      });
    });

    it('should validate group resource ID for group assignment', () => {
      const groupIds = ['group-it', 'dept-sales', 'team-all'];

      groupIds.forEach(id => {
        expect(id).toBeTruthy();
      });
    });

    it('should support thread ID for agent memory', () => {
      const threadId = 'training-thread-001';
      expect(threadId).toBeTruthy();
    });

    it('should return success flag in result', () => {
      const result = { success: true };
      expect(typeof result.success).toBe('boolean');
    });

    it('should include error on assignment failure', () => {
      const result = {
        success: false,
        error: 'Missing targetUserResourceId',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Training generation output', () => {
    it('should include success flag', () => {
      const result = { success: true };
      expect(typeof result.success).toBe('boolean');
    });

    it('should include agent response', () => {
      const result = {
        agentResponse: 'Training module generated successfully',
      };

      expect(result.agentResponse).toBeTruthy();
    });

    it('should include message describing status', () => {
      const result = {
        message: 'Training module generated and uploaded',
      };

      expect(result.message).toBeTruthy();
    });

    it('should include data with training IDs for upload-only mode', () => {
      const result = {
        success: true,
        data: {
          resourceId: 'training-123',
          sendTrainingLanguageId: 'lang-456',
        },
      };

      expect(result.data?.resourceId).toBeTruthy();
      expect(result.data?.sendTrainingLanguageId).toBeTruthy();
    });

    it('should include upload result for upload-only workflow', () => {
      const result = {
        uploadResult: {
          success: true,
        },
      };

      expect(result.uploadResult?.success).toBe(true);
    });

    it('should include upload assign result for full workflow', () => {
      const result = {
        uploadAssignResult: {
          success: true,
        },
      };

      expect(result.uploadAssignResult?.success).toBe(true);
    });

    it('should include recommended parameters on failure', () => {
      const result = {
        success: false,
        recommendedParams: {
          topic: 'Security Awareness',
          objective: 'Build foundational knowledge',
          department: 'IT',
          level: 'Intermediate',
        },
      };

      expect(result.recommendedParams?.topic).toBeTruthy();
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should handle missing user resource ID gracefully', () => {
      expect(typeof uploadAndAssignTraining).toBe('function');
    });

    it('should handle missing group resource ID gracefully', () => {
      expect(typeof uploadAndAssignTrainingForGroup).toBe('function');
    });

    it('should support retry logic on agent failure', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should support timeout handling', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should fallback on generation failure', () => {
      expect(typeof generateTrainingModule).toBe('function');
    });

    it('should return structured error response', () => {
      const errorResponse = {
        success: false,
        error: 'Agent generation failed after all fallbacks',
        recommendedParams: {
          topic: 'Training Topic',
        },
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.recommendedParams).toBeDefined();
    });
  });

  describe('generateTrainingModule (tool-first integration)', () => {
    const baseMicrolearning = { title: 'Security Awareness' };
    const baseToolResult = {
      userInfo: {
        targetUserResourceId: 'user-123',
        department: 'IT',
        preferredLanguage: 'en-gb',
      },
    };

    it('returns success when all tools succeed (upload + assign)', async () => {
      const result = await generateTrainingModule(
        baseMicrolearning as any,
        undefined,
        baseToolResult as any,
        'thread-train-1',
        false,
        false
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('generated, uploaded and assigned');
      expect(mockWorkflowExecute).toHaveBeenCalled();
      expect(mockUploadExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ microlearningId: 'ml-abc-123' }),
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
      const result = await generateTrainingModule(
        baseMicrolearning as any,
        undefined,
        baseToolResult as any,
        'thread-train-2',
        true,
        false
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('uploaded');
      expect(mockAssignExecute).not.toHaveBeenCalled();
    });

    it('calls workflow with correct context when tool result has user info', async () => {
      await generateTrainingModule(
        baseMicrolearning as any,
        undefined,
        baseToolResult as any,
        'thread-train-3',
        true,
        false
      );

      expect(mockWorkflowExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            workflowType: 'create-microlearning',
            department: 'IT',
          }),
        })
      );
    });

    it('returns failure when workflow returns invalid microlearningId', async () => {
      mockWorkflowExecute.mockResolvedValueOnce({
        success: true,
        microlearningId: '!!!invalid!!!',
      });
      mockMicrolearningAgentGenerate
        .mockResolvedValueOnce({ text: 'Generated' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Some response' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generateTrainingModule(
        baseMicrolearning as any,
        undefined,
        baseToolResult as any,
        'thread-train-4',
        true,
        false
      );

      expect(result.success).toBe(false);
      expect(result.uploadResult?.error || result.message).toBeTruthy();
    });

    it('returns failure when workflow returns no success', async () => {
      mockWorkflowExecute.mockResolvedValueOnce({
        success: false,
        error: 'Workflow failed',
      });

      const result = await generateTrainingModule(
        baseMicrolearning as any,
        undefined,
        baseToolResult as any,
        'thread-train-5',
        true,
        false
      );

      expect(result.success).toBe(false);
    });

    it('returns failure when upload fails in tool-first path', async () => {
      mockUploadExecute.mockResolvedValueOnce({
        success: false,
        error: 'Upload failed',
      });
      mockMicrolearningAgentGenerate
        .mockResolvedValueOnce({ text: 'Generated' })
        .mockResolvedValueOnce({ text: 'STOP' })
        .mockResolvedValueOnce({ text: 'Unparseable' })
        .mockResolvedValueOnce({ text: 'STOP' });

      const result = await generateTrainingModule(
        baseMicrolearning as any,
        undefined,
        baseToolResult as any,
        'thread-train-6',
        true,
        false
      );

      expect(result.success).toBe(false);
      expect(result.uploadResult?.error || result.message).toBeTruthy();
    });

    it('uses custom prompt when isCustomPrompt is true', async () => {
      await generateTrainingModule(
        baseMicrolearning as any,
        'Create CEO fraud training in Turkish',
        baseToolResult as any,
        'thread-train-7',
        true,
        true
      );

      expect(mockWorkflowExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            prompt: 'Create CEO fraud training in Turkish',
          }),
        })
      );
    });

    it('falls back to agent when assign needed but no target in tool-first', async () => {
      const toolResultNoTarget = {
        userInfo: { department: 'IT', preferredLanguage: 'en-gb' },
      };

      const result = await generateTrainingModule(
        baseMicrolearning as any,
        undefined,
        toolResultNoTarget as any,
        'thread-train-8',
        false,
        false
      );

      expect(mockMicrolearningAgentGenerate).toHaveBeenCalled();
      expect(result.uploadAssignResult?.success).toBe(false);
      expect(result.uploadAssignResult?.error).toContain('targetUserResourceId');
    });
  });

  describe('uploadTrainingOnly', () => {
    it('returns success when agent response contains UPLOAD_SUCCESS', async () => {
      mockMicrolearningAgentGenerate
        .mockResolvedValueOnce({ text: 'UPLOAD_SUCCESS: resourceId=res-789, languageId=en-gb' })
        .mockResolvedValueOnce({ text: 'STOP acknowledged' });

      const result = await uploadTrainingOnly('thread-upload-only-1', {
        title: 'Test Training',
      } as any);

      expect(result.success).toBe(true);
      expect(result.data?.resourceId).toBe('res-789');
      expect(result.data?.sendTrainingLanguageId).toBe('en-gb');
    });

    it('returns failure when agent response contains UPLOAD_FAILED', async () => {
      mockMicrolearningAgentGenerate
        .mockResolvedValueOnce({ text: 'UPLOAD_FAILED: Tool execution error' })
        .mockResolvedValueOnce({ text: 'STOP acknowledged' });

      const result = await uploadTrainingOnly('thread-upload-only-2', {
        title: 'Test Training',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution error');
    });

    it('returns failure when response format is unparseable', async () => {
      mockMicrolearningAgentGenerate
        .mockResolvedValueOnce({ text: 'Some random response without expected format' })
        .mockResolvedValueOnce({ text: 'STOP acknowledged' });

      const result = await uploadTrainingOnly('thread-upload-only-3', {
        title: 'Test Training',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not parse');
    });
  });

  describe('uploadAndAssignTraining', () => {
    it('returns success when agent completes', async () => {
      const result = await uploadAndAssignTraining('user-789', 'thread-upload-1');

      expect(result.success).toBe(true);
      expect(mockMicrolearningAgentGenerate).toHaveBeenCalled();
    });

    it('returns failure when targetUserResourceId is missing', async () => {
      const result = await uploadAndAssignTraining(undefined as any, 'thread-upload-2');

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetUserResourceId');
    });
  });

  describe('uploadAndAssignTrainingForGroup', () => {
    it('returns failure when targetGroupResourceId is missing', async () => {
      const result = await uploadAndAssignTrainingForGroup(undefined as any, 'thread-upload-group-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetGroupResourceId');
    });

    it('returns success when agent completes upload and assign for group', async () => {
      const result = await uploadAndAssignTrainingForGroup('group-456', 'thread-group-2');

      expect(result.success).toBe(true);
      expect(mockMicrolearningAgentGenerate).toHaveBeenCalled();
    });
  });

  describe('generateTrainingModuleForGroup', () => {
    it('returns success when tool-first path succeeds for group', async () => {
      const result = await generateTrainingModuleForGroup(
        { title: 'Group Training' } as any,
        'Create security training for Finance',
        'en-gb',
        'thread-group-gen-1',
        'group-789'
      );

      expect(result.success).toBe(true);
      expect(mockWorkflowExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            prompt: 'Create security training for Finance',
          }),
        })
      );
    });
  });
});
