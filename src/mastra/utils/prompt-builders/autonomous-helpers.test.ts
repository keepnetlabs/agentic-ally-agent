import { describe, it, expect } from 'vitest';
import { getLanguageOrDefault, buildLanguageRequirementBlock, EXAMPLE_IDS } from './autonomous-helpers';

describe('autonomous-helpers', () => {
  describe('getLanguageOrDefault', () => {
    it('should return provided language when given', () => {
      expect(getLanguageOrDefault('en-us')).toBe('en-us');
    });

    it('should return en-gb when language is undefined', () => {
      expect(getLanguageOrDefault(undefined)).toBe('en-gb');
    });

    it('should return en-gb when language is empty string', () => {
      expect(getLanguageOrDefault('')).toBe('en-gb');
    });

    it('should preserve case of provided language', () => {
      expect(getLanguageOrDefault('EN-US')).toBe('EN-US');
    });

    it('should be deterministic', () => {
      const lang = 'en-gb';
      const result1 = getLanguageOrDefault(lang);
      const result2 = getLanguageOrDefault(lang);
      expect(result1).toBe(result2);
    });
  });

  describe('buildLanguageRequirementBlock', () => {
    it('should include CRITICAL header', () => {
      const block = buildLanguageRequirementBlock('generate-email');
      expect(block).toContain('🔴 CRITICAL');
    });

    it('should include LANGUAGE REQUIREMENT header', () => {
      const block = buildLanguageRequirementBlock('generate-email');
      expect(block).toContain('LANGUAGE REQUIREMENT');
    });

    it('should include provided language', () => {
      const block = buildLanguageRequirementBlock('generate-email', 'fr-fr');
      expect(block).toContain('fr-fr');
    });

    it('should include tool name', () => {
      const block = buildLanguageRequirementBlock('analyze-phishing');
      expect(block).toContain('analyze-phishing');
    });

    it('should mention BCP-47 code', () => {
      const block = buildLanguageRequirementBlock('generate-email', 'en-us');
      expect(block).toContain('BCP-47');
    });

    it('should use default language when not provided', () => {
      const block = buildLanguageRequirementBlock('generate-email');
      expect(block).toContain('en-gb');
    });

    it('should return formatted markdown string', () => {
      const block = buildLanguageRequirementBlock('generate-email', 'en-us');
      expect(block).toContain('**');
      expect(block).toContain('-');
    });

    it('should be consistent for same inputs', () => {
      const result1 = buildLanguageRequirementBlock('generate-email', 'en-us');
      const result2 = buildLanguageRequirementBlock('generate-email', 'en-us');
      expect(result1).toBe(result2);
    });
  });

  describe('EXAMPLE_IDS constant', () => {
    it('should be defined', () => {
      expect(EXAMPLE_IDS).toBeDefined();
    });

    it('should have phishing and training objects', () => {
      expect(EXAMPLE_IDS).toHaveProperty('phishing');
      expect(EXAMPLE_IDS).toHaveProperty('training');
    });

    it('should have generated and resource IDs', () => {
      expect(EXAMPLE_IDS.phishing).toHaveProperty('generated');
      expect(EXAMPLE_IDS.phishing).toHaveProperty('resource');
      expect(EXAMPLE_IDS.training).toHaveProperty('generated');
      expect(EXAMPLE_IDS.training).toHaveProperty('resource');
    });

    it('all IDs should be non-empty strings', () => {
      expect(typeof EXAMPLE_IDS.phishing.generated).toBe('string');
      expect(EXAMPLE_IDS.phishing.generated.length).toBeGreaterThan(0);
      expect(typeof EXAMPLE_IDS.training.resource).toBe('string');
      expect(EXAMPLE_IDS.training.resource.length).toBeGreaterThan(0);
    });

    it('IDs should be different from each other', () => {
      expect(EXAMPLE_IDS.phishing.generated).not.toBe(EXAMPLE_IDS.training.generated);
      expect(EXAMPLE_IDS.phishing.generated).not.toBe(EXAMPLE_IDS.phishing.resource);
    });

    it('phishing.resource should contain scenario keyword', () => {
      expect(EXAMPLE_IDS.phishing.resource.toLowerCase()).toContain('scenario');
    });

    it('training IDs should contain expected patterns', () => {
      expect(EXAMPLE_IDS.training.generated.toLowerCase()).toContain('ml-generate');
      expect(EXAMPLE_IDS.training.resource.toLowerCase()).toContain('resource-train');
    });

    it('should be consistent across accesses', () => {
      const id1 = EXAMPLE_IDS.phishing.generated;
      const id2 = EXAMPLE_IDS.phishing.generated;
      expect(id1).toBe(id2);
    });

    it('should have valid format for file paths', () => {
      const allIds = [
        EXAMPLE_IDS.phishing.generated,
        EXAMPLE_IDS.phishing.resource,
        EXAMPLE_IDS.training.generated,
        EXAMPLE_IDS.training.resource,
      ];
      allIds.forEach(id => {
        expect(id).not.toMatch(/[/\:*?"<>|]/);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work together for prompt building', () => {
      const language = getLanguageOrDefault('tr-tr');
      const block = buildLanguageRequirementBlock('generate-email', language);
      expect(block).toContain('tr-tr');
      expect(block).toContain('generate-email');
    });

    it('should build complete prompt with example IDs', () => {
      const block = buildLanguageRequirementBlock('analyze-phishing', 'en-gb');
      const prompt = `${block}\n\nExample ID: ${EXAMPLE_IDS.phishing.generated}`;
      expect(prompt).toContain('CRITICAL');
      expect(prompt).toContain(EXAMPLE_IDS.phishing.generated);
    });
  });

  describe('Consistency Tests', () => {
    it('functions should use same default language', () => {
      const lang1 = getLanguageOrDefault(undefined);
      const block = buildLanguageRequirementBlock('test');
      expect(lang1).toBe('en-gb');
      expect(block).toContain('en-gb');
    });

    it('should handle language consistently', () => {
      const lang = 'de-de';
      const getter = getLanguageOrDefault(lang);
      const block = buildLanguageRequirementBlock('test', lang);
      expect(getter).toBe(lang);
      expect(block).toContain(lang);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long tool names', () => {
      const longName = 'this-is-a-very-long-tool-name-with-many-parts';
      const block = buildLanguageRequirementBlock(longName, 'en-gb');
      expect(block).toContain(longName);
    });

    it('should handle complex language codes', () => {
      const complex = 'zh-Hans-CN-x-private';
      const result = getLanguageOrDefault(complex);
      expect(result).toBe(complex);
    });

    it('EXAMPLE_IDS should not be mutated', () => {
      const orig = EXAMPLE_IDS.phishing.generated;
      getLanguageOrDefault('en-gb');
      buildLanguageRequirementBlock('test', 'en-gb');
      expect(EXAMPLE_IDS.phishing.generated).toBe(orig);
    });
  });
});
