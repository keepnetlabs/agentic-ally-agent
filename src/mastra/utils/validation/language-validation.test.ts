import { describe, it, expect } from 'vitest';
import {
  normalizeBCP47,
  validateLanguagesDifferent,
  LanguageCodeSchema,
  createDifferentLanguageSchema,
} from './language-validation';

describe('language-validation', () => {
  describe('normalizeBCP47', () => {
    describe('Valid Language Codes', () => {
      it('should normalize valid BCP-47 codes', () => {
        expect(normalizeBCP47('en-us')).toBe('en-US');
        expect(normalizeBCP47('tr-tr')).toBe('tr-TR');
        expect(normalizeBCP47('en')).toBe('en');
      });

      it('should normalize en-GB', () => {
        expect(normalizeBCP47('en-gb')).toBe('en-GB');
      });

      it('should normalize zh-CN', () => {
        expect(normalizeBCP47('zh-cn')).toBe('zh-CN');
      });

      it('should normalize pt-BR', () => {
        expect(normalizeBCP47('pt-br')).toBe('pt-BR');
      });

      it('should normalize ja-JP', () => {
        expect(normalizeBCP47('ja-jp')).toBe('ja-JP');
      });

      it('should normalize ko-KR', () => {
        expect(normalizeBCP47('ko-kr')).toBe('ko-KR');
      });

      it('should handle uppercase input', () => {
        expect(normalizeBCP47('EN-US')).toBe('en-US');
      });

      it('should handle mixed case input', () => {
        expect(normalizeBCP47('En-Us')).toBe('en-US');
      });

      it('should handle reversed case', () => {
        expect(normalizeBCP47('EN-us')).toBe('en-US');
      });

      it('should handle language only lowercase', () => {
        expect(normalizeBCP47('fr')).toBe('fr');
      });

      it('should handle language only uppercase', () => {
        expect(normalizeBCP47('FR')).toBe('fr');
      });

      it('should handle language only mixed case', () => {
        expect(normalizeBCP47('Fr')).toBe('fr');
      });

      it('should normalize de-DE', () => {
        expect(normalizeBCP47('de-de')).toBe('de-DE');
      });

      it('should normalize es-ES', () => {
        expect(normalizeBCP47('es-es')).toBe('es-ES');
      });

      it('should normalize it-IT', () => {
        expect(normalizeBCP47('it-it')).toBe('it-IT');
      });

      it('should normalize ru-RU', () => {
        expect(normalizeBCP47('ru-ru')).toBe('ru-RU');
      });

      it('should normalize ar-SA', () => {
        expect(normalizeBCP47('ar-sa')).toBe('ar-SA');
      });
    });

    describe('Whitespace Handling', () => {
      it('should handle whitespace', () => {
        expect(normalizeBCP47('  fr-fr  ')).toBe('fr-FR');
      });

      it('should handle leading whitespace', () => {
        expect(normalizeBCP47('  en-US')).toBe('en-US');
      });

      it('should handle trailing whitespace', () => {
        expect(normalizeBCP47('en-US  ')).toBe('en-US');
      });

      it('should handle tabs', () => {
        expect(normalizeBCP47('\ten-us\t')).toBe('en-US');
      });

      it('should handle newlines', () => {
        expect(normalizeBCP47('\nen-us\n')).toBe('en-US');
      });

      it('should handle mixed whitespace', () => {
        expect(normalizeBCP47(' \t\nen-us\n\t ')).toBe('en-US');
      });
    });

    describe('Invalid Formats', () => {
      it('should return input if format invalid', () => {
        expect(normalizeBCP47('invalid-format-too-long')).toBe('invalid-format-too-long');
      });

      it('should return input for three-part codes', () => {
        expect(normalizeBCP47('en-US-variant')).toBe('en-US-variant');
      });

      it('should return input for four-part codes', () => {
        expect(normalizeBCP47('a-b-c-d')).toBe('a-b-c-d');
      });

      it('should return input for multiple hyphens', () => {
        expect(normalizeBCP47('en--US')).toBe('en--US');
      });

      it('should handle empty string', () => {
        expect(normalizeBCP47('')).toBe('');
      });

      it('should handle whitespace only', () => {
        expect(normalizeBCP47('   ')).toBe('');
      });

      it('should handle single character', () => {
        expect(normalizeBCP47('a')).toBe('a');
      });

      it('should handle very long string', () => {
        const longCode = 'a'.repeat(100);
        expect(normalizeBCP47(longCode)).toBe(longCode);
      });
    });

    describe('Special Cases', () => {
      it('should handle numeric region codes', () => {
        expect(normalizeBCP47('zh-001')).toBe('zh-001');
      });

      it('should handle three-letter language codes', () => {
        expect(normalizeBCP47('chi')).toBe('chi');
      });

      it('should handle three-letter language with region', () => {
        expect(normalizeBCP47('chi-cn')).toBe('chi-CN');
      });

      it('should handle special characters by returning as-is', () => {
        // @ is not a hyphen, so treated as single part and lowercased
        expect(normalizeBCP47('en@US')).toBe('en@us');
      });

      it('should handle underscores by returning as-is', () => {
        // _ is not a hyphen, so treated as single part and lowercased
        expect(normalizeBCP47('en_US')).toBe('en_us');
      });

      it('should handle no hyphen', () => {
        expect(normalizeBCP47('enUS')).toBe('enus');
      });

      it('should handle hyphen at start', () => {
        expect(normalizeBCP47('-en-US')).toBe('-en-US');
      });

      it('should handle hyphen at end', () => {
        expect(normalizeBCP47('en-US-')).toBe('en-US-');
      });

      it('should preserve already normalized codes', () => {
        expect(normalizeBCP47('en-US')).toBe('en-US');
      });

      it('should preserve already normalized language-only codes', () => {
        expect(normalizeBCP47('en')).toBe('en');
      });
    });

    describe('Edge Cases', () => {
      it('should handle uppercase region with lowercase language', () => {
        expect(normalizeBCP47('en-US')).toBe('en-US');
      });

      it('should handle all uppercase', () => {
        expect(normalizeBCP47('EN-US')).toBe('en-US');
      });

      it('should handle all lowercase', () => {
        expect(normalizeBCP47('en-us')).toBe('en-US');
      });

      it('should handle random case mixing', () => {
        expect(normalizeBCP47('eN-Us')).toBe('en-US');
      });

      it('should handle single hyphen', () => {
        expect(normalizeBCP47('-')).toBe('-');
      });

      it('should handle only hyphens', () => {
        expect(normalizeBCP47('---')).toBe('---');
      });
    });
  });

  describe('validateLanguagesDifferent', () => {
    describe('Different Languages', () => {
      it('should return true for different languages', () => {
        expect(validateLanguagesDifferent('en-US', 'tr-TR')).toBe(true);
      });

      it('should return true for en-US and fr-FR', () => {
        expect(validateLanguagesDifferent('en-US', 'fr-FR')).toBe(true);
      });

      it('should return true for en and tr', () => {
        expect(validateLanguagesDifferent('en', 'tr')).toBe(true);
      });

      it('should return true for zh-CN and ja-JP', () => {
        expect(validateLanguagesDifferent('zh-CN', 'ja-JP')).toBe(true);
      });

      it('should return true for pt-BR and es-ES', () => {
        expect(validateLanguagesDifferent('pt-BR', 'es-ES')).toBe(true);
      });

      it('should return true for different language primary codes', () => {
        expect(validateLanguagesDifferent('en', 'fr')).toBe(true);
      });

      it('should return true for language vs language-region', () => {
        expect(validateLanguagesDifferent('en', 'fr-FR')).toBe(true);
      });
    });

    describe('Same Languages', () => {
      it('should return false for same languages (case insensitive)', () => {
        expect(validateLanguagesDifferent('en-US', 'en-us')).toBe(false);
        expect(validateLanguagesDifferent('en', 'en')).toBe(false);
      });

      it('should return false for EN-US and en-us', () => {
        expect(validateLanguagesDifferent('EN-US', 'en-us')).toBe(false);
      });

      it('should return false for en-US and EN-US', () => {
        expect(validateLanguagesDifferent('en-US', 'EN-US')).toBe(false);
      });

      it('should return false for en and EN', () => {
        expect(validateLanguagesDifferent('en', 'EN')).toBe(false);
      });

      it('should return false for tr-TR and tr-tr', () => {
        expect(validateLanguagesDifferent('tr-TR', 'tr-tr')).toBe(false);
      });

      it('should return false for mixed case matches', () => {
        expect(validateLanguagesDifferent('En-Us', 'eN-uS')).toBe(false);
      });

      it('should return false for zh-CN and zh-cn', () => {
        expect(validateLanguagesDifferent('zh-CN', 'zh-cn')).toBe(false);
      });

      it('should return false for identical codes', () => {
        expect(validateLanguagesDifferent('fr-FR', 'fr-FR')).toBe(false);
      });
    });

    describe('Regional Variants', () => {
      it('should return true for en-US and en-GB (different regions)', () => {
        expect(validateLanguagesDifferent('en-US', 'en-GB')).toBe(true);
      });

      it('should return true for pt-BR and pt-PT', () => {
        expect(validateLanguagesDifferent('pt-BR', 'pt-PT')).toBe(true);
      });

      it('should return true for zh-CN and zh-TW', () => {
        expect(validateLanguagesDifferent('zh-CN', 'zh-TW')).toBe(true);
      });

      it('should return true for es-ES and es-MX', () => {
        expect(validateLanguagesDifferent('es-ES', 'es-MX')).toBe(true);
      });

      it('should return true for fr-FR and fr-CA', () => {
        expect(validateLanguagesDifferent('fr-FR', 'fr-CA')).toBe(true);
      });
    });

    describe('Whitespace Handling', () => {
      it('should handle whitespace in source', () => {
        expect(validateLanguagesDifferent('  en-US  ', 'tr-TR')).toBe(true);
      });

      it('should handle whitespace in target', () => {
        expect(validateLanguagesDifferent('en-US', '  tr-TR  ')).toBe(true);
      });

      it('should handle whitespace in both', () => {
        expect(validateLanguagesDifferent('  en-US  ', '  tr-TR  ')).toBe(true);
      });

      it('should detect same with whitespace', () => {
        expect(validateLanguagesDifferent('  en-US  ', '  en-us  ')).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty strings as same', () => {
        expect(validateLanguagesDifferent('', '')).toBe(false);
      });

      it('should handle whitespace-only as same', () => {
        expect(validateLanguagesDifferent('   ', '   ')).toBe(false);
      });

      it('should return true for empty vs non-empty', () => {
        expect(validateLanguagesDifferent('', 'en-US')).toBe(true);
      });

      it('should return true for non-empty vs empty', () => {
        expect(validateLanguagesDifferent('en-US', '')).toBe(true);
      });

      it('should handle language-only vs language-region as different', () => {
        expect(validateLanguagesDifferent('en', 'en-US')).toBe(true);
      });

      it('should handle very long strings', () => {
        const long1 = 'a'.repeat(100);
        const long2 = 'b'.repeat(100);
        expect(validateLanguagesDifferent(long1, long2)).toBe(true);
      });

      it('should handle special characters', () => {
        expect(validateLanguagesDifferent('en@US', 'fr@FR')).toBe(true);
      });
    });
  });

  describe('LanguageCodeSchema', () => {
    describe('Valid Codes', () => {
      it('should validate and transform valid codes', () => {
        const result = LanguageCodeSchema.parse('en-us');
        expect(result).toBe('en-US');
      });

      it('should validate en', () => {
        expect(LanguageCodeSchema.parse('en')).toBe('en');
      });

      it('should validate tr-TR', () => {
        expect(LanguageCodeSchema.parse('tr-tr')).toBe('tr-TR');
      });

      it('should validate zh-CN', () => {
        expect(LanguageCodeSchema.parse('zh-cn')).toBe('zh-CN');
      });

      it('should validate pt-BR', () => {
        expect(LanguageCodeSchema.parse('pt-br')).toBe('pt-BR');
      });

      it('should validate ja-JP', () => {
        expect(LanguageCodeSchema.parse('ja-jp')).toBe('ja-JP');
      });

      it('should validate ko-KR', () => {
        expect(LanguageCodeSchema.parse('ko-kr')).toBe('ko-KR');
      });

      it('should validate de-DE', () => {
        expect(LanguageCodeSchema.parse('de-de')).toBe('de-DE');
      });

      it('should validate fr-FR', () => {
        expect(LanguageCodeSchema.parse('fr-fr')).toBe('fr-FR');
      });

      it('should validate es-ES', () => {
        expect(LanguageCodeSchema.parse('es-es')).toBe('es-ES');
      });

      it('should validate it-IT', () => {
        expect(LanguageCodeSchema.parse('it-it')).toBe('it-IT');
      });

      it('should validate ru-RU', () => {
        expect(LanguageCodeSchema.parse('ru-ru')).toBe('ru-RU');
      });

      it('should validate ar-SA', () => {
        expect(LanguageCodeSchema.parse('ar-sa')).toBe('ar-SA');
      });

      it('should validate hi-IN', () => {
        expect(LanguageCodeSchema.parse('hi-in')).toBe('hi-IN');
      });

      it('should validate uppercase input', () => {
        expect(LanguageCodeSchema.parse('EN-US')).toBe('en-US');
      });

      it('should validate mixed case input', () => {
        expect(LanguageCodeSchema.parse('En-Us')).toBe('en-US');
      });

      it('should validate three-letter language codes', () => {
        expect(LanguageCodeSchema.parse('chi')).toBe('chi');
      });

      it('should validate numeric region codes', () => {
        expect(LanguageCodeSchema.parse('zh-001')).toBe('zh-001');
      });

      it('should trim whitespace', () => {
        expect(LanguageCodeSchema.parse('  en-US  ')).toBe('en-US');
      });
    });

    describe('Invalid Codes', () => {
      it('should reject invalid codes', () => {
        expect(() => LanguageCodeSchema.parse('a')).toThrow(); // Too short
        expect(() => LanguageCodeSchema.parse('very-long-invalid-code')).toThrow(); // Too long
        expect(() => LanguageCodeSchema.parse('123')).toThrow(); // Invalid format pattern
      });

      it('should reject too short codes', () => {
        expect(() => LanguageCodeSchema.parse('a')).toThrow();
      });

      it('should reject single character', () => {
        expect(() => LanguageCodeSchema.parse('e')).toThrow();
      });

      it('should reject too long codes', () => {
        expect(() => LanguageCodeSchema.parse('very-long-invalid-code')).toThrow();
      });

      it('should reject codes over 10 characters', () => {
        expect(() => LanguageCodeSchema.parse('en-US-extra')).toThrow();
      });

      it('should reject empty string', () => {
        expect(() => LanguageCodeSchema.parse('')).toThrow();
      });

      it('should reject whitespace only', () => {
        expect(() => LanguageCodeSchema.parse('   ')).toThrow();
      });

      it('should reject numeric language codes', () => {
        expect(() => LanguageCodeSchema.parse('123')).toThrow();
      });

      it('should reject numeric language with region', () => {
        expect(() => LanguageCodeSchema.parse('123-US')).toThrow();
      });

      it('should reject special characters', () => {
        expect(() => LanguageCodeSchema.parse('en@US')).toThrow();
      });

      it('should reject underscore separator', () => {
        expect(() => LanguageCodeSchema.parse('en_US')).toThrow();
      });

      it('should reject multiple hyphens', () => {
        expect(() => LanguageCodeSchema.parse('en--US')).toThrow();
      });

      it('should reject leading hyphen', () => {
        expect(() => LanguageCodeSchema.parse('-en')).toThrow();
      });

      it('should reject trailing hyphen', () => {
        expect(() => LanguageCodeSchema.parse('en-')).toThrow();
      });

      it('should reject only hyphen', () => {
        expect(() => LanguageCodeSchema.parse('-')).toThrow();
      });

      it('should reject three-part codes', () => {
        expect(() => LanguageCodeSchema.parse('en-US-x')).toThrow();
      });

      it('should reject invalid region length (1 char)', () => {
        expect(() => LanguageCodeSchema.parse('en-U')).toThrow();
      });

      it('should reject invalid region length (4 chars)', () => {
        expect(() => LanguageCodeSchema.parse('en-USAA')).toThrow();
      });

      it('should reject mixed alphanumeric region (not all digits)', () => {
        expect(() => LanguageCodeSchema.parse('en-1US')).toThrow();
      });

      it('should accept and normalize lowercase region letters', () => {
        // Schema accepts lowercase and normalizes to uppercase
        expect(LanguageCodeSchema.parse('en-us')).toBe('en-US');
      });

      it('should reject single-letter language code', () => {
        expect(() => LanguageCodeSchema.parse('a-US')).toThrow();
      });

      it('should reject four-letter language code', () => {
        expect(() => LanguageCodeSchema.parse('engl-US')).toThrow();
      });
    });

    describe('Error Messages', () => {
      it('should provide helpful error message for too short', () => {
        try {
          LanguageCodeSchema.parse('a');
        } catch (error: any) {
          expect(error.errors[0].message).toContain('at least 2 characters');
        }
      });

      it('should provide helpful error message for too long', () => {
        try {
          LanguageCodeSchema.parse('very-long-code-here');
        } catch (error: any) {
          expect(error.errors[0].message).toContain('at most 10 characters');
        }
      });

      it('should provide helpful error message for invalid format', () => {
        try {
          LanguageCodeSchema.parse('123');
        } catch (error: any) {
          expect(error.errors[0].message).toContain('BCP-47');
        }
      });
    });
  });

  describe('createDifferentLanguageSchema', () => {
    describe('Schema Creation', () => {
      it('should create a valid schema', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(schema).toBeDefined();
      });

      it('should validate and normalize codes like the base schema', () => {
        const schema = createDifferentLanguageSchema('source');
        const result = schema.parse('en-us');
        expect(result).toBe('en-US');
      });

      it('should validate en', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(schema.parse('en')).toBe('en');
      });

      it('should validate tr-TR', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(schema.parse('tr-tr')).toBe('tr-TR');
      });

      it('should validate zh-CN', () => {
        const schema = createDifferentLanguageSchema('target');
        expect(schema.parse('zh-cn')).toBe('zh-CN');
      });

      it('should trim whitespace', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(schema.parse('  fr-FR  ')).toBe('fr-FR');
      });

      it('should normalize case', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(schema.parse('EN-US')).toBe('en-US');
      });

      it('should work with different field names', () => {
        const schema1 = createDifferentLanguageSchema('source');
        const schema2 = createDifferentLanguageSchema('target');
        const schema3 = createDifferentLanguageSchema('languageCode');

        expect(schema1.parse('en-US')).toBe('en-US');
        expect(schema2.parse('en-US')).toBe('en-US');
        expect(schema3.parse('en-US')).toBe('en-US');
      });
    });

    describe('Invalid Codes', () => {
      it('should reject too short codes', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(() => schema.parse('a')).toThrow();
      });

      it('should reject too long codes', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(() => schema.parse('very-long-code')).toThrow();
      });

      it('should reject empty string', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(() => schema.parse('')).toThrow();
      });

      it('should reject numeric codes', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(() => schema.parse('123')).toThrow();
      });

      it('should reject special characters', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(() => schema.parse('en@US')).toThrow();
      });

      it('should reject underscore separator', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(() => schema.parse('en_US')).toThrow();
      });

      it('should reject three-part codes', () => {
        const schema = createDifferentLanguageSchema('source');
        expect(() => schema.parse('en-US-x')).toThrow();
      });
    });

    describe('Consistency with LanguageCodeSchema', () => {
      it('should produce same result as LanguageCodeSchema for valid codes', () => {
        const schema = createDifferentLanguageSchema('source');
        const testCodes = ['en-US', 'tr-TR', 'zh-CN', 'pt-BR', 'ja-JP'];

        testCodes.forEach(code => {
          const lower = code.toLowerCase();
          const schemaResult = schema.parse(lower);
          const baseResult = LanguageCodeSchema.parse(lower);
          // Both should normalize the code
          expect(schemaResult).toBe(baseResult);
        });
      });
    });
  });
});
