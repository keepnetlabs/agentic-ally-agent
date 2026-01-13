import { describe, it, expect } from 'vitest';
import {
  validateBCP47LanguageCode,
  generateMicrolearningId,
  normalizeDepartmentName,
  DEFAULT_LANGUAGE,
} from './language-utils';

describe('language-utils', () => {
  // ==================== DEFAULT LANGUAGE ====================
  describe('DEFAULT_LANGUAGE constant', () => {
    it('should be en-gb', () => {
      expect(DEFAULT_LANGUAGE).toBe('en-gb');
    });

    it('should be used as fallback for invalid inputs', () => {
      const result = validateBCP47LanguageCode('');
      expect(result).toBe(DEFAULT_LANGUAGE);
    });
  });

  // ==================== validateBCP47LanguageCode - VALID CODES ====================
  describe('validateBCP47LanguageCode - Valid Language Codes', () => {
    it('should accept en-gb', () => {
      expect(validateBCP47LanguageCode('en-gb')).toBe('en-GB');
    });

    it('should accept en-us', () => {
      const result = validateBCP47LanguageCode('en-us');
      expect(result).toMatch(/^en-US/i);
    });

    it('should accept tr-tr (Turkish)', () => {
      expect(validateBCP47LanguageCode('tr-tr')).toBe('tr-TR');
    });

    it('should accept fr-fr (French)', () => {
      expect(validateBCP47LanguageCode('fr-fr')).toBe('fr-FR');
    });

    it('should accept de-de (German)', () => {
      expect(validateBCP47LanguageCode('de-de')).toBe('de-DE');
    });

    it('should accept es-es (Spanish)', () => {
      expect(validateBCP47LanguageCode('es-es')).toBe('es-ES');
    });

    it('should accept pt-pt (Portuguese)', () => {
      expect(validateBCP47LanguageCode('pt-pt')).toBe('pt-PT');
    });

    it('should accept ja-jp (Japanese)', () => {
      expect(validateBCP47LanguageCode('ja-jp')).toBe('ja-JP');
    });

    it('should accept zh-cn (Chinese Simplified)', () => {
      expect(validateBCP47LanguageCode('zh-cn')).toBe('zh-CN');
    });

    it('should accept ar-sa (Arabic)', () => {
      expect(validateBCP47LanguageCode('ar-sa')).toBe('ar-SA');
    });

    it('should accept ko-kr (Korean)', () => {
      expect(validateBCP47LanguageCode('ko-kr')).toBe('ko-KR');
    });

    it('should accept nl-nl (Dutch)', () => {
      expect(validateBCP47LanguageCode('nl-nl')).toBe('nl-NL');
    });

    it('should accept pl-pl (Polish)', () => {
      expect(validateBCP47LanguageCode('pl-pl')).toBe('pl-PL');
    });

    it('should accept sv-se (Swedish)', () => {
      expect(validateBCP47LanguageCode('sv-se')).toBe('sv-SE');
    });

    it('should accept no-no (Norwegian)', () => {
      expect(validateBCP47LanguageCode('no-no')).toBe('no-NO');
    });

    it('should accept da-dk (Danish)', () => {
      expect(validateBCP47LanguageCode('da-dk')).toBe('da-DK');
    });

    it('should accept fi-fi (Finnish)', () => {
      expect(validateBCP47LanguageCode('fi-fi')).toBe('fi-FI');
    });

    it('should accept ru-ru (Russian)', () => {
      expect(validateBCP47LanguageCode('ru-ru')).toBe('ru-RU');
    });

    it('should accept it-it (Italian)', () => {
      expect(validateBCP47LanguageCode('it-it')).toBe('it-IT');
    });
  });

  // ==================== validateBCP47LanguageCode - ALIASES ====================
  describe('validateBCP47LanguageCode - Language Aliases', () => {
    it('should convert "english" to en-GB', () => {
      const result = validateBCP47LanguageCode('english');
      expect(result).toMatch(/^en-/);
    });

    it('should convert "turkish" to tr-TR', () => {
      const result = validateBCP47LanguageCode('turkish');
      expect(result).toMatch(/^tr-/);
    });

    it('should convert "türkçe" to tr-TR', () => {
      const result = validateBCP47LanguageCode('türkçe');
      expect(result).toMatch(/^tr-/);
    });

    it('should convert "french" to fr-FR', () => {
      const result = validateBCP47LanguageCode('french');
      expect(result).toMatch(/^fr-/);
    });

    it('should convert "german" to de-DE', () => {
      const result = validateBCP47LanguageCode('german');
      expect(result).toMatch(/^de-/);
    });

    it('should convert "spanish" to es-ES', () => {
      const result = validateBCP47LanguageCode('spanish');
      expect(result).toMatch(/^es-/);
    });

    it('should convert "portuguese" to pt-PT', () => {
      const result = validateBCP47LanguageCode('portuguese');
      expect(result).toMatch(/^pt-/);
    });

    it('should convert "chinese" to zh-CN', () => {
      const result = validateBCP47LanguageCode('chinese');
      expect(result).toMatch(/^zh-/);
    });

    it('should convert "japanese" to ja-JP', () => {
      const result = validateBCP47LanguageCode('japanese');
      expect(result).toMatch(/^ja-/);
    });

    it('should convert "arabic" to ar-SA', () => {
      const result = validateBCP47LanguageCode('arabic');
      expect(result).toMatch(/^ar-/);
    });

    it('should convert "korean" to ko-KR', () => {
      const result = validateBCP47LanguageCode('korean');
      expect(result).toMatch(/^ko-/);
    });

    it('should handle case-insensitive aliases', () => {
      const result1 = validateBCP47LanguageCode('ENGLISH');
      const result2 = validateBCP47LanguageCode('English');
      const result3 = validateBCP47LanguageCode('english');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle underscores in aliases', () => {
      const result = validateBCP47LanguageCode('en_gb');
      expect(result).toBe('en-GB');
    });
  });

  // ==================== validateBCP47LanguageCode - LEGACY FIXES ====================
  describe('validateBCP47LanguageCode - Legacy/Typo Fixes', () => {
    it('should convert en-uk to en-gb', () => {
      expect(validateBCP47LanguageCode('en-uk')).toBe('en-GB');
    });

    it('should handle en-UK (uppercase) to en-GB', () => {
      expect(validateBCP47LanguageCode('en-UK')).toBe('en-GB');
    });

    it('should handle En-Uk (mixed case)', () => {
      const result = validateBCP47LanguageCode('En-Uk');
      expect(result).toContain('en');
      expect(result).toContain('GB');
    });
  });

  // ==================== validateBCP47LanguageCode - NORMALIZATION ====================
  describe('validateBCP47LanguageCode - BCP-47 Normalization', () => {
    it('should normalize to lowercase language, uppercase region', () => {
      const result = validateBCP47LanguageCode('EN-GB');
      expect(result).toBe('en-GB');
    });

    it('should handle mixed case correctly', () => {
      const result = validateBCP47LanguageCode('En-Gb');
      expect(result).toBe('en-GB');
    });

    it('should preserve script subtags (4-letter codes)', () => {
      const result = validateBCP47LanguageCode('zh-Hans-CN');
      expect(result).toContain('zh');
      expect(result).toContain('CN');
    });

    it('should handle extension subtags', () => {
      const result = validateBCP47LanguageCode('en-GB-x-twain');
      expect(result).toBeDefined();
    });
  });

  // ==================== validateBCP47LanguageCode - DEFAULT REGIONS ====================
  describe('validateBCP47LanguageCode - Default Region Assignment', () => {
    it('should add GB for language code "en" without region', () => {
      const result = validateBCP47LanguageCode('en');
      expect(result).toBe('en-GB');
    });

    it('should add TR for language code "tr" without region', () => {
      const result = validateBCP47LanguageCode('tr');
      expect(result).toBe('tr-TR');
    });

    it('should add FR for language code "fr" without region', () => {
      const result = validateBCP47LanguageCode('fr');
      expect(result).toBe('fr-FR');
    });

    it('should add DE for language code "de" without region', () => {
      const result = validateBCP47LanguageCode('de');
      expect(result).toBe('de-DE');
    });

    it('should add ES for language code "es" without region', () => {
      const result = validateBCP47LanguageCode('es');
      expect(result).toBe('es-ES');
    });

    it('should add CN for language code "zh" without region', () => {
      const result = validateBCP47LanguageCode('zh');
      expect(result).toBe('zh-CN');
    });

    it('should add JP for language code "ja" without region', () => {
      const result = validateBCP47LanguageCode('ja');
      expect(result).toBe('ja-JP');
    });

    it('should preserve provided region', () => {
      const result = validateBCP47LanguageCode('en-us');
      expect(result).toContain('en');
      expect(result).toContain('US');
    });

    it('should not override explicit region with default', () => {
      const result = validateBCP47LanguageCode('en-au');
      expect(result).toContain('AU');
      expect(result).not.toContain('GB');
    });
  });

  // ==================== validateBCP47LanguageCode - INVALID INPUTS ====================
  describe('validateBCP47LanguageCode - Invalid Inputs', () => {
    it('should return default for empty string', () => {
      expect(validateBCP47LanguageCode('')).toBe(DEFAULT_LANGUAGE);
    });

    it('should return default for whitespace only', () => {
      expect(validateBCP47LanguageCode('   ')).toBe(DEFAULT_LANGUAGE);
    });

    it('should return default for null/undefined', () => {
      expect(validateBCP47LanguageCode(undefined as any)).toBe(DEFAULT_LANGUAGE);
      expect(validateBCP47LanguageCode(null as any)).toBe(DEFAULT_LANGUAGE);
    });

    it('should handle quoted strings', () => {
      const result = validateBCP47LanguageCode('"en-gb"');
      expect(result).toBe('en-GB');
    });

    it('should handle single quoted strings', () => {
      const result = validateBCP47LanguageCode("'en-gb'");
      expect(result).toBe('en-GB');
    });

    it('should handle numeric inputs', () => {
      const result = validateBCP47LanguageCode('123');
      expect(result).toBeDefined();
    });

    it('should handle special characters', () => {
      const result = validateBCP47LanguageCode('en!@#$%^&*()');
      expect(result).toBeDefined();
    });
  });

  // ==================== validateBCP47LanguageCode - CONSISTENCY ====================
  describe('validateBCP47LanguageCode - Consistency', () => {
    it('should return same result for same input (deterministic)', () => {
      const input = 'en-gb';
      const result1 = validateBCP47LanguageCode(input);
      const result2 = validateBCP47LanguageCode(input);

      expect(result1).toBe(result2);
    });

    it('should return same result for equivalent inputs', () => {
      const result1 = validateBCP47LanguageCode('english');
      const result2 = validateBCP47LanguageCode('en');

      expect(result1).toBe(result2);
    });

    it('should be idempotent (applying twice gives same result)', () => {
      const input = 'en-gb';
      const result1 = validateBCP47LanguageCode(input);
      const result2 = validateBCP47LanguageCode(result1);

      expect(result1).toBe(result2);
    });
  });

  // ==================== generateMicrolearningId ====================
  describe('generateMicrolearningId', () => {
    it('should generate ID from topic', () => {
      const id = generateMicrolearningId('Phishing Prevention');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should convert to lowercase', () => {
      const id = generateMicrolearningId('PHISHING PREVENTION');

      expect(id).toMatch(/^phishing/);
      expect(id).not.toMatch(/[A-Z]/);
    });

    it('should replace spaces with hyphens', () => {
      const id = generateMicrolearningId('Phishing Prevention Training');

      expect(id).toContain('phishing-prevention-training');
    });

    it('should remove special characters', () => {
      const id = generateMicrolearningId('SQL Injection!@#$%^&*() Prevention');

      expect(id).not.toMatch(/[!@#$%^&*()]/);
    });

    it('should include timestamp suffix', () => {
      const id = generateMicrolearningId('Test Topic');

      // Should have format like "test-topic-123456"
      const parts = id.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(2);

      // Last part should be 8-character hex UUID segment
      const lastPart = parts[parts.length - 1];
      expect(lastPart).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should limit slug to 50 characters', () => {
      const longTopic = 'This is a very long topic name that should be truncated to 50 characters';
      const id = generateMicrolearningId(longTopic);

      // Extract slug part (without timestamp)
      const slugPart = id.substring(0, id.lastIndexOf('-'));
      expect(slugPart.length).toBeLessThanOrEqual(50);
    });

    it('should generate unique IDs for same topic (due to timestamp)', () => {
      const id1 = generateMicrolearningId('Test');
      // Small delay to ensure different timestamp
      const id2 = generateMicrolearningId('Test');

      expect(id1).not.toBe(id2);
    });

    it('should handle empty string', () => {
      const id = generateMicrolearningId('');

      expect(id).toBeDefined();
      expect(id).toMatch(/^-[a-f0-9]{8}$/);
    });

    it('should handle special Turkish characters', () => {
      const id = generateMicrolearningId('Phishing Önleme Eğitimi');

      expect(id).toBeDefined();
      expect(id.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const id = generateMicrolearningId('网络钓鱼防护');

      expect(id).toBeDefined();
      expect(id).toMatch(/^-[a-f0-9]{8}$/); // All non-ASCII removed, UUID suffix appended
    });

    it('should handle multiple spaces', () => {
      const id = generateMicrolearningId('Phishing   Prevention    Training');

      expect(id).toContain('phishing-prevention-training');
    });

    it('should handle hyphens in input', () => {
      const id = generateMicrolearningId('Phishing-Prevention-Training');

      expect(id).toContain('phishing-prevention-training');
    });

    it('should be deterministic for alphanumeric input (excluding timestamp)', () => {
      // Note: timestamp makes full ID non-deterministic, but slug should be
      const topic = 'Test Topic 123';
      const id1 = generateMicrolearningId(topic);
      const id2 = generateMicrolearningId(topic);

      // Extract slug parts (without timestamp)
      const slug1 = id1.substring(0, id1.lastIndexOf('-'));
      const slug2 = id2.substring(0, id2.lastIndexOf('-'));

      expect(slug1).toBe(slug2);
    });
  });

  // ==================== normalizeDepartmentName ====================
  describe('normalizeDepartmentName', () => {
    it('should convert to lowercase', () => {
      expect(normalizeDepartmentName('IT')).toBe('it');
    });

    it('should replace spaces with hyphens', () => {
      expect(normalizeDepartmentName('Human Resources')).toBe('human-resources');
    });

    it('should handle multiple spaces', () => {
      expect(normalizeDepartmentName('Human    Resources')).toBe('human-resources');
    });

    it('should remove special characters', () => {
      expect(normalizeDepartmentName('IT & Security')).toBe('it--security');
    });

    it('should keep hyphens', () => {
      expect(normalizeDepartmentName('IT-Security')).toBe('it-security');
    });

    it('should remove parentheses', () => {
      expect(normalizeDepartmentName('Sales (EMEA)')).toBe('sales-emea');
    });

    it('should handle all departments', () => {
      const departments = [
        'IT',
        'HR',
        'Sales',
        'Finance',
        'Operations',
        'Management',
        'All',
      ];

      departments.forEach(dept => {
        const normalized = normalizeDepartmentName(dept);
        expect(normalized).toMatch(/^[a-z0-9\-]+$/);
      });
    });

    it('should normalize "Human Resources"', () => {
      expect(normalizeDepartmentName('Human Resources')).toBe('human-resources');
    });

    it('should normalize "Customer Service"', () => {
      expect(normalizeDepartmentName('Customer Service')).toBe('customer-service');
    });

    it('should handle mixed case', () => {
      expect(normalizeDepartmentName('It DePaRtMeNt')).toBe('it-department');
    });

    it('should remove symbols and punctuation', () => {
      expect(normalizeDepartmentName("IT's Department")).toBe('its-department');
    });

    it('should handle Turkish special characters', () => {
      const normalized = normalizeDepartmentName('Bilişim Departmanı');
      expect(normalized).toMatch(/^[a-z0-9\-]+$/);
    });

    it('should handle empty string', () => {
      expect(normalizeDepartmentName('')).toBe('');
    });

    it('should handle whitespace only', () => {
      expect(normalizeDepartmentName('   ')).toBe('-');
    });

    it('should be idempotent', () => {
      const dept = 'Human Resources';
      const result1 = normalizeDepartmentName(dept);
      const result2 = normalizeDepartmentName(result1);

      expect(result1).toBe(result2);
    });

    it('should produce valid file path component', () => {
      const departments = ['IT', 'Human Resources', 'Finance', 'Sales'];

      departments.forEach(dept => {
        const normalized = normalizeDepartmentName(dept);
        // Should not contain invalid path characters
        expect(normalized).not.toMatch(/[\/\\:*?"<>|]/);
      });
    });

    it('should handle leading/trailing spaces', () => {
      expect(normalizeDepartmentName('  IT Department  ')).toBe('-it-department-');
    });

    it('should handle numbers', () => {
      expect(normalizeDepartmentName('IT Department 2')).toBe('it-department-2');
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration - Language + Microlearning ID', () => {
    it('should work together for full workflow', () => {
      const language = validateBCP47LanguageCode('english');
      const mlId = generateMicrolearningId('Phishing Prevention');

      expect(language).toBeDefined();
      expect(mlId).toBeDefined();
      expect(language).toMatch(/^en-/);
      expect(mlId).toContain('phishing');
    });

    it('should work with department normalization', () => {
      const dept = normalizeDepartmentName('Human Resources');
      const mlId = generateMicrolearningId('Phishing Training for HR');

      expect(dept).toBe('human-resources');
      expect(mlId).toContain('phishing');
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle very long language code', () => {
      const result = validateBCP47LanguageCode('en-Latn-US-x-very-long-extension-code');
      expect(result).toBeDefined();
    });

    it('should handle topic with only numbers', () => {
      const id = generateMicrolearningId('12345678');
      expect(id).toMatch(/^\d+-[a-f0-9]{8}$/);
    });

    it('should handle department with only numbers', () => {
      const normalized = normalizeDepartmentName('123456');
      expect(normalized).toBe('123456');
    });

    it('should handle mixed scripts', () => {
      const id = generateMicrolearningId('English 英語 中文');
      expect(id).toBeDefined();
    });

    it('should handle emoji in topic', () => {
      const id = generateMicrolearningId('Phishing 🎣 Prevention');
      expect(id).toBeDefined();
    });

    it('should handle emoji in department', () => {
      const normalized = normalizeDepartmentName('IT 🚀 Department');
      expect(normalized).toBeDefined();
    });
  });
});
