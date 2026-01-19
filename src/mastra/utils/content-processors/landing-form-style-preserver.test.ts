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

    it('should handle empty original HTML', () => {
        const original = '';
        const edited = '<input type="text" />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toBe(edited);
    });

    it('should handle empty edited HTML', () => {
        const original = '<input type="text" style="color: red;" />';
        const edited = '';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toBe(edited);
    });

    it('should handle null original HTML gracefully', () => {
        const original = null as any;
        const edited = '<input type="text" />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toBe(edited);
    });

    it('should handle null edited HTML gracefully', () => {
        const original = '<input type="text" style="color: red;" />';
        const edited = null as any;
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toBe(edited);
    });

    it('should handle undefined inputs gracefully', () => {
        const original = undefined as any;
        const edited = undefined as any;
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toBe(edited);
    });

    it('should handle HTML with no form controls', () => {
        const original = '<div>No form controls</div>';
        const edited = '<div>Still no form controls</div>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toBe(edited);
    });

    it('should preserve textarea styles', () => {
        const original = '<textarea style="height: 100px;"></textarea>';
        const edited = '<textarea></textarea>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toMatch(/<textarea[^>]*style='height: 100px;'/i);
    });

    it('should preserve select styles', () => {
        const original = '<select style="width: 200px;"><option>Test</option></select>';
        const edited = '<select><option>Test</option></select>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toMatch(/<select[^>]*style='width: 200px;'/i);
    });

    it('should handle multiple inputs with different styles', () => {
        const original = `
            <input style="color: red;" />
            <input style="color: blue;" />
            <input style="color: green;" />
        `;
        const edited = `
            <input />
            <input />
            <input />
        `;
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
        expect(out).toContain("style='color: blue;'");
        expect(out).toContain("style='color: green;'");
    });

    it('should handle mixed form elements', () => {
        const original = `
            <input style="a: 1;" />
            <textarea style="b: 2;"></textarea>
            <select style="c: 3;"></select>
            <button style="d: 4;">Click</button>
        `;
        const edited = `
            <input />
            <textarea></textarea>
            <select></select>
            <button>Click</button>
        `;
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='a: 1;'");
        expect(out).toContain("style='b: 2;'");
        expect(out).toContain("style='c: 3;'");
        expect(out).toContain("style='d: 4;'");
    });

    it('should use fallback style when edited has more elements', () => {
        const original = '<input style="color: red;" />';
        const edited = '<input /><input /><input />';
        const out = preserveLandingFormControlStyles(original, edited);
        // All should get the same style (fallback to last original)
        const matches = out.match(/style='color: red;'/g);
        expect(matches).toHaveLength(3);
    });

    it('should handle fewer edited elements than original', () => {
        const original = `
            <input style="color: red;" />
            <input style="color: blue;" />
            <input style="color: green;" />
        `;
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
    });

    it('should preserve other attributes', () => {
        const original = '<input type="email" id="email" class="form-control" style="padding: 10px;" />';
        const edited = '<input type="email" id="email" class="form-control" />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain('type="email"');
        expect(out).toContain('id="email"');
        expect(out).toContain('class="form-control"');
        expect(out).toContain("style='padding: 10px;'");
    });

    it('should handle double quotes in styles', () => {
        const original = '<input style="color: red;" />';
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
    });

    it('should handle single quotes in styles', () => {
        const original = "<input style='color: red;' />";
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
    });

    it('should override edited styles with original', () => {
        const original = '<input style="color: red;" />';
        const edited = '<input style="color: blue;" />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
        expect(out).not.toContain("style='color: blue;'");
    });

    it('should handle case-insensitive tags', () => {
        const original = '<INPUT style="color: red;" />';
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
    });

    it('should handle self-closing tags', () => {
        const original = '<input style="color: red;" />';
        const edited = '<input>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
    });

    it('should handle tags without self-closing slash', () => {
        const original = '<input style="color: red;">';
        const edited = '<input>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
    });

    it('should handle empty style attributes', () => {
        const original = '<input style="" />';
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        // Empty styles shouldn't be preserved
        expect(out).toBe(edited);
    });

    it('should handle whitespace in style attributes', () => {
        const original = '<input style="  color: red;  " />';
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
    });

    it('should handle multiple style properties', () => {
        const original = '<input style="color: red; background: blue; padding: 10px;" />';
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red; background: blue; padding: 10px;'");
    });

    it('should handle button with text content', () => {
        const original = '<button style="color: red;">Original Text</button>';
        const edited = '<button>Edited Text</button>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
        expect(out).toContain('Edited Text');
    });

    it('should handle textarea with content', () => {
        const original = '<textarea style="height: 100px;">Original content</textarea>';
        const edited = '<textarea>New content</textarea>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='height: 100px;'");
        expect(out).toContain('New content');
    });

    it('should handle select with options', () => {
        const original = '<select style="width: 200px;"><option value="1">One</option></select>';
        const edited = '<select><option value="2">Two</option></select>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='width: 200px;'");
        expect(out).toContain('value="2"');
    });

    it('should handle forms with no original styles', () => {
        const original = '<input type="text" />';
        const edited = '<input type="text" style="color: red;" />';
        const out = preserveLandingFormControlStyles(original, edited);
        // No original style, so edited should be returned as-is
        expect(out).toBe(edited);
    });

    it('should handle complex HTML structure', () => {
        const original = `
            <form>
                <div>
                    <input style="color: red;" />
                </div>
                <div>
                    <button style="background: blue;">Submit</button>
                </div>
            </form>
        `;
        const edited = `
            <form>
                <div>
                    <input />
                </div>
                <div>
                    <button>Submit</button>
                </div>
            </form>
        `;
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='color: red;'");
        expect(out).toContain("style='background: blue;'");
    });

    it('should handle nested forms', () => {
        const original = '<form><input style="a: 1;" /><form><input style="b: 2;" /></form></form>';
        const edited = '<form><input /><form><input /></form></form>';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='a: 1;'");
        expect(out).toContain("style='b: 2;'");
    });

    it('should preserve styles with special CSS values', () => {
        const original = '<input style="background: url(image.png); box-shadow: 0 0 10px rgba(0,0,0,0.5);" />';
        const edited = '<input />';
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='background: url(image.png); box-shadow: 0 0 10px rgba(0,0,0,0.5);'");
    });

    it('should handle input with type attribute variations', () => {
        const original = `
            <input type="text" style="a: 1;" />
            <input type="email" style="b: 2;" />
            <input type="password" style="c: 3;" />
        `;
        const edited = `
            <input type="text" />
            <input type="email" />
            <input type="password" />
        `;
        const out = preserveLandingFormControlStyles(original, edited);
        expect(out).toContain("style='a: 1;'");
        expect(out).toContain("style='b: 2;'");
        expect(out).toContain("style='c: 3;'");
    });
});


