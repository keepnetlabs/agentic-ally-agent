import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postProcessPhishingEmailHtml, postProcessPhishingLandingHtml } from './phishing-html-postprocessors';

vi.mock('../core/logger');
vi.mock('./html-sanitizer');
vi.mock('./email-table-padding-normalizer');
vi.mock('./email-centering-normalizer');
vi.mock('./email-card-padding-normalizer');
vi.mock('../validation/json-validation-utils');
vi.mock('../landing-page');
vi.mock('./landing-page-layout-fixer', () => ({
  fixLandingPageLayout: vi.fn(html => html),
}));

describe('phishing-html-postprocessors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== EMAIL POST-PROCESSOR TESTS ====================
  describe('postProcessPhishingEmailHtml', () => {
    describe('Input Validation', () => {
      it('should return null for null input', () => {
        const result = postProcessPhishingEmailHtml({ html: null as any });
        expect(result).toBeNull();
      });

      it('should return undefined for undefined input', () => {
        const result = postProcessPhishingEmailHtml({ html: undefined as any });
        expect(result).toBeUndefined();
      });

      it('should return empty string for empty input', () => {
        const result = postProcessPhishingEmailHtml({ html: '' });
        expect(result).toBe('');
      });

      it('should return non-string input unchanged', () => {
        const result = postProcessPhishingEmailHtml({ html: 123 as any });
        expect(result).toBe(123);
      });

      it('should accept and process valid HTML', () => {
        const html = '<table><tr><td>Email</td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle HTML with nested tables', () => {
        const html = '<table><tr><td><table><tr><td>Nested</td></tr></table></td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle email with styling', () => {
        const html = '<table style="width: 100%;"><tr><td>Content</td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle email with images', () => {
        const html = '<table><tr><td><img src="logo.png" alt="Logo" /></td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle email with CTA button', () => {
        const html = '<table><tr><td><a href="http://phishing.com">Click</a></td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle deeply nested tables', () => {
        const html =
          '<table><tr><td><table><tr><td><table><tr><td>Deep</td></tr></table></td></tr></table></td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle malformed HTML', () => {
        const html = '<table><tr><td>Unclosed';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle HTML with unicode', () => {
        const html = '<table><tr><td>Hello 世界 مرحبا</td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle HTML with special characters', () => {
        const html = '<table><tr><td>&nbsp;&quot;&lt;&gt;&amp;</td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle very large HTML', () => {
        const large = '<table><tr><td>' + 'x'.repeat(10000) + '</td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html: large })).not.toThrow();
      });

      it('should handle email with form elements', () => {
        const html = '<table><tr><td><form><input type="email" /><button>Submit</button></form></td></tr></table>';
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle real-world phishing template', () => {
        const html = `
          <table width="100%" cellpadding="0">
            <tr><td style="padding: 20px;">
              <h2>Verify Account</h2>
              <input type="email" placeholder="Email" />
              <button>Verify</button>
            </td></tr>
          </table>
        `;
        expect(() => postProcessPhishingEmailHtml({ html })).not.toThrow();
      });

      it('should handle multiple consecutive processings', () => {
        const html = '<table><tr><td>Email</td></tr></table>';
        expect(() => {
          postProcessPhishingEmailHtml({ html });
          postProcessPhishingEmailHtml({ html });
          postProcessPhishingEmailHtml({ html });
        }).not.toThrow();
      });
    });
  });

  // ==================== LANDING PAGE POST-PROCESSOR TESTS ====================
  describe('postProcessPhishingLandingHtml', () => {
    describe('Input Validation', () => {
      it('should return null for null HTML', () => {
        const result = postProcessPhishingLandingHtml({ html: null as any });
        expect(result).toBeNull();
      });

      it('should return undefined for undefined HTML', () => {
        const result = postProcessPhishingLandingHtml({ html: undefined as any });
        expect(result).toBeUndefined();
      });

      it('should return empty string for empty HTML', () => {
        const result = postProcessPhishingLandingHtml({ html: '' });
        expect(result).toBe('');
      });

      it('should return non-string HTML unchanged', () => {
        const result = postProcessPhishingLandingHtml({ html: 456 as any });
        expect(result).toBe(456);
      });

      it('should accept and process simple landing page', () => {
        const html = '<div><form><input type="email" /></form></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should accept HTML with login form', () => {
        const html = '<form><input type="email" /><input type="password" /><button>Sign In</button></form>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should accept HTML with styling', () => {
        const html = '<div style="width: 100%; padding: 20px;"><form>Content</form></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle centered card layout', () => {
        const html =
          '<div style="display: flex; align-items: center; justify-content: center;"><div><form><input type="email" /></form></div></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle landing page without title', () => {
        const html = '<div>Content</div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle landing page with custom title', () => {
        const html = '<div>Content</div>';
        expect(() => postProcessPhishingLandingHtml({ html, title: 'Sign In' })).not.toThrow();
      });

      it('should handle landing page with empty title', () => {
        const html = '<div>Content</div>';
        expect(() => postProcessPhishingLandingHtml({ html, title: '' })).not.toThrow();
      });

      it('should handle landing page with long title', () => {
        const html = '<div>Content</div>';
        expect(() =>
          postProcessPhishingLandingHtml({ html, title: 'Verify Your Microsoft Account - Sign In' })
        ).not.toThrow();
      });

      it('should handle Microsoft-style layout', () => {
        const html =
          '<div style="display: flex;"><div style="flex: 1; background: #0078d4;"></div><div style="flex: 1;"><form><input type="email" /></form></div></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle hero section layout', () => {
        const html =
          '<div><div style="background: linear-gradient(135deg, #0066cc, #004499);"></div><div><form><input type="email" /></form></div></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle split layout', () => {
        const html =
          '<div style="display: flex;"><div style="flex: 1;"></div><div style="flex: 1;"><form></form></div></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle minimal layout', () => {
        const html =
          '<div style="max-width: 400px; margin: 0 auto;"><h1>Sign In</h1><form><input type="email" /></form></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle deeply nested divs', () => {
        const html = '<div><div><div><div><div><div>Deep</div></div></div></div></div></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle malformed HTML', () => {
        const html = '<div><form><input type="email"';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle HTML with unicode', () => {
        const html = '<div><h2>Sign In</h2><p>Welcome 你好 مرحبا שלום</p></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle HTML with special characters', () => {
        const html = '<div>&nbsp;&quot;&lt;&gt;&amp;</div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle HTML with scripts', () => {
        const html = '<div><script>console.log("test");</script><p>Content</p></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle HTML with styles', () => {
        const html = '<div><style>body { color: red; }</style><p>Content</p></div>';
        expect(() => postProcessPhishingLandingHtml({ html })).not.toThrow();
      });

      it('should handle very large HTML', () => {
        const large = '<div>' + 'x'.repeat(10000) + '</div>';
        expect(() => postProcessPhishingLandingHtml({ html: large })).not.toThrow();
      });

      it('should handle real-world login page', () => {
        const html = `<!DOCTYPE html>
          <html>
            <head><title>Sign In</title></head>
            <body style="display: flex; height: 100vh;">
              <div style="width: 400px; padding: 40px;">
                <h1>Company Portal</h1>
                <form>
                  <input type="text" placeholder="Username" />
                  <input type="password" placeholder="Password" />
                  <button>Sign In</button>
                </form>
              </div>
            </body>
          </html>
        `;
        expect(() => postProcessPhishingLandingHtml({ html, title: 'Sign In' })).not.toThrow();
      });

      it('should handle multiple consecutive processings', () => {
        const html = '<div>Content</div>';
        expect(() => {
          postProcessPhishingLandingHtml({ html });
          postProcessPhishingLandingHtml({ html, title: 'Page 1' });
          postProcessPhishingLandingHtml({ html, title: 'Page 2' });
        }).not.toThrow();
      });
    });
  });

  // ==================== INTEGRATION TESTS ====================
  describe('Integration - Email and Landing Page Processing', () => {
    it('should process email and landing page independently', () => {
      const emailHtml = '<table><tr><td>Email</td></tr></table>';
      const landingHtml = '<div>Landing Page</div>';

      expect(() => {
        postProcessPhishingEmailHtml({ html: emailHtml });
        postProcessPhishingLandingHtml({ html: landingHtml });
      }).not.toThrow();
    });

    it('should handle multiple email and landing page processings', () => {
      const email = '<table><tr><td>Email</td></tr></table>';
      const page = '<div>Page</div>';

      expect(() => {
        postProcessPhishingEmailHtml({ html: email });
        postProcessPhishingEmailHtml({ html: email });
        postProcessPhishingLandingHtml({ html: page, title: 'Page 1' });
        postProcessPhishingLandingHtml({ html: page, title: 'Page 2' });
      }).not.toThrow();
    });

    it('should handle parallel processing', () => {
      const email = '<table><tr><td>Email</td></tr></table>';
      const page = '<div>Landing</div>';

      expect(() => {
        Promise.resolve(postProcessPhishingEmailHtml({ html: email }));
        Promise.resolve(postProcessPhishingLandingHtml({ html: page }));
      }).not.toThrow();
    });

    it('should process mixed HTML structures', () => {
      expect(() => {
        postProcessPhishingEmailHtml({ html: '<table><tr><td>Email</td></tr></table>' });
        postProcessPhishingLandingHtml({ html: '<div>Landing</div>' });
        postProcessPhishingEmailHtml({ html: '<table><tr><td>Another email</td></tr></table>' });
        postProcessPhishingLandingHtml({ html: '<form>Contact</form>' });
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('email processor accepts correct parameter shape', () => {
      const params = { html: '<table></table>' };
      expect(() => postProcessPhishingEmailHtml(params)).not.toThrow();
    });

    it('landing processor accepts correct parameter shape', () => {
      const params = { html: '<div></div>', title: 'Sign In' };
      expect(() => postProcessPhishingLandingHtml(params)).not.toThrow();
    });

    it('landing processor handles missing title parameter', () => {
      const params = { html: '<div></div>' };
      expect(() => postProcessPhishingLandingHtml(params)).not.toThrow();
    });

    it('landing processor handles all parameter combinations', () => {
      expect(() => {
        postProcessPhishingLandingHtml({ html: '<div></div>' });
        postProcessPhishingLandingHtml({ html: '<div></div>', title: 'Title' });
        postProcessPhishingLandingHtml({ html: '<div></div>', title: '' });
      }).not.toThrow();
    });
  });

  describe('Graceful Error Handling', () => {
    it('email processor does not throw with invalid parameters', () => {
      expect(() => {
        postProcessPhishingEmailHtml({ html: '' });
        postProcessPhishingEmailHtml({ html: null as any });
        postProcessPhishingEmailHtml({ html: undefined as any });
        postProcessPhishingEmailHtml({ html: {} as any });
      }).not.toThrow();
    });

    it('landing processor does not throw with invalid parameters', () => {
      expect(() => {
        postProcessPhishingLandingHtml({ html: '' });
        postProcessPhishingLandingHtml({ html: null as any });
        postProcessPhishingLandingHtml({ html: undefined as any });
        postProcessPhishingLandingHtml({ html: {} as any });
      }).not.toThrow();
    });

    it('email processor handles edge case values', () => {
      expect(() => {
        postProcessPhishingEmailHtml({ html: 0 as any });
        postProcessPhishingEmailHtml({ html: false as any });
        postProcessPhishingEmailHtml({ html: [] as any });
      }).not.toThrow();
    });

    it('landing processor handles edge case values', () => {
      expect(() => {
        postProcessPhishingLandingHtml({ html: 0 as any });
        postProcessPhishingLandingHtml({ html: false as any });
        postProcessPhishingLandingHtml({ html: [] as any });
      }).not.toThrow();
    });
  });
});
