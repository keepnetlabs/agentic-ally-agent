/**
 * Unit tests for language-validation
 * Covers normalizeBCP47, LanguageCodeSchema, validateLanguagesDifferent, createDifferentLanguageSchema
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeBCP47,
  LanguageCodeSchema,
  validateLanguagesDifferent,
  createDifferentLanguageSchema,
} from './language-validation';

describe('language-validation', () => {
  describe('normalizeBCP47', () => {
    it('should normalize en-us to en-US', () => {
      expect(normalizeBCP47('en-us')).toBe('en-US');
    });

    it('should normalize TR-tr to tr-TR', () => {
      expect(normalizeBCP47('TR-tr')).toBe('tr-TR');
    });

    it('should normalize zh-cn to zh-CN', () => {
      expect(normalizeBCP47('zh-cn')).toBe('zh-CN');
    });

    it('should lowercase primary language only', () => {
      expect(normalizeBCP47('en')).toBe('en');
    });

    it('should trim whitespace', () => {
      expect(normalizeBCP47('  en-gb  ')).toBe('en-GB');
    });

    it('should handle pt-BR', () => {
      expect(normalizeBCP47('pt-br')).toBe('pt-BR');
    });

    it('should return trimmed for invalid format (3 parts)', () => {
      const result = normalizeBCP47('en-us-extra');
      expect(result).toBe('en-us-extra');
    });
  });

  describe('LanguageCodeSchema', () => {
    it('should parse valid en-gb', () => {
      const result = LanguageCodeSchema.parse('en-gb');
      expect(result).toBe('en-GB');
    });

    it('should parse valid tr', () => {
      const result = LanguageCodeSchema.parse('tr');
      expect(result).toBe('tr');
    });

    it('should reject too short', () => {
      expect(() => LanguageCodeSchema.parse('e')).toThrow();
    });

    it('should reject invalid format', () => {
      expect(() => LanguageCodeSchema.parse('invalid')).toThrow();
    });

    it('should reject too long', () => {
      expect(() => LanguageCodeSchema.parse('en-gb-extra')).toThrow();
    });
  });

  describe('validateLanguagesDifferent', () => {
    it('should return true when source and target differ', () => {
      expect(validateLanguagesDifferent('en', 'tr')).toBe(true);
      expect(validateLanguagesDifferent('en-gb', 'tr-tr')).toBe(true);
    });

    it('should return false when source and target are same', () => {
      expect(validateLanguagesDifferent('en', 'en')).toBe(false);
      expect(validateLanguagesDifferent('en-gb', 'en-GB')).toBe(false);
    });

    it('should be case-insensitive for comparison', () => {
      expect(validateLanguagesDifferent('EN', 'en')).toBe(false);
    });

    it('should return true for different regional variants', () => {
      expect(validateLanguagesDifferent('en', 'en-gb')).toBe(true);
      expect(validateLanguagesDifferent('pt-br', 'pt-pt')).toBe(true);
    });

    it('should return false for same language with different casing', () => {
      expect(validateLanguagesDifferent('TR', 'tr')).toBe(false);
      expect(validateLanguagesDifferent('de-DE', 'de-de')).toBe(false);
    });
  });

  describe('createDifferentLanguageSchema', () => {
    it('should parse valid language code', () => {
      const schema = createDifferentLanguageSchema('source');
      const result = schema.parse('en-gb');
      expect(result).toBe('en-GB');
    });

    it('should trim and normalize', () => {
      const schema = createDifferentLanguageSchema('source');
      const result = schema.parse('  tr-tr  ');
      expect(result).toBe('tr-TR');
    });

    it('should reject too short', () => {
      const schema = createDifferentLanguageSchema('source');
      expect(() => schema.parse('e')).toThrow();
    });

    it('should reject too long', () => {
      const schema = createDifferentLanguageSchema('source');
      expect(() => schema.parse('en-gb-extra')).toThrow();
    });

    it('should reject invalid format', () => {
      const schema = createDifferentLanguageSchema('source');
      expect(() => schema.parse('invalid!')).toThrow();
    });
  });
});
