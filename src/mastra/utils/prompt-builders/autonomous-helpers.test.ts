import { describe, it, expect } from 'vitest';
import { getLanguageOrDefault, buildLanguageRequirementBlock, EXAMPLE_IDS } from './autonomous-helpers';

/**
 * Test suite for Autonomous Helpers
 * Tests helper functions for autonomous prompt building
 */
describe('Autonomous Helpers', () => {
  describe('getLanguageOrDefault', () => {
    it('should return provided language', () => {
      expect(getLanguageOrDefault('en')).toBe('en');
    });

    it('should return provided language for Turkish', () => {
      expect(getLanguageOrDefault('tr')).toBe('tr');
    });

    it('should return provided language for German', () => {
      expect(getLanguageOrDefault('de')).toBe('de');
    });

    it('should default to en-gb when language is undefined', () => {
      expect(getLanguageOrDefault(undefined)).toBe('en-gb');
    });

    it('should default to en-gb when language is empty string', () => {
      expect(getLanguageOrDefault('')).toBe('en-gb');
    });

    it('should preserve language code format', () => {
      expect(getLanguageOrDefault('en-US')).toBe('en-US');
      expect(getLanguageOrDefault('zh-Hans')).toBe('zh-Hans');
    });
  });

  describe('buildLanguageRequirementBlock', () => {
    it('should include tool name in block', () => {
      const block = buildLanguageRequirementBlock('generateScene1', 'en');
      expect(block).toContain('generateScene1');
    });

    it('should include specified language', () => {
      const block = buildLanguageRequirementBlock('tool', 'tr');
      expect(block).toContain('tr');
    });

    it('should include critical marker', () => {
      const block = buildLanguageRequirementBlock('tool', 'en');
      expect(block).toContain('🔴 CRITICAL');
    });

    it('should include LANGUAGE REQUIREMENT text', () => {
      const block = buildLanguageRequirementBlock('tool', 'en');
      expect(block).toContain('LANGUAGE REQUIREMENT');
    });

    it('should include BCP-47 reference', () => {
      const block = buildLanguageRequirementBlock('tool', 'en');
      expect(block).toContain('BCP-47');
    });

    it('should default to en-gb when language not provided', () => {
      const block = buildLanguageRequirementBlock('tool');
      expect(block).toContain('en-gb');
    });

    it('should include "NOT optional" warning', () => {
      const block = buildLanguageRequirementBlock('tool', 'en');
      expect(block).toContain('NOT optional');
    });

    it('should include instruction to include language in tool call', () => {
      const block = buildLanguageRequirementBlock('myTool', 'en');
      expect(block).toContain('INCLUDE THIS LANGUAGE');
      expect(block).toContain('myTool');
    });

    it('should return a string', () => {
      const block = buildLanguageRequirementBlock('tool', 'en');
      expect(typeof block).toBe('string');
    });

    it('should be non-empty', () => {
      const block = buildLanguageRequirementBlock('tool', 'en');
      expect(block.length).toBeGreaterThan(0);
    });

    it('should work with all language codes', () => {
      const languages = ['en', 'tr', 'de', 'fr', 'zh', 'ja', 'es'];
      languages.forEach(lang => {
        const block = buildLanguageRequirementBlock('tool', lang);
        expect(block).toContain(lang);
      });
    });

    it('should work with BCP-47 language codes', () => {
      const block = buildLanguageRequirementBlock('tool', 'zh-Hans');
      expect(block).toContain('zh-Hans');
    });
  });

  describe('EXAMPLE_IDS', () => {
    it('should export EXAMPLE_IDS constant', () => {
      expect(EXAMPLE_IDS).toBeDefined();
    });

    it('should have phishing example IDs', () => {
      expect(EXAMPLE_IDS.phishing).toBeDefined();
    });

    it('should have training example IDs', () => {
      expect(EXAMPLE_IDS.training).toBeDefined();
    });

    it('should have generated ID for phishing', () => {
      expect(EXAMPLE_IDS.phishing.generated).toBe('yl2JfA4r5yYl');
    });

    it('should have resource ID for phishing', () => {
      expect(EXAMPLE_IDS.phishing.resource).toBe('scenario-abc-123456');
    });

    it('should have generated ID for training', () => {
      expect(EXAMPLE_IDS.training.generated).toBe('ml-generate-xyz123');
    });

    it('should have resource ID for training', () => {
      expect(EXAMPLE_IDS.training.resource).toBe('resource-train-789xyz');
    });

    it('should be immutable (readonly)', () => {
      expect(() => {
        (EXAMPLE_IDS as any).phishing.generated = 'new-value';
      }).toThrow();
    });

    it('should provide consistent IDs on multiple accesses', () => {
      const id1 = EXAMPLE_IDS.phishing.generated;
      const id2 = EXAMPLE_IDS.phishing.generated;
      expect(id1).toBe(id2);
    });
  });

  describe('Integration', () => {
    it('should use language helper in requirement block', () => {
      const defaultBlock = buildLanguageRequirementBlock('tool');
      expect(defaultBlock).toContain('en-gb');
    });

    it('should override language in requirement block', () => {
      const block = buildLanguageRequirementBlock('tool', 'tr');
      expect(block).toContain('tr');
      expect(block).not.toContain('en-gb');
    });
  });
});
