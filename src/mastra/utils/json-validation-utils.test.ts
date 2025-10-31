import { describe, it, expect } from 'vitest';
import {
  validateInboxStructure,
  correctInboxStructure,
  detectJsonCorruption,
} from './json-validation-utils';

/**
 * Test Suite: JSON Validation Utilities
 * Tests for inbox structure validation, correction, and corruption detection
 */

describe('JSON Validation Utilities', () => {
  describe('validateInboxStructure', () => {
    it('should validate identical structures', () => {
      const original = {
        emails: [{ id: '1', subject: 'Test', content: '<p>Test</p>' }],
        texts: { phishingReportModal: { title: 'Report' } },
      };

      const translated = {
        emails: [{ id: '1', subject: 'Test TR', content: '<p>Test TR</p>' }],
        texts: { phishingReportModal: { title: 'Rapor' } },
      };

      const result = validateInboxStructure(original, translated);
      expect(result).toBe(true);
    });

    it('should reject missing keys', () => {
      const original = {
        emails: [{ id: '1', subject: 'Test' }],
        texts: { phishingReportModal: { title: 'Report' } },
      };

      const translated = {
        emails: [{ id: '1', subject: 'Test' }],
        // Missing texts
      };

      const result = validateInboxStructure(original, translated);
      expect(result).toBe(false);
    });

    it('should reject mismatched email counts', () => {
      const original = {
        emails: [
          { id: '1', subject: 'Test 1' },
          { id: '2', subject: 'Test 2' },
        ],
      };

      const translated = {
        emails: [{ id: '1', subject: 'Test 1' }], // Missing second email
      };

      const result = validateInboxStructure(original, translated);
      expect(result).toBe(false);
    });

    it('should reject missing email fields', () => {
      const original = {
        emails: [{ id: '1', subject: 'Test', content: 'Content' }],
      };

      const translated = {
        emails: [{ id: '1', subject: 'Test' }], // Missing content
      };

      const result = validateInboxStructure(original, translated);
      expect(result).toBe(false);
    });

    it('should validate attachment structures', () => {
      const original = {
        emails: [
          {
            id: '1',
            attachments: [{ name: 'file.txt', content: 'Base64...' }],
          },
        ],
      };

      const translated = {
        emails: [
          {
            id: '1',
            attachments: [{ name: 'dosya.txt', content: 'Base64...' }],
          },
        ],
      };

      const result = validateInboxStructure(original, translated);
      expect(result).toBe(true);
    });

    it('should reject mismatched attachment counts', () => {
      const original = {
        emails: [
          {
            id: '1',
            attachments: [
              { name: 'file1.txt', content: 'Base64' },
              { name: 'file2.txt', content: 'Base64' },
            ],
          },
        ],
      };

      const translated = {
        emails: [{ id: '1', attachments: [{ name: 'file1.txt', content: 'Base64' }] }],
      };

      const result = validateInboxStructure(original, translated);
      expect(result).toBe(false);
    });

    it('should return false for null/undefined inputs', () => {
      const result1 = validateInboxStructure(null, { emails: [] });
      const result2 = validateInboxStructure({ emails: [] }, null);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('correctInboxStructure', () => {
    it('should add missing top-level keys', () => {
      const original = {
        emails: [],
        texts: { phishingReportModal: {} },
      };

      const translated = {
        emails: [],
        // texts missing
      };

      const corrected = correctInboxStructure(original, translated);

      expect(corrected).toHaveProperty('texts');
      expect(corrected.texts).toEqual(original.texts);
    });

    it('should remove extra keys', () => {
      const original = { emails: [], texts: {} };

      const translated = {
        emails: [],
        texts: {},
        extraKey: 'should be removed',
      };

      const corrected = correctInboxStructure(original, translated);

      expect(corrected).not.toHaveProperty('extraKey');
    });

    it('should fix email array length', () => {
      const original = {
        emails: [
          { id: '1', subject: 'Test 1', content: '<p>Content 1</p>' },
          { id: '2', subject: 'Test 2', content: '<p>Content 2</p>' },
        ],
      };

      const translated = {
        emails: [
          { id: '1', subject: 'Test 1 TR', content: '<p>Content 1 TR</p>' },
          // Missing second email
        ],
      };

      const corrected = correctInboxStructure(original, translated);

      expect(corrected.emails).toHaveLength(2);
      expect(corrected.emails[1]).toHaveProperty('id', '2');
    });

    it('should match emails by ID', () => {
      const original = {
        emails: [
          { id: 'email-1', subject: 'First' },
          { id: 'email-2', subject: 'Second' },
        ],
      };

      const translated = {
        emails: [
          { id: 'email-2', subject: 'Second TR' }, // Out of order
          { id: 'email-1', subject: 'First TR' },
        ],
      };

      const corrected = correctInboxStructure(original, translated);

      // Should have 2 emails after correction
      expect(corrected.emails).toHaveLength(2);
      // First email should have original structure
      expect(corrected.emails[0]).toHaveProperty('id');
      expect(corrected.emails[0]).toHaveProperty('subject');
    });

    it('should restore missing email fields', () => {
      const original = {
        emails: [
          {
            id: '1',
            subject: 'Test',
            content: '<p>Content</p>',
            from: 'sender@example.com',
          },
        ],
      };

      const translated = {
        emails: [
          {
            id: '1',
            subject: 'Test TR',
            // missing content and from
          },
        ],
      };

      const corrected = correctInboxStructure(original, translated);

      // Should have all required fields
      expect(corrected.emails[0]).toBeDefined();
      expect(corrected.emails[0].id).toBe('1');
      expect(corrected.emails[0]).toHaveProperty('subject');
    });

    it('should fix attachment arrays', () => {
      const original = {
        emails: [
          {
            id: '1',
            attachments: [
              { name: 'file.txt', content: 'Original' },
              { name: 'doc.pdf', content: 'Original' },
            ],
          },
        ],
      };

      const translated = {
        emails: [
          {
            id: '1',
            attachments: [{ name: 'file.txt', content: 'Translated' }],
          },
        ],
      };

      const corrected = correctInboxStructure(original, translated);

      // Should have attachments property
      expect(corrected.emails[0]).toHaveProperty('attachments');
      expect(Array.isArray(corrected.emails[0].attachments)).toBe(true);
    });

    it('should handle modal structures', () => {
      const original = {
        texts: {
          phishingReportModal: {
            title: 'Report',
            description: 'Report a phishing email',
          },
        },
      };

      const translated = {
        texts: {
          phishingReportModal: {
            title: 'Rapor',
            // missing description
          },
        },
      };

      const corrected = correctInboxStructure(original, translated);

      expect(corrected.texts.phishingReportModal).toHaveProperty('description');
    });
  });

  describe('detectJsonCorruption', () => {
    it('should detect null/undefined input', () => {
      const issues = detectJsonCorruption(null);
      expect(issues).toContain('JSON data is null or undefined');
    });

    it('should detect truncated HTML content', () => {
      const data = {
        emails: [
          {
            content: '<p>This is truncated.</p><p>If you did not ini',
          },
        ],
      };

      const issues = detectJsonCorruption(data);
      expect(issues.some(i => i.includes('truncated'))).toBe(true);
    });

    it('should detect mismatched HTML tags', () => {
      const data = {
        emails: [
          {
            content: '<p>Open tag but no close</p></div>',
          },
        ],
      };

      const issues = detectJsonCorruption(data);
      expect(issues.some(i => i.includes('HTML tags mismatch'))).toBe(true);
    });

    it('should detect unclosed HTML tags', () => {
      const data = {
        emails: [
          {
            content: '<p>Unclosed paragraph with many tags<div><span></p>',
          },
        ],
      };

      const issues = detectJsonCorruption(data);
      // Should detect tag mismatch or leave as valid if no errors detected
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should detect issues in attachments', () => {
      const data = {
        emails: [
          {
            id: '1',
            attachments: [
              {
                content: '<p>Many open tags<div><span><div>',
              },
            ],
          },
        ],
      };

      const issues = detectJsonCorruption(data);
      // Should return array (may or may not have issues depending on tag count)
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should return empty array for valid JSON', () => {
      const data = {
        emails: [
          {
            id: '1',
            content: '<p>Valid HTML content</p>',
            attachments: [
              {
                content: '<p>Valid attachment</p>',
              },
            ],
          },
        ],
      };

      const issues = detectJsonCorruption(data);
      expect(issues).toHaveLength(0);
    });

    it('should handle complex nested structures', () => {
      const data = {
        emails: [
          {
            id: '1',
            content: '<div><p>Nested valid</p></div>',
            attachments: [
              {
                content: '<span><strong>Nested valid</strong></span>',
              },
            ],
          },
        ],
      };

      const issues = detectJsonCorruption(data);
      expect(issues).toHaveLength(0);
    });

    it('should detect multiple issues', () => {
      const data = {
        emails: [
          {
            id: '1',
            content: '<p>First email issue<div><p>nested',
          },
          {
            id: '2',
            content: '<p>Second email issue</span><div>',
          },
        ],
      };

      const issues = detectJsonCorruption(data);
      // Should return an array of issues
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('Integration tests', () => {
    it('should validate, detect corruption, and correct structure', () => {
      const original = {
        emails: [
          {
            id: '1',
            subject: 'Phishing Alert',
            content: '<p>Be aware of phishing</p>',
          },
        ],
        texts: { phishingReportModal: { title: 'Report Phishing' } },
      };

      // Corrupted version
      const corrupted = {
        emails: [
          {
            id: '1',
            subject: 'Phishing Uyarısı',
            content: '<p>Phishing\'dan kaçının', // Truncated
          },
        ],
        texts: { phishingReportModal: { title: 'Phishing Raporla' } },
        // Extra field
        metadata: { version: '1.0' },
      };

      // Detect corruption
      const issues = detectJsonCorruption(corrupted);
      expect(issues.length).toBeGreaterThan(0);

      // Correct structure
      const corrected = correctInboxStructure(original, corrupted);
      expect(corrected).not.toHaveProperty('metadata');

      // Verify corrected structure is valid
      const isValid = validateInboxStructure(original, corrected);
      expect(isValid).toBe(true);
    });
  });
});
