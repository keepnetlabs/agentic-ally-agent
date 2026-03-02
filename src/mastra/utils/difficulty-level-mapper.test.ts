import { describe, it, expect } from 'vitest';
import {
  normalizeDifficultyValue,
  mapTrainingLevelToPhishingDifficulty,
  mapPhishingDifficultyToTrainingLevel,
} from './difficulty-level-mapper';
import { PHISHING } from '../constants';

describe('difficulty-level-mapper', () => {
  describe('normalizeDifficultyValue', () => {
    it('should map training levels (beginner, intermediate, advanced) to phishing levels', () => {
      expect(normalizeDifficultyValue('beginner')).toBe('Easy');
      expect(normalizeDifficultyValue('intermediate')).toBe('Medium');
      expect(normalizeDifficultyValue('advanced')).toBe('Hard');
    });

    it('should map training levels case-insensitively', () => {
      expect(normalizeDifficultyValue('BEGINNER')).toBe('Easy');
      expect(normalizeDifficultyValue('Intermediate')).toBe('Medium');
      expect(normalizeDifficultyValue('ADVANCED')).toBe('Hard');
    });

    it('should map phishing levels (Easy, Medium, Hard) as-is', () => {
      expect(normalizeDifficultyValue('Easy')).toBe('Easy');
      expect(normalizeDifficultyValue('Medium')).toBe('Medium');
      expect(normalizeDifficultyValue('Hard')).toBe('Hard');
    });

    it('should map phishing levels case-insensitively', () => {
      expect(normalizeDifficultyValue('easy')).toBe('Easy');
      expect(normalizeDifficultyValue('MEDIUM')).toBe('Medium');
      expect(normalizeDifficultyValue('hard')).toBe('Hard');
    });

    it('should return undefined for non-string values', () => {
      expect(normalizeDifficultyValue(null)).toBeUndefined();
      expect(normalizeDifficultyValue(undefined)).toBeUndefined();
      expect(normalizeDifficultyValue(42)).toBeUndefined();
      expect(normalizeDifficultyValue({})).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(normalizeDifficultyValue('')).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      expect(normalizeDifficultyValue('   ')).toBeUndefined();
    });

    it('should trim input before matching', () => {
      expect(normalizeDifficultyValue('  beginner  ')).toBe('Easy');
      expect(normalizeDifficultyValue('\tEasy\n')).toBe('Easy');
    });

    it('should return undefined for unknown values', () => {
      expect(normalizeDifficultyValue('unknown')).toBeUndefined();
      expect(normalizeDifficultyValue('expert')).toBeUndefined();
    });
  });

  describe('mapTrainingLevelToPhishingDifficulty', () => {
    it('should map training levels to phishing difficulty', () => {
      expect(mapTrainingLevelToPhishingDifficulty('beginner')).toBe('Easy');
      expect(mapTrainingLevelToPhishingDifficulty('intermediate')).toBe('Medium');
      expect(mapTrainingLevelToPhishingDifficulty('advanced')).toBe('Hard');
    });

    it('should return DEFAULT_DIFFICULTY when undefined', () => {
      expect(mapTrainingLevelToPhishingDifficulty(undefined)).toBe(PHISHING.DEFAULT_DIFFICULTY);
    });

    it('should return DEFAULT_DIFFICULTY when value does not match', () => {
      expect(mapTrainingLevelToPhishingDifficulty('invalid')).toBe(PHISHING.DEFAULT_DIFFICULTY);
    });

    it('should handle empty string as default', () => {
      expect(mapTrainingLevelToPhishingDifficulty('')).toBe(PHISHING.DEFAULT_DIFFICULTY);
    });
  });

  describe('mapPhishingDifficultyToTrainingLevel', () => {
    it('should map Easy to Beginner', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Easy')).toBe('Beginner');
    });

    it('should map Medium to Intermediate', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Medium')).toBe('Intermediate');
    });

    it('should map Hard to Advanced', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Hard')).toBe('Advanced');
    });

    it('should return Intermediate for unknown difficulty', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Unknown' as any)).toBe('Intermediate');
    });
  });

  describe('round-trip mapping', () => {
    it('should round-trip training -> phishing -> training', () => {
      const trainingLevels = ['Beginner', 'Intermediate', 'Advanced'] as const;
      for (const level of trainingLevels) {
        const phishing = mapTrainingLevelToPhishingDifficulty(level.toLowerCase());
        const back = mapPhishingDifficultyToTrainingLevel(phishing);
        expect(back).toBe(level);
      }
    });

    it('should round-trip phishing -> training -> phishing', () => {
      const phishingLevels = ['Easy', 'Medium', 'Hard'] as const;
      for (const level of phishingLevels) {
        const training = mapPhishingDifficultyToTrainingLevel(level);
        const back = mapTrainingLevelToPhishingDifficulty(training.toLowerCase());
        expect(back).toBe(level);
      }
    });
  });
});
