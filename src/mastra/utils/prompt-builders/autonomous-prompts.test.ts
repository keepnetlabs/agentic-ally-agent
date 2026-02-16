import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPhishingGenerationPrompt,
  buildPhishingGenerationPromptSimplified,
  buildTrainingGenerationPrompt,
  buildTrainingGenerationPromptSimplified,
  buildUploadPrompt,
  buildUploadAndAssignPrompt,
  buildAssignPhishingWithTrainingPrompt,
} from './autonomous-prompts';

vi.mock('./autonomous-helpers', () => ({
  getLanguageOrDefault: (lang?: string) => lang || 'en-gb',
  buildLanguageRequirementBlock: (toolName: string, language?: string) =>
    `**LANGUAGE: ${language || 'en-gb'}** (for ${toolName})`,
  EXAMPLE_IDS: {
    phishing: { generated: 'yl2JfA4r5yYl', resource: 'scenario-abc-123456' },
    training: { generated: 'ml-generate-xyz123', resource: 'resource-train-789xyz' },
  },
}));

describe('autonomous-prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildPhishingGenerationPrompt', () => {
    it('includes topic and difficulty from simulation', () => {
      const result = buildPhishingGenerationPrompt({
        simulation: { title: 'CEO Fraud', difficulty: 'Hard' },
        toolResult: {},
        language: 'en-gb',
      });

      expect(result).toContain('CEO Fraud');
      expect(result).toContain('Hard');
      expect(result).toContain('phishingExecutor');
    });

    it('uses defaults when simulation fields are empty', () => {
      const result = buildPhishingGenerationPrompt({
        simulation: {},
        toolResult: {},
      });

      expect(result).toContain('Security Update');
      expect(result).toContain('Medium');
      expect(result).toContain('CLICK_ONLY');
    });

    it('includes department from toolResult', () => {
      const result = buildPhishingGenerationPrompt({
        simulation: { title: 'Test' },
        toolResult: { userInfo: { department: 'Finance' } },
        language: 'tr-tr',
      });

      expect(result).toContain('Finance');
      expect(result).toContain('tr-tr');
    });
  });

  describe('buildPhishingGenerationPromptSimplified', () => {
    it('includes minimal context', () => {
      const result = buildPhishingGenerationPromptSimplified({
        simulation: { title: 'Password Reset' },
        toolResult: {},
        language: 'en-gb',
      });

      expect(result).toContain('Password Reset');
      expect(result).toContain('phishingExecutor');
      expect(result).toContain('AUTONOMOUS_EXECUTION_MODE');
    });
  });

  describe('buildTrainingGenerationPrompt', () => {
    it('includes microlearning context', () => {
      const result = buildTrainingGenerationPrompt({
        microlearning: { title: 'Security Awareness', objective: 'Learn best practices' },
        department: 'IT',
        level: 'Intermediate',
        language: 'en-gb',
      });

      expect(result).toContain('Security Awareness');
      expect(result).toContain('Learn best practices');
      expect(result).toContain('IT');
      expect(result).toContain('Intermediate');
      expect(result).toContain('workflowExecutor');
    });

    it('uses defaults for empty microlearning', () => {
      const result = buildTrainingGenerationPrompt({
        microlearning: {},
        department: 'All',
        level: 'Beginner',
      });

      expect(result).toContain('Security Awareness');
      expect(result).toContain('Beginner');
    });
  });

  describe('buildTrainingGenerationPromptSimplified', () => {
    it('includes minimal training context', () => {
      const result = buildTrainingGenerationPromptSimplified({
        microlearning: { title: 'Phishing 101' },
        department: 'HR',
        level: 'Advanced',
        language: 'de-de',
      });

      expect(result).toContain('Phishing 101');
      expect(result).toContain('HR');
      expect(result).toContain('Advanced');
      expect(result).toContain('de-de');
    });
  });

  describe('buildUploadPrompt', () => {
    it('builds phishing upload prompt', () => {
      const result = buildUploadPrompt('phishing');

      expect(result).toContain('phishing');
      expect(result).toContain('uploadPhishing');
      expect(result).toContain('phishingId');
      expect(result).toContain('UPLOAD_SUCCESS');
    });

    it('builds training upload prompt', () => {
      const result = buildUploadPrompt('training');

      expect(result).toContain('training');
      expect(result).toContain('uploadTraining');
      expect(result).toContain('microlearningId');
    });

    it('includes generated ID when provided', () => {
      const result = buildUploadPrompt('phishing', 'phish-xyz-123');

      expect(result).toContain('phish-xyz-123');
      expect(result).toContain('Use this EXACT ID');
    });
  });

  describe('buildUploadAndAssignPrompt', () => {
    it('builds phishing upload and assign prompt', () => {
      const result = buildUploadAndAssignPrompt('phishing', 'user-456');

      expect(result).toContain('phishing');
      expect(result).toContain('user-456');
      expect(result).toContain('uploadPhishing');
      expect(result).toContain('assignPhishing');
    });

    it('builds training upload and assign prompt', () => {
      const result = buildUploadAndAssignPrompt('training', 'user-789');

      expect(result).toContain('training');
      expect(result).toContain('uploadTraining');
      expect(result).toContain('assignTraining');
    });

    it('includes generated artifact ID when provided', () => {
      const result = buildUploadAndAssignPrompt('phishing', 'user-1', 'phish-abc');

      expect(result).toContain('phish-abc');
    });
  });

  describe('buildAssignPhishingWithTrainingPrompt', () => {
    it('includes training IDs when provided', () => {
      const result = buildAssignPhishingWithTrainingPrompt('user-123', 'training-res-456', 'en-gb');

      expect(result).toContain('user-123');
      expect(result).toContain('training-res-456');
      expect(result).toContain('en-gb');
      expect(result).toContain('assignPhishing');
    });

    it('mentions extracting from history when training IDs not provided', () => {
      const result = buildAssignPhishingWithTrainingPrompt('user-123');

      expect(result).toContain('conversation history');
      expect(result).toContain('extract');
    });
  });
});
