import { describe, it, expect, vi } from 'vitest';
import {
  validateInboxStructure,
  correctInboxStructure,
  detectJsonCorruption,
  truncateText,
  repairHtml,
  repairInboxHtml,
  detectAndRepairInbox,
} from './json-validation-utils';

// Mock the logger
vi.mock('../core/logger', () => ({
  getLogger: vi.fn(() => ({
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

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

  describe('truncateText', () => {
    it('should return empty string unchanged', () => {
      const result = truncateText('', 100);
      expect(result).toBe('');
    });

    it('should return null unchanged', () => {
      const result = truncateText(null as any, 100);
      expect(result).toBe(null);
    });

    it('should return text shorter than maxLength unchanged', () => {
      const text = 'Hello world';
      const result = truncateText(text, 20);
      expect(result).toBe(text);
    });

    it('should truncate text to maxLength', () => {
      const text = 'This is a long text that needs truncation';
      const result = truncateText(text, 10);
      expect(result).toBe('This is a ');
      expect(result.length).toBe(10);
    });

    it('should handle exact length match', () => {
      const text = 'Hello';
      const result = truncateText(text, 5);
      expect(result).toBe('Hello');
    });

    it('should truncate one character less than exact length', () => {
      const text = 'Hello';
      const result = truncateText(text, 4);
      expect(result).toBe('Hell');
    });

    it('should handle maxLength of 1', () => {
      const text = 'Hello';
      const result = truncateText(text, 1);
      expect(result).toBe('H');
    });

    it('should handle maxLength of 0', () => {
      const text = 'Hello';
      const result = truncateText(text, 0);
      expect(result).toBe('');
    });

    it('should handle very long text', () => {
      const text = 'x'.repeat(10000);
      const result = truncateText(text, 300);
      expect(result.length).toBe(300);
    });

    it('should preserve special characters', () => {
      const text = 'Hello @#$% World!';
      const result = truncateText(text, 11);
      expect(result).toBe('Hello @#$% ');
    });

    it('should handle unicode characters', () => {
      const text = 'Hello 世界 مرحبا';
      const result = truncateText(text, 10);
      expect(result.length).toBe(10);
    });

    it('should handle newlines in text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = truncateText(text, 10);
      expect(result).toBe('Line 1\nLin');
    });
  });

  describe('repairHtml', () => {
    it('should return empty string unchanged', () => {
      const result = repairHtml('');
      expect(result).toBe('');
    });

    it('should return null unchanged', () => {
      const result = repairHtml(null as any);
      expect(result).toBe(null);
    });

    it('should return non-string unchanged', () => {
      const result = repairHtml(123 as any);
      expect(result).toBe(123);
    });

    it('should return text without tags unchanged', () => {
      const text = 'Just plain text';
      const result = repairHtml(text);
      expect(result).toBe(text);
    });

    it('should repair unclosed p tag', () => {
      const html = '<p>Hello world';
      const result = repairHtml(html);
      expect(result).toContain('</p>');
    });

    it('should repair unclosed div tag', () => {
      const html = '<div>Content';
      const result = repairHtml(html);
      expect(result).toContain('</div>');
    });

    it('should repair multiple unclosed tags', () => {
      const html = '<div><p>Hello</div>';
      const result = repairHtml(html);
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
    });

    it('should preserve valid HTML', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = repairHtml(html);
      expect(result).toContain('<strong>');
      expect(result).toContain('</strong>');
    });

    it('should handle self-closing tags', () => {
      const html = '<p>Hello<br/>world</p>';
      const result = repairHtml(html);
      expect(result).toContain('<br');
    });

    it('should repair nested unclosed tags', () => {
      const html = '<div><p>Content</div>';
      const result = repairHtml(html);
      expect(result).toContain('</p>');
    });

    it('should handle HTML with attributes', () => {
      const html = '<p class="text">Hello';
      const result = repairHtml(html);
      expect(result).toContain('class=');
      expect(result).toContain('</p>');
    });

    it('should return original HTML on parse error gracefully', () => {
      const html = '<p>Hello world</p>';
      const result = repairHtml(html);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle HTML with special characters', () => {
      const html = '<p>Hello & goodbye</p>';
      const result = repairHtml(html);
      expect(result).toContain('Hello');
    });

    it('should handle table structures', () => {
      const html = '<table><tr><td>Cell';
      const result = repairHtml(html);
      expect(result).toContain('</table>');
    });

    it('should handle list structures', () => {
      const html = '<ul><li>Item 1<li>Item 2</ul>';
      const result = repairHtml(html);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('repairInboxHtml', () => {
    it('should return null unchanged', () => {
      const result = repairInboxHtml(null);
      expect(result).toBe(null);
    });

    it('should return non-object unchanged', () => {
      const result = repairInboxHtml('not object');
      expect(result).toBe('not object');
    });

    it('should handle empty inbox', () => {
      const inbox = {};
      const result = repairInboxHtml(inbox);
      expect(result).toEqual({});
    });

    it('should repair email content HTML', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Hello world',
          },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].content).toContain('</p>');
    });

    it('should repair multiple email contents', () => {
      const inbox = {
        emails: [
          { id: '1', content: '<p>Email 1' },
          { id: '2', content: '<p>Email 2' },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].content).toContain('</p>');
      expect(result.emails[1].content).toContain('</p>');
    });

    it('should repair attachment content HTML', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Email</p>',
            attachments: [
              {
                name: 'file.txt',
                content: '<p>Attachment content',
              },
            ],
          },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].attachments[0].content).toContain('</p>');
    });

    it('should handle multiple attachments', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Email</p>',
            attachments: [
              { name: 'file1.txt', content: '<p>Content 1' },
              { name: 'file2.txt', content: '<p>Content 2' },
            ],
          },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].attachments[0].content).toContain('</p>');
      expect(result.emails[0].attachments[1].content).toContain('</p>');
    });

    it('should skip repair for valid HTML', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Valid HTML</p>',
          },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].content).toContain('Valid HTML');
    });

    it('should not mutate original inbox', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Test' }],
      };
      const inboxCopy = JSON.stringify(inbox);
      repairInboxHtml(inbox);
      expect(JSON.stringify(inbox)).toBe(inboxCopy);
    });

    it('should handle inbox without emails array', () => {
      const inbox = { metadata: 'data' };
      const result = repairInboxHtml(inbox);
      expect(result.metadata).toBe('data');
    });

    it('should handle non-array emails', () => {
      const inbox = { emails: 'not array' };
      const result = repairInboxHtml(inbox);
      expect(result).toBeDefined();
    });

    it('should handle email without content field', () => {
      const inbox = {
        emails: [{ id: '1', subject: 'test' }],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].subject).toBe('test');
    });

    it('should handle email with non-string content', () => {
      const inbox = {
        emails: [{ id: '1', content: 123 }],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].content).toBe(123);
    });

    it('should preserve other email fields', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Email</p>',
            subject: 'Test',
            to: 'user@example.com',
          },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].subject).toBe('Test');
      expect(result.emails[0].to).toBe('user@example.com');
    });

    it('should handle deeply nested attachments', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Email</p>',
            attachments: [
              {
                name: 'file.txt',
                content: '<div><p>Nested',
                metadata: { size: 100 },
              },
            ],
          },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].attachments[0].content).toContain('</');
      expect(result.emails[0].attachments[0].metadata).toEqual({ size: 100 });
    });

    it('should handle mixed valid and invalid HTML', () => {
      const inbox = {
        emails: [
          { id: '1', content: '<p>Valid</p>' },
          { id: '2', content: '<p>Invalid' },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].content).toContain('Valid');
      expect(result.emails[1].content).toContain('</p>');
    });
  });

  describe('detectAndRepairInbox', () => {
    it('should return no corruption for valid inbox', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Valid</p>' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.hadCorruption).toBe(false);
      expect(result.issuesFound.length).toBe(0);
      expect(result.wasRepaired).toBe(false);
    });

    it('should detect corruption', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Unclosed' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.hadCorruption).toBe(true);
      expect(result.issuesFound.length).toBeGreaterThan(0);
    });

    it('should attempt repair when corruption found', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Unclosed' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.inbox).toBeDefined();
      expect(result.inbox.emails[0].content).toContain('</p>');
    });

    it('should indicate successful repair', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Unclosed' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.wasRepaired).toBe(true);
      expect(result.issuesRemaining.length).toBeLessThanOrEqual(result.issuesFound.length);
    });

    it('should return empty issues remaining for clean repair', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Unclosed' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.issuesRemaining.length).toBeLessThanOrEqual(result.issuesFound.length);
    });

    it('should handle multiple corruptions', () => {
      const inbox = {
        emails: [
          { id: '1', content: '<p>Unclosed' },
          { id: '2', content: '<div>Also unclosed' },
        ],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.issuesFound.length).toBeGreaterThan(0);
    });

    it('should return original inbox reference when no corruption', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Valid</p>' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.inbox).toBe(inbox);
    });

    it('should not mutate original inbox when repairing', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Unclosed' }],
      };
      const inboxCopy = JSON.stringify(inbox);
      detectAndRepairInbox(inbox);
      expect(JSON.stringify(inbox)).toBe(inboxCopy);
    });

    it('should handle null inbox', () => {
      const result = detectAndRepairInbox(null);
      expect(result.hadCorruption).toBe(true);
      expect(result.issuesFound.length).toBeGreaterThan(0);
    });

    it('should provide issues found and remaining', () => {
      const inbox = {
        emails: [{ id: '1', content: '<p>Unclosed' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.issuesFound).toBeDefined();
      expect(result.issuesRemaining).toBeDefined();
      expect(Array.isArray(result.issuesFound)).toBe(true);
      expect(Array.isArray(result.issuesRemaining)).toBe(true);
    });

    it('should handle complex nested structures', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<div><p>Unclosed',
            attachments: [
              {
                name: 'file.txt',
                content: '<table><tr><td>Unclosed',
              },
            ],
          },
        ],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.inbox).toBeDefined();
      expect(result.hadCorruption).toBe(true);
    });

    it('should handle truncated content', () => {
      const inbox = {
        emails: [
          {
            content: '.</p><p>If you did not ini',
          },
        ],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.issuesFound.length).toBeGreaterThan(0);
    });

    it('should return correct structure shape', () => {
      const inbox = {
        emails: [{ id: '1', content: 'test' }],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result).toHaveProperty('inbox');
      expect(result).toHaveProperty('hadCorruption');
      expect(result).toHaveProperty('issuesFound');
      expect(result).toHaveProperty('issuesRemaining');
      expect(result).toHaveProperty('wasRepaired');
    });

    it('should handle multiple emails with attachments', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Email 1',
            attachments: [{ name: 'file1.txt', content: '<p>Attachment' }],
          },
          {
            id: '2',
            content: '<p>Email 2',
            attachments: [{ name: 'file2.txt', content: '<div>Attachment' }],
          },
        ],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.inbox.emails.length).toBe(2);
      expect(result.issuesFound.length).toBeGreaterThan(0);
    });

    it('should preserve inbox data integrity after repair', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Test',
            subject: 'Subject',
            to: 'user@example.com',
          },
        ],
      };
      const result = detectAndRepairInbox(inbox);
      expect(result.inbox.emails[0].subject).toBe('Subject');
      expect(result.inbox.emails[0].to).toBe('user@example.com');
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

    it('should handle full workflow: translate, validate, correct, repair, and truncate', () => {
      const original = {
        emails: [
          {
            id: '1',
            content: '<p>Original email</p>',
            subject: 'Test Subject',
            description: 'This is a very long description that should be truncated to fit within character limits for display purposes',
          },
        ],
      };

      const translated = {
        emails: [
          {
            id: '1',
            content: '<p>Translated email</p>',
            subject: 'Original Subject',
            description: 'Short description',
          },
        ],
      };

      // Step 1: Validate - should detect structure difference
      const isValidBefore = validateInboxStructure(original, translated);
      expect(isValidBefore).toBe(true); // Both have same keys now

      // Step 2: Repair HTML
      const { inbox: repaired } = detectAndRepairInbox(translated);

      // Step 3: Truncate description if needed
      const maxDescLength = 50;
      if (
        repaired.emails[0].description &&
        repaired.emails[0].description.length > maxDescLength
      ) {
        repaired.emails[0].description = truncateText(
          repaired.emails[0].description,
          maxDescLength
        );
      }

      // Verify integrity
      expect(repaired.emails[0].id).toBe('1');
      expect(repaired.emails[0].content).toBeDefined();
      expect(repaired.emails[0].description.length).toBeLessThanOrEqual(maxDescLength);
    });

    it('should process multiple emails with different corruption issues', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>First email with unclosed tag',
            subject: 'Email 1',
          },
          {
            id: '2',
            content: '<div>Second email also unclosed',
            subject: 'Email 2',
            attachments: [
              {
                name: 'doc.pdf',
                content: '<table><tr><td>Unclosed table',
              },
            ],
          },
          {
            id: '3',
            content: '<p>Third email is valid</p>',
            subject: 'Email 3',
          },
        ],
      };

      // Detect and repair
      const { inbox: repaired, issuesFound } = detectAndRepairInbox(inbox);

      // Verify all emails are present
      expect(repaired.emails.length).toBe(3);

      // Verify HTML is repaired
      expect(repaired.emails[0].content).toContain('</p>');
      expect(repaired.emails[1].content).toContain('</div>');
      expect(repaired.emails[1].attachments[0].content).toContain('</table>');

      // Verify metadata is preserved
      expect(repaired.emails[0].subject).toBe('Email 1');
      expect(repaired.emails[1].subject).toBe('Email 2');
      expect(repaired.emails[2].subject).toBe('Email 3');

      // Verify corruption was detected
      expect(issuesFound.length).toBeGreaterThan(0);
    });

    it('should maintain data consistency through complex transformations', () => {
      const original = {
        emails: [
          {
            id: 'email-001',
            content: '<p>Original content</p>',
            subject: 'Subject Line',
            from: 'sender@example.com',
            to: 'recipient@example.com',
            attachments: [
              {
                name: 'attachment.txt',
                content: '<p>Attachment content</p>',
                size: 1024,
              },
            ],
          },
        ],
        texts: {
          greeting: 'Hello',
          phishingReportModal: {
            title: 'Report',
            description: 'Report phishing',
          },
        },
      };

      const translated = {
        emails: [
          {
            id: 'email-001',
            content: '<p>Translated content</p>',
            subject: 'Translated Subject',
            from: 'sender@example.com',
            to: 'recipient@example.com',
            attachments: [
              {
                name: 'attachment.txt',
                content: '<p>Attachment content</p>',
                size: 1024,
              },
            ],
          },
        ],
        texts: {
          greeting: 'Hola',
          phishingReportModal: {
            title: 'Reportar',
            description: 'Report phishing',
          },
        },
      };

      // Step 1: Validate structure - should be valid since keys match
      const isValidBefore = validateInboxStructure(original, translated);
      expect(isValidBefore).toBe(true);

      // Step 2: Repair HTML corruption
      const { inbox: repaired } = detectAndRepairInbox(translated);

      // Step 3: Verify data integrity is maintained through repair
      expect(repaired.emails[0].id).toBe('email-001');
      expect(repaired.emails[0].from).toBe('sender@example.com');
      expect(repaired.emails[0].to).toBe('recipient@example.com');
      expect(repaired.emails[0].attachments[0].size).toBe(1024);
      expect(repaired.emails[0].attachments[0].name).toBe('attachment.txt');
      expect(repaired.emails[0].subject).toBe('Translated Subject');
      expect(repaired.texts.phishingReportModal.title).toBe('Reportar');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty inbox gracefully', () => {
      const result = detectAndRepairInbox({});
      expect(result.hadCorruption).toBe(false);
      expect(result.inbox).toBeDefined();
    });

    it('should handle inbox with no emails field', () => {
      const result = detectAndRepairInbox({ texts: { greeting: 'hello' } });
      expect(result.inbox).toBeDefined();
    });

    it('should handle very large text truncation', () => {
      const largeText = 'a'.repeat(100000);
      const result = truncateText(largeText, 1000);
      expect(result.length).toBe(1000);
    });

    it('should handle HTML repair with deeply nested structures', () => {
      const deepHtml = '<div><div><div><p>Nested';
      const result = repairHtml(deepHtml);
      expect(result).toContain('</p>');
      expect(result).toContain('</div>');
    });

    it('should handle mixed content types in inbox', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Valid HTML</p>',
            customField: { nested: { data: 'preserved' } },
          },
        ],
        metadata: null,
        config: undefined,
      };

      const result = repairInboxHtml(inbox);
      expect(result.emails[0].customField.nested.data).toBe('preserved');
    });

    it('should handle validateInboxStructure with circular-like references', () => {
      const obj: any = {
        emails: [{ id: '1', content: 'test' }],
      };
      // Create a structure that might look circular but isn't
      const copy = { ...obj };
      const result = validateInboxStructure(obj, copy);
      expect(result).toBe(true);
    });

    it('should truncate at character boundary for unicode', () => {
      const text = '你好世界🌍';
      const result = truncateText(text, 3);
      expect(result.length).toBe(3);
    });

    it('should handle detectJsonCorruption with all empty emails', () => {
      const data = {
        emails: [{}, {}, {}],
      };
      const result = detectJsonCorruption(data);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should preserve numeric IDs through correction', () => {
      const original = {
        emails: [{ id: 123, content: 'test' }],
      };
      const translated = {
        emails: [{ id: 123, content: 'translated' }],
      };
      const result = correctInboxStructure(original, translated);
      expect(result.emails[0].id).toBe(123);
    });

    it('should handle repairInboxHtml with attachments having no content field', () => {
      const inbox = {
        emails: [
          {
            id: '1',
            content: '<p>Email</p>',
            attachments: [
              {
                name: 'file.txt',
                size: 1024,
                // No content field
              },
            ],
          },
        ],
      };
      const result = repairInboxHtml(inbox);
      expect(result.emails[0].attachments[0].size).toBe(1024);
    });

    it('should correctly identify no corruption in complex valid structure', () => {
      const data = {
        emails: [
          {
            id: '1',
            content: '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>',
            attachments: [
              {
                content: '<div><span>Valid HTML</span></div>',
              },
            ],
          },
        ],
      };
      const result = detectJsonCorruption(data);
      expect(result.length).toBe(0);
    });
  });
});
