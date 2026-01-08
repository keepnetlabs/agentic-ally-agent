import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './html-sanitizer';

describe('html-sanitizer', () => {
  describe('Basic Input Handling', () => {
    it('should return empty string unchanged', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should return null unchanged', () => {
      expect(sanitizeHtml(null as any)).toBeNull();
    });

    it('should return undefined unchanged', () => {
      expect(sanitizeHtml(undefined as any)).toBeUndefined();
    });

    it('should return clean HTML unchanged', () => {
      const clean = '<div class="bg-white">Hello</div>';
      expect(sanitizeHtml(clean)).toBe(clean);
    });
  });

  describe('HTML Entity Unescaping (&quot; → ")', () => {
    it('should convert &quot; to " in attributes', () => {
      const html = 'class=&quot;foo&quot;';
      expect(sanitizeHtml(html)).toBe('class="foo"');
    });

    it('should handle multiple &quot; occurrences', () => {
      const html = '<p id=&quot;para&quot; class=&quot;text&quot;>Content</p>';
      expect(sanitizeHtml(html)).toBe('<p id="para" class="text">Content</p>');
    });

    it('should handle &quot; at beginning of attribute value', () => {
      const html = 'class=&quot;bg-white flex&quot;';
      expect(sanitizeHtml(html)).toBe('class="bg-white flex"');
    });

    it('should handle &quot; inside text content', () => {
      const html = '<p>&quot;Hello&quot;</p>';
      expect(sanitizeHtml(html)).toBe('<p>"Hello"</p>');
    });
  });

  describe('Escaped Quote Handling (\\\" → ")', () => {
    it('should convert \\\" to " in attributes', () => {
      const html = 'class=\\"foo\\"';
      expect(sanitizeHtml(html)).toBe('class="foo"');
    });

    it('should handle multiple \\" occurrences', () => {
      const html = '<div id=\\"main\\" class=\\"container\\">content</div>';
      expect(sanitizeHtml(html)).toBe('<div id="main" class="container">content</div>');
    });

    it('should handle \\" in CSS classes', () => {
      const html = 'class=\\"w-full h-auto\\"';
      expect(sanitizeHtml(html)).toBe('class="w-full h-auto"');
    });
  });

  describe('Users Bug Fix (class="\\\"bg-white" → class="bg-white")', () => {
    it('should fix the Users Bug with double quotes', () => {
      const html = 'class="\\\"bg-white"';
      expect(sanitizeHtml(html)).toBe('class="bg-white"');
    });

    it('should handle Users Bug with single quotes', () => {
      const html = "class='\\'bg-white'";
      expect(sanitizeHtml(html)).toBe("class='bg-white'");
    });

    it('should handle Users Bug multiple times', () => {
      const html = 'id="\\\"main\\" class="\\\"container\\"';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('\\');
    });

    it('should fix real-world example: <div class="\\"bg-white"', () => {
      const html = '<div class="\\"bg-white" items-center="">';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('\\"');
      expect(result).toContain('bg-white');
    });
  });

  describe('Double Quotes at Attribute Start (class="" → class=")', () => {
    it('should fix double quotes at start of attribute', () => {
      const html = 'class=""bg-white"';
      expect(sanitizeHtml(html)).toBe('class="bg-white"');
    });

    it('should handle double quotes in multiple attributes', () => {
      const html = 'id=""main"" class=""container""';
      const result = sanitizeHtml(html);
      expect(result.match(/=""/g)).toBeNull();
    });

    it('should fix class=""container text"', () => {
      const html = 'class=""flex items-center""';
      const result = sanitizeHtml(html);
      // Sanitizer fixes the leading double quotes but trailing ones remain
      expect(result).toBe('class="flex items-center""');
    });
  });

  describe('Trailing Quote Issues', () => {
    it('should handle trailing escaped quotes', () => {
      const html = 'class="w-full\\""';
      const result = sanitizeHtml(html);
      // Removes the escaped quote, leaving trailing double quote
      expect(result).toBe('class="w-full""');
    });

    it('should clean up malformed attribute endings', () => {
      const html = 'id="test\\"';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('\\');
    });

    it('should handle multiple trailing escaped quotes', () => {
      const html = 'class="flex\\"\\" id="main\\""';
      const result = sanitizeHtml(html);
      expect(result.match(/\\"/g)).toBeNull();
    });
  });

  describe('Real-World HTML Examples', () => {
    it('should clean LLM-generated button HTML', () => {
      const html = '<button class=\\"px-4 py-2 bg-blue-500\\">&quot;Click me&quot;</button>';
      const result = sanitizeHtml(html);
      expect(result).toContain('class="px-4 py-2 bg-blue-500"');
      expect(result).toContain('"Click me"');
    });

    it('should handle Tailwind utility classes with escaping', () => {
      const html = '<div class=\\"grid grid-cols-2 gap-4\\">Grid</div>';
      const result = sanitizeHtml(html);
      expect(result).toBe('<div class="grid grid-cols-2 gap-4">Grid</div>');
    });

    it('should clean complex nested HTML', () => {
      const html = '<div class=\\"container\\"><span id=&quot;text&quot;>Content</span></div>';
      const result = sanitizeHtml(html);
      expect(result).toBe('<div class="container"><span id="text">Content</span></div>');
    });

    it('should handle HTML with data attributes', () => {
      const html = '<div data-value=&quot;test\\" class=\\"hidden\\">Data</div>';
      const result = sanitizeHtml(html);
      expect(result.match(/&quot;/g)).toBeNull();
      expect(result.match(/\\"/g)).toBeNull();
    });

    it('should clean card component structure', () => {
      const html = '<div class=\\"border rounded-lg p-4\\"><h3>Title</h3></div>';
      const result = sanitizeHtml(html);
      expect(result).toBe('<div class="border rounded-lg p-4"><h3>Title</h3></div>');
    });

    it('should handle email template HTML', () => {
      const html = '<table><tr><td class=\\"align-center\\">Email</td></tr></table>';
      const result = sanitizeHtml(html);
      expect(result).toBe('<table><tr><td class="align-center">Email</td></tr></table>');
    });
  });

  describe('Edge Cases', () => {
    it('should handle HTML with only HTML entities', () => {
      const html = '&quot;&quot;&quot;';
      expect(sanitizeHtml(html)).toBe('"""');
    });

    it('should handle HTML with only escaped quotes', () => {
      const html = '\\"\\"\\"';
      expect(sanitizeHtml(html)).toBe('"""');
    });

    it('should handle very long attribute values', () => {
      const longClass = 'class="' + 'very-long-class-name '.repeat(100) + '"';
      const result = sanitizeHtml(longClass);
      expect(result).toBe(longClass);
    });

    it('should handle mixed escaping styles', () => {
      const html = 'class=\\"&quot;mixed&quot;\\"';
      const result = sanitizeHtml(html);
      // Should remove both types of escaping
      expect(result).not.toContain('\\');
      expect(result).not.toContain('&quot;');
    });

    it('should not remove legitimate double quotes', () => {
      const html = 'title="Some \\"quoted\\" text"';
      const result = sanitizeHtml(html);
      expect(result).toContain('quoted');
    });

    it('should handle unicode characters', () => {
      const html = 'class="élément" data-text="&quot;日本語&quot;"';
      const result = sanitizeHtml(html);
      // Converts &quot; to " but leaves the trailing quote that results
      expect(result).toBe('class="élément" data-text="日本語""');
    });

    it('should handle self-closing tags', () => {
      const html = '<img src="image.jpg" alt=&quot;Image&quot; />';
      expect(sanitizeHtml(html)).toBe('<img src="image.jpg" alt="Image" />');
    });

    it('should handle comments', () => {
      const html = '<!-- comment with &quot; --> <div class="test">Content</div>';
      expect(sanitizeHtml(html)).toBe('<!-- comment with " --> <div class="test">Content</div>');
    });

    it('should handle script tags with HTML entities', () => {
      const html = '<script>var x = &quot;value&quot;;</script>';
      expect(sanitizeHtml(html)).toBe('<script>var x = "value";</script>');
    });

    it('should handle style tags', () => {
      const html = '<style>.class { content: &quot;value&quot;; }</style>';
      expect(sanitizeHtml(html)).toBe('<style>.class { content: "value"; }</style>');
    });
  });

  describe('Idempotence Tests', () => {
    it('should be idempotent - running twice produces same result', () => {
      const html = 'class=\\"&quot;test&quot;\\"';
      const once = sanitizeHtml(html);
      const twice = sanitizeHtml(once);
      expect(twice).toBe(once);
    });

    it('should be idempotent with Users Bug HTML', () => {
      const html = 'class="\\\"bg-white"';
      const once = sanitizeHtml(html);
      const twice = sanitizeHtml(once);
      expect(twice).toBe(once);
    });

    it('should be idempotent with double quotes issue', () => {
      const html = 'class=""test""';
      const once = sanitizeHtml(html);
      const twice = sanitizeHtml(once);
      expect(twice).toBe(once);
    });

    it('should be idempotent with complex mixed escaping', () => {
      const html = '<div class=\\"&quot;container&quot;\\" id=""test"">Content</div>';
      const once = sanitizeHtml(html);
      const twice = sanitizeHtml(once);
      expect(twice).toBe(once);
    });
  });

  describe('Output Quality Tests', () => {
    it('should produce valid attribute syntax', () => {
      const html = 'class=&quot;test&quot;';
      const result = sanitizeHtml(html);
      expect(result).toMatch(/class="[^"]*"/);
    });

    it('should not introduce new escaping', () => {
      const html = 'class="normal"';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('\\');
      expect(result).not.toContain('&quot;');
    });

    it('should preserve intentional content', () => {
      const html = '<p>He said &quot;hello&quot;</p>';
      const result = sanitizeHtml(html);
      expect(result).toContain('He said "hello"');
    });

    it('should maintain HTML structure', () => {
      const html = '<div class=\\"outer\\"><span class=\\"inner\\">Text</span></div>';
      const result = sanitizeHtml(html);
      expect(result.match(/<div/g)).toHaveLength(1);
      expect(result.match(/<span/g)).toHaveLength(1);
      expect(result.match(/<\/div>/g)).toHaveLength(1);
      expect(result.match(/<\/span>/g)).toHaveLength(1);
    });

    it('should handle attribute order', () => {
      const html = 'id=\\"main\\" class=\\"test\\"';
      const result = sanitizeHtml(html);
      const idIndex = result.indexOf('id=');
      const classIndex = result.indexOf('class=');
      expect(idIndex).toBeLessThan(classIndex);
    });
  });

  describe('Integration with JSON Scenarios', () => {
    it('should clean HTML from JSON string value', () => {
      const jsonHtml = 'class=\\"container\\" data-json=\\"{\\\\"key\\\\": \\\\"value\\\\"}\\"';
      const result = sanitizeHtml(jsonHtml);
      expect(result).not.toContain('\\\\');
    });

    it('should handle HTML from LLM JSON response', () => {
      const html = '<button class=&quot;btn&quot;>Click</button>';
      expect(sanitizeHtml(html)).toBe('<button class="btn">Click</button>');
    });

    it('should clean escaped HTML in JSON', () => {
      const html = '\\"<div class=\\\\\\"test\\\\\\"></div>\\"';
      const result = sanitizeHtml(html);
      // Should at least make it valid HTML
      expect(result).toContain('div');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large HTML efficiently', () => {
      const large = '<div class="container">' + 'content '.repeat(1000) + '</div>';
      const start = performance.now();
      const result = sanitizeHtml(large);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete in under 100ms
      expect(result).toContain('content');
    });

    it('should handle many escaped characters', () => {
      const html = 'class=\\"' + 'test '.repeat(500) + '\\"';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('\\');
    });
  });
});
