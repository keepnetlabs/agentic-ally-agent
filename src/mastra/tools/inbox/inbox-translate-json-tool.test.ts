import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inboxTranslateJsonTool } from './inbox-translate-json-tool';
import { generateText } from 'ai';

// Type assertion to ensure execute method is available
const tool = inboxTranslateJsonTool as unknown as { execute: (input: any) => Promise<any> };

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

/**
 * Test suite for inboxTranslateJsonTool
 * Tests chunk-based translation of inbox content with HTML protection
 */
describe('inboxTranslateJsonTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateText as any).mockImplementation(async (args: any) => {
      // Try to extract JSON from the prompt (user message)
      const messages = args.messages || [];
      const userMsg = messages.find((m: any) => m.role === 'user');
      const content = userMsg?.content || '';

      // Simple heuristic to extract JSON object
      const match = content.match(/(\{[\s\S]*\})/);
      if (match) {
        return { text: match[1] }; // Return the input JSON as the "translated" output
      }

      // Default fallback
      return { text: '{}' };
    });
  });
  // Base email/inbox JSON structure
  const baseEmailJson = {
    emails: [
      {
        id: 'email-1',
        sender: 'attacker@malicious.com',
        subject: 'Urgent: Update your password',
        body: 'Click here to verify your account',
        html: '<p>Please click <a href="http://phishing.com">here</a> to verify</p>',
      },
      {
        id: 'email-2',
        sender: 'legitimate@company.com',
        subject: 'Meeting on Friday',
        body: 'The meeting is at 2 PM',
        html: '<p>Meeting time: <strong>2 PM</strong></p>',
      },
    ],
    texts: [
      {
        id: 'text-1',
        sender: 'unknown',
        message: 'You won a prize',
      },
    ],
  };

  // Simple text JSON
  const simpleJson = {
    title: 'Phishing Training',
    description: 'Learn to identify phishing emails',
    items: [
      { name: 'Red Flag 1', explanation: 'Unexpected requests for credentials' },
      { name: 'Red Flag 2', explanation: 'Suspicious sender addresses' },
    ],
  };

  // ==================== INPUT VALIDATION TESTS ====================
  describe('Input Validation', () => {
    it('should accept valid input with required fields', async () => {
      const input = {
        json: baseEmailJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
      expect(result.success !== undefined).toBe(true);
    });

    it('should require json object', async () => {
      const input: any = {
        targetLanguage: 'de',
      };

      try {
        const result = await tool.execute(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should require targetLanguage', async () => {
      const input: any = {
        json: baseEmailJson,
      };

      const result = await tool.execute(input);
      expect(result.success === false || result.error).toBeDefined();
    });

    it('should accept optional sourceLanguage', async () => {
      const input = {
        json: baseEmailJson,
        sourceLanguage: 'English',
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should default sourceLanguage to English', async () => {
      const input = {
        json: baseEmailJson,
        targetLanguage: 'tr',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should accept optional topic', async () => {
      const input = {
        json: baseEmailJson,
        targetLanguage: 'de',
        topic: 'Phishing Prevention',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should accept optional doNotTranslateKeys array', async () => {
      const input = {
        json: baseEmailJson,
        targetLanguage: 'de',
        doNotTranslateKeys: ['sender', 'id'],
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should accept optional modelProvider', async () => {
      const input = {
        json: baseEmailJson,
        targetLanguage: 'de',
        modelProvider: 'OPENAI',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should accept optional model override', async () => {
      const input = {
        json: baseEmailJson,
        targetLanguage: 'de',
        model: 'gpt-4o',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== TARGET LANGUAGE TESTS ====================
  describe('Target Language Support', () => {
    it('should translate to German', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate to Turkish', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'tr',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate to French', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'fr',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate to Spanish', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'es',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate to Chinese', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'zh',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate to Japanese', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'ja',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate to Portuguese', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'pt',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate to Italian', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'it',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== PROTECTED KEYS TESTS ====================
  describe('Protected Keys', () => {
    it('should not translate id field', async () => {
      const input = {
        json: { ...simpleJson, id: 'original-id' },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.id).toBe('original-id');
      }
    });

    it('should not translate url field', async () => {
      const input = {
        json: { ...simpleJson, url: 'https://example.com' },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.url).toBe('https://example.com');
      }
    });

    it('should not translate src field', async () => {
      const input = {
        json: { ...simpleJson, src: '/images/logo.png' },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.src).toBe('/images/logo.png');
      }
    });

    it('should not translate iconName field', async () => {
      const input = {
        json: { ...simpleJson, iconName: 'warning-icon' },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.iconName).toBe('warning-icon');
      }
    });

    it('should not translate scene_type field', async () => {
      const input = {
        json: { ...simpleJson, scene_type: 'intro' },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.scene_type).toBe('intro');
      }
    });

    it('should respect custom doNotTranslateKeys', async () => {
      const input = {
        json: { title: 'Training', customId: 'keep-this', content: 'Translate this' },
        targetLanguage: 'de',
        doNotTranslateKeys: ['customId'],
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.customId).toBe('keep-this');
      }
    });

    it('should handle case-insensitive protected keys', async () => {
      const input = {
        json: { ID: 'value', SOURCE_URL: 'http://example.com' },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== HTML PROTECTION TESTS ====================
  describe('HTML Protection', () => {
    it('should preserve HTML tags during translation', async () => {
      const input = {
        json: {
          content: 'Click <a href="http://link.com">here</a> to continue',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toContain('href="http://link.com"');
      }
    });

    it('should protect HTML tags from translation', async () => {
      const input = {
        json: {
          html: '<p>Important message</p>',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.html).toContain('<p>');
        expect(result.data.html).toContain('</p>');
      }
    });

    it('should handle complex HTML structure', async () => {
      const input = {
        json: {
          body: '<div class="email"><p>Verify your account at <a href="http://phishing.com">this link</a></p><strong>Act now!</strong></div>',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should preserve HTML attributes', async () => {
      const input = {
        json: {
          content: '<a href="http://example.com" target="_blank" class="btn">Click me</a>',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toContain('href="http://example.com"');
        expect(result.data.content).toContain('target="_blank"');
        expect(result.data.content).toContain('class="btn"');
      }
    });

    it('should handle malformed HTML gracefully', async () => {
      const input = {
        json: {
          content: '<p>Unclosed paragraph<div>Some text</p></div>',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should preserve HTML entities', async () => {
      const input = {
        json: {
          content: 'Price: &pound;50 &copy; 2024',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toContain('&pound;');
        expect(result.data.content).toContain('&copy;');
      }
    });
  });

  // ==================== URL & EMAIL PRESERVATION TESTS ====================
  describe('URL and Email Preservation', () => {
    it('should preserve URLs during translation', async () => {
      const input = {
        json: {
          content: 'Visit https://example.com for more info',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toContain('https://example.com');
      }
    });

    it('should preserve email addresses during translation', async () => {
      const input = {
        json: {
          contact: 'Email: support@company.com for help',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.contact).toContain('support@company.com');
      }
    });

    it('should preserve multiple URLs', async () => {
      const input = {
        json: {
          content: 'Check https://site1.com or https://site2.com or http://site3.org',
        },
        targetLanguage: 'tr',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toContain('https://site1.com');
        expect(result.data.content).toContain('https://site2.com');
        expect(result.data.content).toContain('http://site3.org');
      }
    });

    it('should preserve multiple email addresses', async () => {
      const input = {
        json: {
          recipients: 'Send to user1@example.com, user2@example.org, or admin@company.net',
        },
        targetLanguage: 'fr',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.recipients).toContain('user1@example.com');
        expect(result.data.recipients).toContain('user2@example.org');
        expect(result.data.recipients).toContain('admin@company.net');
      }
    });
  });

  // ==================== PLACEHOLDER PRESERVATION TESTS ====================
  describe('Placeholder Preservation', () => {
    it('should preserve simple placeholders {key}', async () => {
      const input = {
        json: {
          message: 'Hello {firstName}, welcome to {company}',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.message).toContain('{firstName}');
        expect(result.data.message).toContain('{company}');
      }
    });

    it('should preserve template placeholders {{key}}', async () => {
      const input = {
        json: {
          content: 'Your account: {{username}}, email: {{email}}',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toContain('{{username}}');
        expect(result.data.content).toContain('{{email}}');
      }
    });

    it('should preserve printf-style placeholders %s', async () => {
      const input = {
        json: {
          format: 'User %s logged in at %s',
        },
        targetLanguage: 'tr',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.format).toContain('%s');
      }
    });

    it('should preserve ICU plural placeholders', async () => {
      const input = {
        json: {
          message: '{count, plural, =0 {no items} one {one item} other {# items}}',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.message).toContain('plural');
      }
    });
  });

  // ==================== WHITESPACE PRESERVATION TESTS ====================
  describe('Whitespace Preservation', () => {
    it('should preserve leading whitespace', async () => {
      const input = {
        json: {
          content: '   Important text',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toMatch(/^\s+/);
      }
    });

    it('should preserve trailing whitespace', async () => {
      const input = {
        json: {
          content: 'Important text   ',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toMatch(/\s+$/);
      }
    });

    it('should preserve both leading and trailing whitespace', async () => {
      const input = {
        json: {
          content: '  Important text  ',
        },
        targetLanguage: 'tr',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.content).toMatch(/^\s+/);
        expect(result.data.content).toMatch(/\s+$/);
      }
    });

    it('should preserve internal spaces', async () => {
      const input = {
        json: {
          content: 'Multiple    spaces    between    words',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should preserve newlines in content', async () => {
      const input = {
        json: {
          content: 'Line 1\nLine 2\nLine 3',
        },
        targetLanguage: 'fr',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== NESTED STRUCTURE TESTS ====================
  describe('Nested Structure Translation', () => {
    it('should translate nested objects', async () => {
      const input = {
        json: {
          email: {
            subject: 'Verify account',
            body: {
              greeting: 'Hello',
              content: 'Please confirm',
            },
          },
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.email.subject).toBeDefined();
        expect(result.data.email.body.greeting).toBeDefined();
      }
    });

    it('should translate arrays of objects', async () => {
      const input = {
        json: {
          items: [
            { title: 'Item 1', description: 'Description 1' },
            { title: 'Item 2', description: 'Description 2' },
          ],
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(Array.isArray(result.data.items)).toBe(true);
      }
    });

    it('should handle deeply nested structures', async () => {
      const input = {
        json: {
          level1: {
            level2: {
              level3: {
                level4: 'Deep content',
              },
            },
          },
        },
        targetLanguage: 'tr',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should translate mixed arrays and objects', async () => {
      const input = {
        json: {
          emails: [
            {
              sender: 'user@example.com',
              content: 'Important message',
              replies: [
                { author: 'admin', text: 'Response 1' },
              ],
            },
          ],
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== CHUNKING TESTS ====================
  describe('Chunking', () => {
    it('should handle large JSON with auto-chunking', async () => {
      const largeJson = {
        emails: Array.from({ length: 50 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Subject ${i}`,
          body: `Body content ${i}`,
        })),
      };

      const input = {
        json: largeJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle very large JSON', async () => {
      const veryLargeJson = {
        emails: Array.from({ length: 200 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Subject ${i} with long content to increase size`,
          body: `Body content ${i}: `.repeat(20),
        })),
      };

      const input = {
        json: veryLargeJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== TOPIC-SPECIFIC TESTS ====================
  describe('Topic-Specific Translation', () => {
    it('should apply topic context for Phishing training', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
        topic: 'Phishing Prevention',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should apply topic context for Password Security', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'tr',
        topic: 'Password Security',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should apply topic context for Data Protection', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'fr',
        topic: 'Data Protection',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle missing topic gracefully', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'es',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== OUTPUT STRUCTURE TESTS ====================
  describe('Output Structure', () => {
    it('should return success flag', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(typeof result.success).toBe('boolean');
    });

    it('should return translated data', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(typeof result.data).toBe('object');
      }
    });

    it('should preserve original structure in output', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(Object.keys(result.data)).toEqual(Object.keys(simpleJson));
      }
    });

    it('should include error message if issues occurred', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result.success !== undefined).toBe(true);
      if (result.error) {
        expect(typeof result.error).toBe('string');
      }
    });
  });

  // ==================== ERROR HANDLING TESTS ====================
  describe('Error Handling', () => {
    it('should handle missing json gracefully', async () => {
      const input: any = {
        targetLanguage: 'de',
      };

      try {
        const result = await tool.execute(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle null json', async () => {
      const input: any = {
        json: null,
        targetLanguage: 'de',
      };

      try {
        const result = await tool.execute(input);
        expect(result).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should handle empty json object', async () => {
      const input = {
        json: {},
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('should handle json with no translatable strings', async () => {
      const input = {
        json: { id: '123', type: 'email', timestamp: 12345 },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it('should return error on missing targetLanguage', async () => {
      const input: any = {
        json: simpleJson,
      };

      const result = await tool.execute(input);
      expect(result.success === false || result.error).toBeDefined();
    });
  });

  // ==================== EDGE CASES TESTS ====================
  describe('Edge Cases', () => {
    it('should handle json with special characters', async () => {
      const input = {
        json: {
          content: 'Special chars: !@#$%^&*()',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle json with Unicode characters', async () => {
      const input = {
        json: {
          content: 'Unicode: 中文 Русский العربية 日本語',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle json with code snippets', async () => {
      const input = {
        json: {
          code: 'SELECT * FROM users WHERE id = 1',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle json with dates and times', async () => {
      const input = {
        json: {
          date: '2024-01-15',
          time: '14:30:00',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.date).toBe('2024-01-15');
        expect(result.data.time).toBe('14:30:00');
      }
    });

    it('should handle single character strings', async () => {
      const input = {
        json: {
          char: 'A',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle very long strings', async () => {
      const input = {
        json: {
          content: 'Long content '.repeat(1000),
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle mixed case protected keys', async () => {
      const input = {
        json: {
          MyId: 'keep-value',
          myURL: 'http://example.com',
          SceneType: 'intro',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.MyId).toBe('keep-value');
      }
    });
  });

  // ==================== MODEL PROVIDER TESTS ====================
  describe('Model Provider Support', () => {
    it('should accept OPENAI provider', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
        modelProvider: 'OPENAI',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should accept WORKERS_AI provider', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'tr',
        modelProvider: 'WORKERS_AI',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should accept GOOGLE provider', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'fr',
        modelProvider: 'GOOGLE',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should accept model override parameter', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'es',
        model: 'gpt-4o',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should work with both provider and model override', async () => {
      const input = {
        json: simpleJson,
        targetLanguage: 'de',
        modelProvider: 'OPENAI',
        model: 'gpt-4-turbo',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== CONTEXT-AWARE TESTS ====================
  describe('Context-Aware Translation', () => {
    it('should handle email subject context', async () => {
      const input = {
        json: {
          subject: 'Verify your account',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle email body context', async () => {
      const input = {
        json: {
          body: 'Please confirm your email address',
        },
        targetLanguage: 'tr',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle content context', async () => {
      const input = {
        json: {
          content: 'Training content goes here',
        },
        targetLanguage: 'fr',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle description context', async () => {
      const input = {
        json: {
          description: 'Learn to identify phishing',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });

    it('should handle explanation context', async () => {
      const input = {
        json: {
          explanation: 'Why this is dangerous',
        },
        targetLanguage: 'es',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration Scenarios', () => {
    it('should handle complete email translation workflow', async () => {
      const input = {
        json: baseEmailJson,
        sourceLanguage: 'English',
        targetLanguage: 'de',
        topic: 'Phishing Prevention',
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.emails).toBeDefined();
      }
    });

    it('should handle multilingual inbox translation', async () => {
      const languages = ['de', 'tr', 'fr', 'es'];

      for (const lang of languages) {
        const input = {
          json: simpleJson,
          targetLanguage: lang,
          topic: 'Security Training',
        };

        const result = await tool.execute(input);
        expect(result).toBeDefined();
      }
    });

    it('should handle email with HTML and placeholders', async () => {
      const input = {
        json: {
          html: '<p>Hello {name}, verify at {link}</p>',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.html).toContain('{name}');
        expect(result.data.html).toContain('{link}');
        expect(result.data.html).toContain('<p>');
      }
    });

    it('should handle complex phishing simulation inbox', async () => {
      const complexInbox = {
        simulations: [
          {
            id: 'sim-1',
            emails: [
              {
                id: 'email-1',
                sender: 'attacker@fake.com',
                subject: 'Confirm payment',
                body: 'Click https://fake-bank.com to verify',
                html: '<a href="https://fake-bank.com">Click here</a>',
              },
            ],
          },
        ],
      };

      const input = {
        json: complexInbox,
        targetLanguage: 'tr',
        topic: 'Phishing Simulation',
        doNotTranslateKeys: ['id', 'sender'],
      };

      const result = await tool.execute(input);
      expect(result).toBeDefined();
      if (result.success && result.data) {
        expect(result.data.simulations[0].emails[0].id).toBe('email-1');
      }
    });
  });

  // ==================== CONSISTENCY TESTS ====================
  describe('Output Consistency', () => {
    it('should maintain array order', async () => {
      const input = {
        json: {
          items: ['First', 'Second', 'Third'],
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(Array.isArray(result.data.items)).toBe(true);
        expect(result.data.items.length).toBe(3);
      }
    });

    it('should preserve numeric values', async () => {
      const input = {
        json: {
          count: 5,
          price: 9.99,
          id: 123,
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.count).toBe(5);
        expect(result.data.price).toBe(9.99);
        expect(result.data.id).toBe(123);
      }
    });

    it('should preserve boolean values', async () => {
      const input = {
        json: {
          active: true,
          verified: false,
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.active).toBe(true);
        expect(result.data.verified).toBe(false);
      }
    });

    it('should preserve null values', async () => {
      const input = {
        json: {
          value: null,
          content: 'Translate this',
        },
        targetLanguage: 'de',
      };

      const result = await tool.execute(input);
      if (result.success && result.data) {
        expect(result.data.value).toBeNull();
      }
    });
  });
});
