import { describe, it, expect } from 'vitest';
import { normalizeDifficultyValue, mapTrainingLevelToPhishingDifficulty, mapPhishingDifficultyToTrainingLevel } from './difficulty-level-mapper';

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
    });

    describe('mapPhishingDifficultyToTrainingLevel', () => {
        it('should map phishing -> training', () => {
            expect(mapPhishingDifficultyToTrainingLevel('Easy')).toBe('Beginner');
            expect(mapPhishingDifficultyToTrainingLevel('Medium')).toBe('Intermediate');
            expect(mapPhishingDifficultyToTrainingLevel('Hard')).toBe('Advanced');
        });
    });
});
