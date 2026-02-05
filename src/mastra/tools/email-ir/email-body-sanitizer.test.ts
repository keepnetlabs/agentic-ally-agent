import { describe, it, expect } from 'vitest';
import { sanitizeEmailBody, htmlToPlainText } from './email-body-sanitizer';

describe('sanitizeEmailBody', () => {
  it('should return empty string for null or empty input', () => {
    expect(sanitizeEmailBody('')).toBe('');
    expect(sanitizeEmailBody(null as any)).toBe('');
  });

  it('should remove base64 encoded images', () => {
    const html = '<p>Image: <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" /></p>';
    const result = sanitizeEmailBody(html);
    expect(result).toContain('[IMAGE]');
    expect(result).not.toContain('iVBORw0KGgo');
  });

  it('should remove long base64 content', () => {
    const base64String = 'A'.repeat(150);
    const html = `<p>Content: base64,${base64String}</p>`;
    const result = sanitizeEmailBody(html);
    expect(result).toContain('[BASE64_CONTENT]');
  });

  it('should remove CSS style blocks', () => {
    const html = '<style>body { color: red; }</style><p>Hello</p>';
    const result = sanitizeEmailBody(html);
    expect(result).not.toContain('body { color');
    expect(result).toContain('Hello');
  });

  it('should remove inline styles', () => {
    const html = '<p style="color: red; font-size: 12px;">Text</p>';
    const result = sanitizeEmailBody(html);
    expect(result).not.toContain('style=');
    expect(result).toContain('Text');
  });

  it('should remove HTML comments', () => {
    const html = '<p>Visible</p><!-- This is a comment --><p>More text</p>';
    const result = sanitizeEmailBody(html);
    expect(result).not.toContain('This is a comment');
    expect(result).toContain('Visible');
  });

  it('should remove script tags', () => {
    const html = '<p>Safe</p><script>alert("xss")</script><p>Content</p>';
    const result = sanitizeEmailBody(html);
    expect(result).not.toContain('alert');
    expect(result).not.toContain('script');
  });

  it('should remove tracking pixels', () => {
    const html = '<img src="track.gif" width="1" height="1" /><p>Content</p>';
    const result = sanitizeEmailBody(html);
    expect(result).toContain('[TRACKING_PIXEL]');
  });

  it('should remove empty tags', () => {
    const html = '<div></div><p>Text</p><span></span>';
    const result = sanitizeEmailBody(html);
    expect(result).not.toContain('<div></div>');
    expect(result).not.toContain('<span></span>');
  });

  it('should collapse excessive whitespace', () => {
    const html = '<p>Hello    \n\n\t   World</p>';
    const result = sanitizeEmailBody(html);
    expect(result).toBe('<p>Hello World</p>');
  });

  it('should handle complex emails with multiple sanitization steps', () => {
    const html = `
      <html>
        <head><style>body { margin: 0; }</style></head>
        <body style="background: white;">
          <!-- Comment -->
          <script>console.log('xss')</script>
          <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />
          <p>Legitimate content</p>
          <img width="1" height="1" src="track.gif" />
        </body>
      </html>
    `;
    const result = sanitizeEmailBody(html);
    expect(result).toContain('Legitimate content');
    expect(result).not.toContain('Comment');
    expect(result).not.toContain('console.log');
    expect(result).not.toContain('R0lGODlh');
  });
});

describe('htmlToPlainText', () => {
  it('should return empty string for null or empty input', () => {
    expect(htmlToPlainText('')).toBe('');
    expect(htmlToPlainText(null as any)).toBe('');
  });

  it('should remove HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const result = htmlToPlainText(html);
    expect(result).toBe('Hello World');
  });

  it('should convert block elements to newlines', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>';
    const result = htmlToPlainText(html);
    expect(result).toContain('First paragraph');
    expect(result).toContain('Second paragraph');
  });

  it('should decode HTML entities', () => {
    const html = '<p>&nbsp;Hello&amp;Goodbye&lt;tag&gt;&quot;quoted&quot;&#39;apostrophe&#39;</p>';
    const result = htmlToPlainText(html);
    expect(result).toContain('Hello&Goodbye<tag>"quoted"\'apostrophe\'');
  });

  it('should handle links', () => {
    const html = '<a href="https://example.com">Click here</a>';
    const result = htmlToPlainText(html);
    expect(result).toBe('Click here');
    expect(result).not.toContain('href');
  });

  it('should preserve list content', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = htmlToPlainText(html);
    expect(result).toContain('Item 1');
    expect(result).toContain('Item 2');
  });

  it('should collapse multiple whitespace', () => {
    const html = '<p>Text    with    multiple     spaces</p>';
    const result = htmlToPlainText(html);
    expect(result).toBe('Text with multiple spaces');
  });

  it('should handle headings', () => {
    const html = '<h1>Title</h1><p>Content</p>';
    const result = htmlToPlainText(html);
    expect(result).toContain('Title');
    expect(result).toContain('Content');
  });

  it('should handle tables', () => {
    const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
    const result = htmlToPlainText(html);
    expect(result).toContain('Cell 1');
    expect(result).toContain('Cell 2');
  });
});
