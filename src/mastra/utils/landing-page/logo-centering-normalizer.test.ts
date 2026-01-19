import { describe, expect, it } from 'vitest';
import { normalizeLandingLogoCentering } from './logo-centering-normalizer';

describe('normalizeLandingLogoCentering', () => {
  describe('Basic Wrapping', () => {
    it('wraps icon divs with centered container', () => {
      const input = `<div style="width: 64px; height: 64px; border-radius: 999px; background: #22c55e; display: flex; align-items: center; justify-content: center;"><span>✓</span></div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('display: flex; justify-content: center;');
      expect(out).toContain('width: 64px');
    });

    it('preserves icon div styles when wrapping', () => {
      const input = `<div style="width: 96px; height: 96px; border-radius: 999px; background: #3b82f6; display: flex; align-items: center; justify-content: center;">🔒</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('background: #3b82f6');
      expect(out).toContain('width: 96px');
      expect(out).toContain('border-radius: 999px');
    });

    it('wraps multiple icon divs', () => {
      const input = `
        <div style="width: 64px; height: 64px; border-radius: 999px; display: flex; align-items: center;">✓</div>
        <div style="width: 64px; height: 64px; border-radius: 999px; display: flex; align-items: center;">✓</div>
      `;
      const out = normalizeLandingLogoCentering(input);
      const wrapperCount = (out.match(/display: flex; justify-content: center;/g) || []).length;
      expect(wrapperCount).toBeGreaterThan(0);
    });

    it('does not wrap regular divs without icon pattern', () => {
      const input = `<div style="width: 100%; padding: 20px; display: flex;"><p>Content</p></div>`;
      const out = normalizeLandingLogoCentering(input);
      const wrapperMatches = out.match(/display: flex; justify-content: center;/g) || [];
      expect(wrapperMatches.length).toBe(0);
    });

    it('handles div with margin-bottom in wrapper', () => {
      const input = `<div style="width: 64px; height: 64px; border-radius: 999px; display: flex; margin-bottom: 16px;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('margin-bottom: 24px;');
      expect(out).toContain('margin-bottom: 16px;');
    });
  });

  describe('Edge Cases', () => {
    it('returns original HTML if no icon divs found', () => {
      const input = `<div><p>No icons here</p></div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe(input);
    });

    it('handles null input', () => {
      const input = null;
      const out = normalizeLandingLogoCentering(input as any);
      expect(out).toBe(input);
    });

    it('handles undefined input', () => {
      const input = undefined;
      const out = normalizeLandingLogoCentering(input as any);
      expect(out).toBe(input);
    });

    it('handles empty string', () => {
      const input = '';
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe('');
    });

    it('handles whitespace-only string', () => {
      const input = '   \t\n   ';
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe(input);
    });

    it('handles non-string input', () => {
      // @ts-ignore - Testing runtime behavior
      const input = 123;
      const out = normalizeLandingLogoCentering(input as any);
      expect(out).toBe(input);
    });

    it('handles boolean input', () => {
      // @ts-ignore - Testing runtime behavior
      const input = false;
      const out = normalizeLandingLogoCentering(input as any);
      expect(out).toBe(input);
    });

    it('handles object input', () => {
      // @ts-ignore - Testing runtime behavior
      const input = { html: '<div>test</div>' };
      const out = normalizeLandingLogoCentering(input as any);
      expect(out).toBe(input);
    });
  });

  describe('Icon Size Variations', () => {
    it('wraps 64px icon', () => {
      const input = `<div style="width: 64px; height: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps 96px icon', () => {
      const input = `<div style="width: 96px; height: 96px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps 128px icon', () => {
      const input = `<div style="width: 128px; height: 128px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps 32px icon', () => {
      const input = `<div style="width: 32px; height: 32px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps 256px icon', () => {
      const input = `<div style="width: 256px; height: 256px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });
  });

  describe('Border-Radius Variations', () => {
    it('wraps icon with border-radius: 999px', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps icon with border-radius: 50%', () => {
      const input = `<div style="width: 64px; border-radius: 50%; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps icon with border-radius: 100%', () => {
      const input = `<div style="width: 64px; border-radius: 100%; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps icon with border-radius: 9999px', () => {
      const input = `<div style="width: 64px; border-radius: 9999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps icon with border-radius: 32px', () => {
      const input = `<div style="width: 64px; border-radius: 32px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });
  });

  describe('Style Attribute Variations', () => {
    it('handles single quotes in style', () => {
      const input = `<div style='width: 64px; border-radius: 999px; display: flex;'>✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles double quotes in style', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles style with extra whitespace', () => {
      const input = `<div style="  width:  64px  ;  border-radius:  999px  ;  display:  flex  ;  ">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles style without spaces after colons', () => {
      const input = `<div style="width:64px;border-radius:999px;display:flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles uppercase DISPLAY:FLEX', () => {
      const input = `<div style="width: 64px; border-radius: 999px; DISPLAY: FLEX;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles mixed case Width:64px', () => {
      const input = `<div style="Width: 64px; Border-Radius: 999px; Display: Flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });
  });

  describe('Icon Content Variations', () => {
    it('wraps icon with emoji content', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">🔒</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('🔒');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps icon with text content', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">OK</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('OK');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps icon with nested span', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;"><span>✓</span></div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('<span>✓</span>');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps icon with unicode characters', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">你好</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('你好');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('wraps empty icon div', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;"></div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });
  });

  describe('Non-Icon Divs', () => {
    it('does not wrap div without border-radius', () => {
      const input = `<div style="width: 64px; display: flex;">Content</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe(input);
    });

    it('does not wrap div without fixed width', () => {
      const input = `<div style="border-radius: 999px; display: flex;">Content</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe(input);
    });

    it('does not wrap div without display:flex', () => {
      const input = `<div style="width: 64px; border-radius: 999px;">Content</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe(input);
    });

    it('does not wrap div with width:100%', () => {
      const input = `<div style="width: 100%; border-radius: 999px; display: flex;">Content</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe(input);
    });

    it('does not wrap div with width:50%', () => {
      const input = `<div style="width: 50%; border-radius: 999px; display: flex;">Content</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toBe(input);
    });
  });

  describe('Multiple Icons', () => {
    it('wraps three icon divs', () => {
      const input = `
        <div style="width: 64px; border-radius: 999px; display: flex;">A</div>
        <div style="width: 64px; border-radius: 999px; display: flex;">B</div>
        <div style="width: 64px; border-radius: 999px; display: flex;">C</div>
      `;
      const out = normalizeLandingLogoCentering(input);
      const wrapperCount = (out.match(/display: flex; justify-content: center;/g) || []).length;
      expect(wrapperCount).toBe(3);
    });

    it('wraps mixed icon sizes', () => {
      const input = `
        <div style="width: 32px; border-radius: 999px; display: flex;">A</div>
        <div style="width: 64px; border-radius: 999px; display: flex;">B</div>
        <div style="width: 128px; border-radius: 999px; display: flex;">C</div>
      `;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('width: 32px');
      expect(out).toContain('width: 64px');
      expect(out).toContain('width: 128px');
      const wrapperCount = (out.match(/display: flex; justify-content: center;/g) || []).length;
      expect(wrapperCount).toBe(3);
    });

    it('wraps icons mixed with non-icon divs', () => {
      const input = `
        <div style="width: 64px; border-radius: 999px; display: flex;">Icon</div>
        <div style="width: 100%; padding: 20px;">Regular div</div>
        <div style="width: 96px; border-radius: 999px; display: flex;">Another icon</div>
      `;
      const out = normalizeLandingLogoCentering(input);
      const wrapperCount = (out.match(/display: flex; justify-content: center;/g) || []).length;
      expect(wrapperCount).toBe(2);
      expect(out).toContain('Regular div');
    });
  });

  describe('Wrapper Properties', () => {
    it('adds margin-bottom:24px to wrapper', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('margin-bottom: 24px;');
    });

    it('adds justify-content:center to wrapper', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('justify-content: center;');
    });

    it('wrapper uses single quotes for style', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toMatch(/style='display: flex; justify-content: center; margin-bottom: 24px;'/);
    });
  });

  describe('Complex HTML Structures', () => {
    it('handles icon div inside other elements', () => {
      const input = `<section><div><div style="width: 64px; border-radius: 999px; display: flex;">✓</div></div></section>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
      expect(out).toContain('<section>');
      expect(out).toContain('</section>');
    });

    it('preserves surrounding HTML', () => {
      const input = `<p>Before</p><div style="width: 64px; border-radius: 999px; display: flex;">✓</div><p>After</p>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('<p>Before</p>');
      expect(out).toContain('<p>After</p>');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles icon with many additional styles', () => {
      const input = `<div style="width: 64px; height: 64px; border-radius: 999px; display: flex; align-items: center; justify-content: center; background: linear-gradient(45deg, #f3f4f6, #e5e7eb); box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 10px; padding: 5px;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('box-shadow: 0 4px 6px rgba(0,0,0,0.1);');
      expect(out).toContain('background: linear-gradient(45deg, #f3f4f6, #e5e7eb);');
      expect(out).toContain("display: flex; justify-content: center;");
    });
  });

  describe('Special Cases', () => {
    it('handles very long HTML', () => {
      const longHtml = '<div>'.repeat(100) + `<div style="width: 64px; border-radius: 999px; display: flex;">✓</div>` + '</div>'.repeat(100);
      const out = normalizeLandingLogoCentering(longHtml);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles HTML with special characters', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">&lt;&gt;&amp;</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('&lt;&gt;&amp;');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles HTML with line breaks in div', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;">
        ✓
      </div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles malformed style attribute', () => {
      const input = `<div style="width: 64px; border-radius: 999px; display: flex;'>✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      // Should still process or return safely
      expect(out).toBeDefined();
    });

    it('handles div with data attributes', () => {
      const input = `<div data-id="icon-1" style="width: 64px; border-radius: 999px; display: flex;" data-type="logo">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('data-id="icon-1"');
      expect(out).toContain('data-type="logo"');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles div with class attribute', () => {
      const input = `<div class="icon-circle" style="width: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('class="icon-circle"');
      expect(out).toContain("display: flex; justify-content: center;");
    });

    it('handles div with id attribute', () => {
      const input = `<div id="main-icon" style="width: 64px; border-radius: 999px; display: flex;">✓</div>`;
      const out = normalizeLandingLogoCentering(input);
      expect(out).toContain('id="main-icon"');
      expect(out).toContain("display: flex; justify-content: center;");
    });
  });

  describe('Order Preservation', () => {
    it('maintains order when wrapping multiple icons', () => {
      const input = `
        <div style="width: 64px; border-radius: 999px; display: flex;">1</div>
        <div style="width: 64px; border-radius: 999px; display: flex;">2</div>
        <div style="width: 64px; border-radius: 999px; display: flex;">3</div>
      `;
      const out = normalizeLandingLogoCentering(input);
      const firstIndex = out.indexOf('>1<');
      const secondIndex = out.indexOf('>2<');
      const thirdIndex = out.indexOf('>3<');
      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    it('preserves content between icons', () => {
      const input = `
        <div style="width: 64px; border-radius: 999px; display: flex;">A</div>
        <p>Middle content</p>
        <div style="width: 64px; border-radius: 999px; display: flex;">B</div>
      `;
      const out = normalizeLandingLogoCentering(input);
      const middleIndex = out.indexOf('Middle content');
      const aIndex = out.indexOf('>A<');
      const bIndex = out.indexOf('>B<');
      expect(aIndex).toBeLessThan(middleIndex);
      expect(middleIndex).toBeLessThan(bIndex);
    });
  });
});

