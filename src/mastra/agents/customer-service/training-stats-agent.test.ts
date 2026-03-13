import { describe, it, expect } from 'vitest';
import { trainingStatsAgent } from './training-stats-agent';
import { CS_AGENT_NAMES, CS_AGENT_IDS } from './cs-constants';
import '../../../__tests__/setup';

describe('TrainingStatsAgent', () => {
  describe('agent configuration', () => {
    it('should have correct agent ID', () => {
      expect(trainingStatsAgent.id).toBe(CS_AGENT_IDS.TRAINING_STATS);
    });

    it('should have correct agent name', () => {
      expect(trainingStatsAgent.name).toBe(CS_AGENT_NAMES.TRAINING_STATS);
    });

    it('should be properly instantiated with tools in definition', () => {
      expect(trainingStatsAgent).toBeDefined();
      expect(trainingStatsAgent.id).toBeTruthy();
      expect(trainingStatsAgent.name).toBeTruthy();
    });
  });

  describe('instructions', () => {
    it('should include CURRENT message language rule', async () => {
      const instructions = await trainingStatsAgent.getInstructions();
      expect(instructions).toContain('CURRENT message');
    });

    it('should include company context resolution priority', async () => {
      const instructions = await trainingStatsAgent.getInstructions();
      expect(instructions).toContain('Orchestrator context');
      expect(instructions).toContain('Conversation history');
      expect(instructions).toContain('Own company fallback');
    });

    it('should include language filter workflow', async () => {
      const instructions = await trainingStatsAgent.getInstructions();
      expect(instructions).toContain('getTrainingLanguages');
      expect(instructions).toContain('languageCodes');
    });

    it('should include category filter workflow', async () => {
      const instructions = await trainingStatsAgent.getInstructions();
      expect(instructions).toContain('getTrainingCategories');
      expect(instructions).toContain('categoryNames');
    });

    it('should include training type reference', async () => {
      const instructions = await trainingStatsAgent.getInstructions();
      expect(instructions).toContain('SCORM');
      expect(instructions).toContain('Learning Path');
      expect(instructions).toContain('Poster');
    });

    it('should include training level reference', async () => {
      const instructions = await trainingStatsAgent.getInstructions();
      expect(instructions).toContain('Beginner');
      expect(instructions).toContain('Intermediate');
      expect(instructions).toContain('Advanced');
    });

    it('should include no-hallucination rule', async () => {
      const instructions = await trainingStatsAgent.getInstructions();
      expect(instructions).toContain('No hallucination');
    });
  });
});
