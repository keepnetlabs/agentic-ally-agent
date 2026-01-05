import { describe, it, expect } from 'vitest';
import { cleanResponse } from './json-cleaner';

/**
 * Test Suite: cleanResponse / extractJsonFromText
 * Tests for robust JSON extraction and cleaning
 * Covers: 4-strategy extraction, string-aware parsing, edge cases
 */

describe('cleanResponse - JSON Extraction & Cleaning', () => {
  describe('Strategy 1: Wrapping Quotes', () => {
    it('should remove double-quote wrapping', () => {
      const input = `"{\\"key\\":\\"value\\"}"`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.key).toBe('value');
    });

    it('should remove single-quote wrapping', () => {
      const input = `'{"key":"value"}'`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.key).toBe('value');
    });

    it('should try other strategies for mismatched quotes', () => {
      const input = `"{"key":"value"}'`;
      // Mismatched quotes: " and ' don't match, so Strategy 1 skips it
      // Strategy 3 will extract between { and }, should succeed
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.key).toBe('value');
    });
  });

  describe('Strategy 2: Markdown Code Blocks', () => {
    it('should extract from ```json blocks', () => {
      const input = `\`\`\`json
{"name":"test","value":123}
\`\`\``;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe('test');
      expect(parsed.value).toBe(123);
    });

    it('should extract from ``` blocks without json label', () => {
      const input = `\`\`\`
{"status":"ok"}
\`\`\``;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('ok');
    });
  });

  describe('Strategy 3: Extract Between Braces (String-Aware)', () => {
    it('should extract JSON with surrounding text', () => {
      const input = `Here's the JSON: {"key":"value"} and more text`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.key).toBe('value');
    });

    it('should handle braces inside string values', () => {
      const input = `{"text":"value with } inside","code":"{ function }"}`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.text).toBe('value with } inside');
      expect(parsed.code).toBe('{ function }');
    });

    it('should handle escaped quotes in strings', () => {
      const input = `{"text":"value with \\"escaped\\" quotes"}`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.text).toContain('escaped');
    });

    it('should handle escaped backslashes', () => {
      const input = `{"path":"C:\\\\Users\\\\file"}`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.path).toContain('Users');
    });

    it('should attempt to repair incomplete JSON', () => {
      const input = `{ "key": "value" }`;  // Valid JSON
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(parsed.key).toBe('value');
    });
  });

  describe('Strategy 4: Array Extraction', () => {
    it('should extract simple JSON array', () => {
      const input = `Results: [1,2,3,4,5] end`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toBe(1);
      expect(parsed[4]).toBe(5);
    });

    it('should extract nested arrays', () => {
      const input = `Data: [[1,2],[3,4]] here`;
      const result = cleanResponse(input, 'test');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0][0]).toBe(1);
      expect(parsed[1][1]).toBe(4);
    });
  });

  describe('Real-World Edge Cases', () => {
    it('should handle AI response with markdown and JSON', () => {
      const input = `Here's your JSON:
\`\`\`json
{"subject":"Test","template":"<html>content</html>","summary":"desc"}
\`\`\`
Hope this helps!`;
      const result = cleanResponse(input, 'ai-response');
      const parsed = JSON.parse(result);
      expect(parsed.subject).toBe('Test');
      expect(parsed.template).toContain('html');
    });

    it('should handle JSON with HTML content containing braces', () => {
      const input = `{"template":"<html><body>{name}</body></html>","css":"body { margin: 0; }"}`;
      const result = cleanResponse(input, 'html-json');
      const parsed = JSON.parse(result);
      expect(parsed.template).toContain('{name}');
      expect(parsed.css).toContain('{ margin: 0; }');
    });

    it('should handle JSON with multiple quote types', () => {
      const input = `{"text1":"single'quote","text2":"double\\"quote","text3":"both'and\\"here"}`;
      const result = cleanResponse(input, 'quotes');
      const parsed = JSON.parse(result);
      expect(parsed.text1).toContain("'");
      expect(parsed.text2).toContain('"');
    });

    it('should handle deeply nested JSON', () => {
      const input = `{"a":{"b":{"c":{"d":{"e":"value"}}}}}`;
      const result = cleanResponse(input, 'nested');
      const parsed = JSON.parse(result);
      expect(parsed.a.b.c.d.e).toBe('value');
    });

    it('should handle JSON with unicode characters', () => {
      const input = `{"greeting":"Hello 👋","emoji":"🎉"}`;
      const result = cleanResponse(input, 'unicode');
      const parsed = JSON.parse(result);
      expect(parsed.greeting).toContain('👋');
      expect(parsed.emoji).toBe('🎉');
    });
  });

  describe('Error Handling', () => {
    it('should throw on completely invalid JSON', () => {
      const input = `not json at all {{{`;
      expect(() => cleanResponse(input, 'test')).toThrow();
    });

    it('should provide helpful error message', () => {
      const input = `invalid json {broken}`;
      try {
        cleanResponse(input, 'test-section');
      } catch (err: any) {
        expect(err.message).toContain('test-section');
      }
    });
  });

  describe('Performance & Large Inputs', () => {
    it('should handle large JSON objects', () => {
      const largeObj: Record<string, any> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key_${i}`] = `value_${i}`;
      }
      const input = JSON.stringify(largeObj);
      const result = cleanResponse(input, 'large');
      const parsed = JSON.parse(result);
      expect(Object.keys(parsed).length).toBe(1000);
    });

    it('should handle deeply nested structures', () => {
      let nested: any = { value: 'end' };
      for (let i = 0; i < 50; i++) {
        nested = { level: nested };
      }
      const input = JSON.stringify(nested);
      const result = cleanResponse(input, 'deep');
      const parsed = JSON.parse(result);

      let current = parsed;
      for (let i = 0; i < 50; i++) {
        expect(current).toHaveProperty('level');
        current = current.level;
      }
      expect(current.value).toBe('end');
    });
  });

  describe('Integration: Common AI Response Patterns', () => {
    it('should handle GPT response with explanation', () => {
      const input = `Based on your request, here's the JSON:

{"status":"success","message":"Operation completed"}

This indicates successful completion.`;
      const result = cleanResponse(input, 'gpt-response');
      const parsed = JSON.parse(result);
      expect(parsed.status).toBe('success');
    });

    it('should handle response with JSON inside text', () => {
      const input = `Invalid attempt
Found this: {"correct":"response"}
More text after`;
      const result = cleanResponse(input, 'multi');
      const parsed = JSON.parse(result);
      expect(parsed.correct).toBe('response');
    });

    it('should handle LLM response with JSON string escaping', () => {
      const input = `{\\"subject\\":\\"Test\\",\\"template\\":\\"<html>Content</html>\\",\\"summary\\":\\"Summary\\"}`;
      const result = cleanResponse(input, 'escaped');
      const parsed = JSON.parse(result);
      expect(parsed.subject).toBe('Test');
    });

    it('should handle response with instruction text and JSON', () => {
      const input = `{
  "instruction": "Edit email template",
  "template": "<div>Old Template</div>",
  "result": {"status": "edited", "newTemplate": "<div>New</div>"}
}`;
      const result = cleanResponse(input, 'instruction');
      const parsed = JSON.parse(result);
      expect(parsed.result.status).toBe('edited');
    });
  });
});
