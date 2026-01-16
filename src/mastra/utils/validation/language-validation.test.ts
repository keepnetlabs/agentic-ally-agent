import { describe, it, expect } from 'vitest';
import { normalizeBCP47, validateLanguagesDifferent, LanguageCodeSchema, createDifferentLanguageSchema } from './language-validation';

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

    describe('createDifferentLanguageSchema', () => {
        // Since the schema itself is just a Zod schema, we test it by using it in a schema
        // effectively similar to how LanguageCodeSchema works but verifying it returns a schema
        it('should create a valid schema', () => {
            const schema = createDifferentLanguageSchema('source');
            expect(schema).toBeDefined();
        });

        // Note: The actual "difference" logic is usually enforced by superRefine in the using zod object,
        // but the factory returns a refined string schema.
        it('should validate and normalize codes like the base schema', () => {
            const schema = createDifferentLanguageSchema('source');
            const result = schema.parse('en-us');
            expect(result).toBe('en-US');
        });
    });
});
