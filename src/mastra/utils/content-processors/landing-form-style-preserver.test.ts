import { describe, expect, it } from 'vitest';
import { preserveLandingFormControlStyles } from './landing-form-style-preserver';

describe('preserveLandingFormControlStyles', () => {
    it('enforces original form-control styles (localization-safe)', () => {
        const original = `
      <html><body>
        <input type='email' style='padding: 12px; border: 1px solid #ddd;' />
        <input type='password' style='padding: 12px; border: 1px solid #ddd;' />
        <button type='submit' style='padding: 12px 16px; background:#000; color:#fff;'>Login</button>
      </body></html>
    `;

        const edited = `
      <html><body>
        <input type='email' />
        <input type='password' style='padding: 99px;' />
        <button type='submit'>Giriş</button>
      </body></html>
    `;

        const out = preserveLandingFormControlStyles(original, edited);

        // email input gets restored
        expect(out).toMatch(/<input[^>]*type='email'[^>]*style='padding:\s*12px;\s*border:\s*1px\s*solid/i);
        // password input gets enforced back to original style (even if edited tried to change it)
        expect(out).toMatch(/<input[^>]*type='password'[^>]*style='padding:\s*12px;\s*border:\s*1px\s*solid/i);
        // button gets restored (missing-only)
        expect(out).toMatch(/<button[^>]*style='padding:\s*12px\s*16px;\s*background:#000;\s*color:#fff;'/i);
    });
});


