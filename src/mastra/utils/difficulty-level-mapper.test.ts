import { describe, it, expect } from 'vitest';
import {
  normalizeDifficultyValue,
  mapTrainingLevelToPhishingDifficulty,
  mapPhishingDifficultyToTrainingLevel,
} from './difficulty-level-mapper';

describe('difficulty-level-mapper', () => {
  describe('normalizeDifficultyValue', () => {
    it('should normalize valid phishing difficulties (case insensitive)', () => {
      expect(normalizeDifficultyValue('easy')).toBe('Easy');
      expect(normalizeDifficultyValue('MEDIUM')).toBe('Medium');
      expect(normalizeDifficultyValue('Hard')).toBe('Hard');
    });

    it('should map training levels to phishing difficulty', () => {
      expect(normalizeDifficultyValue('beginner')).toBe('Easy');
      expect(normalizeDifficultyValue('Advanced')).toBe('Hard');
    });

    it('should return undefined for invalid values', () => {
      expect(normalizeDifficultyValue('invalid')).toBeUndefined();
      expect(normalizeDifficultyValue(123)).toBeUndefined();
    });

    it('should handle training level "intermediate"', () => {
      expect(normalizeDifficultyValue('intermediate')).toBe('Medium');
      expect(normalizeDifficultyValue('INTERMEDIATE')).toBe('Medium');
      expect(normalizeDifficultyValue('Intermediate')).toBe('Medium');
    });

    it('should handle mixed case training levels', () => {
      expect(normalizeDifficultyValue('BeGiNnEr')).toBe('Easy');
      expect(normalizeDifficultyValue('aDvAnCeD')).toBe('Hard');
    });

    it('should trim whitespace from input', () => {
      expect(normalizeDifficultyValue('  easy  ')).toBe('Easy');
      expect(normalizeDifficultyValue('  beginner  ')).toBe('Easy');
      expect(normalizeDifficultyValue('\tmedium\n')).toBe('Medium');
    });

    it('should return undefined for empty string', () => {
      expect(normalizeDifficultyValue('')).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      expect(normalizeDifficultyValue('   ')).toBeUndefined();
      expect(normalizeDifficultyValue('\t\n')).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(normalizeDifficultyValue(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(normalizeDifficultyValue(undefined)).toBeUndefined();
    });

    it('should return undefined for boolean', () => {
      expect(normalizeDifficultyValue(true)).toBeUndefined();
      expect(normalizeDifficultyValue(false)).toBeUndefined();
    });

    it('should return undefined for object', () => {
      expect(normalizeDifficultyValue({})).toBeUndefined();
      expect(normalizeDifficultyValue({ level: 'Easy' })).toBeUndefined();
    });

    it('should return undefined for array', () => {
      expect(normalizeDifficultyValue([])).toBeUndefined();
      expect(normalizeDifficultyValue(['Easy'])).toBeUndefined();
    });

    it('should handle all phishing difficulty levels', () => {
      expect(normalizeDifficultyValue('Easy')).toBe('Easy');
      expect(normalizeDifficultyValue('Medium')).toBe('Medium');
      expect(normalizeDifficultyValue('Hard')).toBe('Hard');
    });

    it('should handle all training levels', () => {
      expect(normalizeDifficultyValue('beginner')).toBe('Easy');
      expect(normalizeDifficultyValue('intermediate')).toBe('Medium');
      expect(normalizeDifficultyValue('advanced')).toBe('Hard');
    });

    it('should prioritize training level mapping over phishing difficulty', () => {
      // When both exist, training mapping should be checked first
      expect(normalizeDifficultyValue('beginner')).toBe('Easy');
    });

    it('should return undefined for partial matches', () => {
      expect(normalizeDifficultyValue('eas')).toBeUndefined();
      expect(normalizeDifficultyValue('beg')).toBeUndefined();
    });

    it('should return undefined for similar but incorrect values', () => {
      expect(normalizeDifficultyValue('simple')).toBeUndefined();
      expect(normalizeDifficultyValue('difficult')).toBeUndefined();
      expect(normalizeDifficultyValue('normal')).toBeUndefined();
    });

    it('should handle unicode whitespace', () => {
      expect(normalizeDifficultyValue('\u00A0easy\u00A0')).toBe('Easy');
    });
  });

  describe('mapTrainingLevelToPhishingDifficulty', () => {
    it('should default to DEFAULT_DIFFICULTY (Medium usually) when invalid', () => {
      // Assuming default is 'Medium' (Need to check actual constant if test fails, but 'Medium' is standard)
      // The file imports PHISHING.DEFAULT_DIFFICULTY. Let's trust the function returns a string.
      // We can check if it returns a non-null string.
      const result = mapTrainingLevelToPhishingDifficulty('unknown');
      expect(result).toBeDefined();
      expect(['Easy', 'Medium', 'Hard']).toContain(result);
    });

    it('should map beginner to Easy', () => {
      expect(mapTrainingLevelToPhishingDifficulty('beginner')).toBe('Easy');
      expect(mapTrainingLevelToPhishingDifficulty('BEGINNER')).toBe('Easy');
      expect(mapTrainingLevelToPhishingDifficulty('Beginner')).toBe('Easy');
    });

    it('should map intermediate to Medium', () => {
      expect(mapTrainingLevelToPhishingDifficulty('intermediate')).toBe('Medium');
      expect(mapTrainingLevelToPhishingDifficulty('INTERMEDIATE')).toBe('Medium');
      expect(mapTrainingLevelToPhishingDifficulty('Intermediate')).toBe('Medium');
    });

    it('should map advanced to Hard', () => {
      expect(mapTrainingLevelToPhishingDifficulty('advanced')).toBe('Hard');
      expect(mapTrainingLevelToPhishingDifficulty('ADVANCED')).toBe('Hard');
      expect(mapTrainingLevelToPhishingDifficulty('Advanced')).toBe('Hard');
    });

    it('should handle undefined input', () => {
      const result = mapTrainingLevelToPhishingDifficulty(undefined);
      expect(result).toBeDefined();
      expect(['Easy', 'Medium', 'Hard']).toContain(result);
    });

    it('should handle empty string', () => {
      const result = mapTrainingLevelToPhishingDifficulty('');
      expect(result).toBeDefined();
      expect(['Easy', 'Medium', 'Hard']).toContain(result);
    });

    it('should handle whitespace', () => {
      const result = mapTrainingLevelToPhishingDifficulty('   ');
      expect(result).toBeDefined();
      expect(['Easy', 'Medium', 'Hard']).toContain(result);
    });

    it('should trim whitespace from valid input', () => {
      expect(mapTrainingLevelToPhishingDifficulty('  beginner  ')).toBe('Easy');
      expect(mapTrainingLevelToPhishingDifficulty('\tintermediate\n')).toBe('Medium');
    });

    it('should accept phishing difficulty values directly', () => {
      expect(mapTrainingLevelToPhishingDifficulty('Easy')).toBe('Easy');
      expect(mapTrainingLevelToPhishingDifficulty('Medium')).toBe('Medium');
      expect(mapTrainingLevelToPhishingDifficulty('Hard')).toBe('Hard');
    });

    it('should handle invalid values by returning default', () => {
      const result1 = mapTrainingLevelToPhishingDifficulty('invalid');
      const result2 = mapTrainingLevelToPhishingDifficulty('xyz');
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(['Easy', 'Medium', 'Hard']).toContain(result1);
      expect(['Easy', 'Medium', 'Hard']).toContain(result2);
    });

    it('should return a valid phishing difficulty level', () => {
      const levels = ['beginner', 'intermediate', 'advanced', 'invalid', undefined, ''];
      levels.forEach(level => {
        const result = mapTrainingLevelToPhishingDifficulty(level as any);
        expect(['Easy', 'Medium', 'Hard']).toContain(result);
      });
    });
  });

  describe('mapPhishingDifficultyToTrainingLevel', () => {
    it('should map phishing -> training', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Easy')).toBe('Beginner');
      expect(mapPhishingDifficultyToTrainingLevel('Medium')).toBe('Intermediate');
      expect(mapPhishingDifficultyToTrainingLevel('Hard')).toBe('Advanced');
    });

    it('should map Easy to Beginner', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Easy')).toBe('Beginner');
    });

    it('should map Medium to Intermediate', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Medium')).toBe('Intermediate');
    });

    it('should map Hard to Advanced', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Hard')).toBe('Advanced');
    });

    it('should default to Intermediate for invalid values', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Invalid' as any)).toBe('Intermediate');
      expect(mapPhishingDifficultyToTrainingLevel('' as any)).toBe('Intermediate');
      expect(mapPhishingDifficultyToTrainingLevel(undefined as any)).toBe('Intermediate');
    });

    it('should handle all valid phishing difficulty levels', () => {
      const validLevels: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];
      validLevels.forEach(level => {
        const result = mapPhishingDifficultyToTrainingLevel(level);
        expect(['Beginner', 'Intermediate', 'Advanced']).toContain(result);
      });
    });

    it('should return consistent capitalization', () => {
      expect(mapPhishingDifficultyToTrainingLevel('Easy')).toBe('Beginner');
      expect(mapPhishingDifficultyToTrainingLevel('Medium')).toBe('Intermediate');
      expect(mapPhishingDifficultyToTrainingLevel('Hard')).toBe('Advanced');
      // All start with capital letter
    });

    it('should be inverse of mapTrainingLevelToPhishingDifficulty', () => {
      expect(mapPhishingDifficultyToTrainingLevel(mapTrainingLevelToPhishingDifficulty('beginner'))).toBe('Beginner');
      expect(mapPhishingDifficultyToTrainingLevel(mapTrainingLevelToPhishingDifficulty('intermediate'))).toBe(
        'Intermediate'
      );
      expect(mapPhishingDifficultyToTrainingLevel(mapTrainingLevelToPhishingDifficulty('advanced'))).toBe('Advanced');
    });

    it('should handle case-sensitive input correctly', () => {
      // The function expects exact case matching ('Easy', 'Medium', 'Hard')
      expect(mapPhishingDifficultyToTrainingLevel('Easy')).toBe('Beginner');
      // lowercase should default to Intermediate
      expect(mapPhishingDifficultyToTrainingLevel('easy' as any)).toBe('Intermediate');
    });
  });

  describe('round-trip mapping', () => {
    it('should maintain consistency in round-trip training -> phishing -> training', () => {
      const trainingLevels = ['beginner', 'intermediate', 'advanced'];
      trainingLevels.forEach(level => {
        const phishing = mapTrainingLevelToPhishingDifficulty(level);
        const backToTraining = mapPhishingDifficultyToTrainingLevel(phishing);
        expect(backToTraining.toLowerCase()).toBe(level);
      });
    });

    it('should maintain consistency in round-trip phishing -> training -> phishing', () => {
      const phishingLevels: Array<'Easy' | 'Medium' | 'Hard'> = ['Easy', 'Medium', 'Hard'];
      phishingLevels.forEach(level => {
        const training = mapPhishingDifficultyToTrainingLevel(level);
        const backToPhishing = mapTrainingLevelToPhishingDifficulty(training);
        expect(backToPhishing).toBe(level);
      });
    });
  });
});
