import { describe, expect, it, vi } from 'vitest';
import {
  validateCSSPatterns,
  validateFormElements,
  validateHTMLStructure,
  validateLandingPage,
} from './html-validator';

// Mock logger
vi.mock('../core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('html-validator', () => {
  describe('validateCSSPatterns', () => {
    it('passes valid HTML with no forbidden patterns', () => {
      const html = '<div class="shadow-md rounded-lg">Content</div>';
      const result = validateCSSPatterns(html);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails excessive shadow', () => {
      const html = '<div class="shadow-2xl">Content</div>';
      const result = validateCSSPatterns(html);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('shadow-2xl');
    });

    it('fails excessive border radius', () => {
      const html = '<div class="rounded-3xl">Content</div>';
      const result = validateCSSPatterns(html);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('rounded-3xl');
    });

    it('fails backdrop blur', () => {
      const html = '<div class="backdrop-blur">Glass</div>';
      const result = validateCSSPatterns(html);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('backdrop-blur');
    });

    it('fails complex gradients', () => {
      const html = '<div class="bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500">Rainbow</div>';
      const result = validateCSSPatterns(html);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Complex 3-color gradients');
    });

    it('fails card layout patterns', () => {
      const html = '<div class="min-h-screen flex items-center justify-center">Card</div>';
      const result = validateCSSPatterns(html);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Centered card layout detected');
    });
  });

  describe('validateFormElements', () => {
    it('validates login page requirements', () => {
      const validHtml = `
                <form>
                    <input type="email" name="user">
                    <input type="password" name="pass">
                    <button type="submit">Login</button>
                </form>
            `;
      const result = validateFormElements(validHtml, 'login');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns missing form elements in login page', () => {
      const invalidHtml = '<div>Just text</div>';
      const result = validateFormElements(invalidHtml, 'login');
      expect(result.isValid).toBe(false); // Missing form is an error
      expect(result.errors).toContain('Missing <form> element');
      expect(result.warnings).toContain('Missing email/username input field');
      expect(result.warnings).toContain('Missing password input field');
      expect(result.warnings).toContain('Missing submit button');
    });

    it('skips validation for non-login pages', () => {
      const result = validateFormElements('<div>Info</div>', 'info');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateHTMLStructure', () => {
    it('accepts full structure', () => {
      const html = '<!DOCTYPE html><html><head></head><body></body></html>';
      const result = validateHTMLStructure(html);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('flags missing components', () => {
      const html = '<div>Partial</div>';
      const result = validateHTMLStructure(html);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing <html> tag');
      expect(result.errors).toContain('Missing <head> tag');
      expect(result.errors).toContain('Missing <body> tag');
      expect(result.warnings).toContain('Missing DOCTYPE declaration');
    });
  });

  describe('validateLandingPage', () => {
    it('aggregates results', () => {
      const html = `
                <!DOCTYPE html>
                <html>
                <head></head>
                <body>
                    <form>
                        <input type="email">
                        <input type="password">
                        <button type="submit">Login</button>
                        <div class="shadow-2xl">Bad Shadow</div>
                    </form>
                </body>
                </html>
            `;
      const result = validateLandingPage(html, 'login');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1); // shadow-2xl
      expect(result.errors[0]).toContain('shadow-2xl');
    });
  });
});
