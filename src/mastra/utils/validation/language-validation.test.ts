import { describe, it, expect } from 'vitest';
import { normalizeBCP47, validateLanguagesDifferent, LanguageCodeSchema } from './language-validation';

describe('language-validation', () => {
    describe('normalizeBCP47', () => {
        it('should normalize valid BCP-47 codes', () => {
            expect(normalizeBCP47('en-us')).toBe('en-US');
            expect(normalizeBCP47('tr-tr')).toBe('tr-TR');
            expect(normalizeBCP47('en')).toBe('en');
        });

        it('should handle whitespace', () => {
            expect(normalizeBCP47('  fr-fr  ')).toBe('fr-FR');
        });

        it('should return input if format invalid', () => {
            expect(normalizeBCP47('invalid-format-too-long')).toBe('invalid-format-too-long');
        });
    });

    describe('validateLanguagesDifferent', () => {
        it('should return true for different languages', () => {
            expect(validateLanguagesDifferent('en-US', 'tr-TR')).toBe(true);
        });

        it('should return false for same languages (case insensitive)', () => {
            expect(validateLanguagesDifferent('en-US', 'en-us')).toBe(false);
            expect(validateLanguagesDifferent('en', 'en')).toBe(false);
        });
    });

    describe('LanguageCodeSchema', () => {
        it('should validate and transform valid codes', () => {
            const result = LanguageCodeSchema.parse('en-us');
            expect(result).toBe('en-US');
        });

        it('should reject invalid codes', () => {
            expect(() => LanguageCodeSchema.parse('a')).toThrow(); // Too short
            expect(() => LanguageCodeSchema.parse('very-long-invalid-code')).toThrow(); // Too long
            expect(() => LanguageCodeSchema.parse('123')).toThrow(); // Invalid format pattern
        });
    });
});
