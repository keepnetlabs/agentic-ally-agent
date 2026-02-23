import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_GENERIC_LOGO,
  normalizeImgAttributes,
  validateImageUrl,
  fixBrokenImages,
  getDefaultGenericLogoBase64,
} from './image-validator';

describe('image-validator', () => {
  describe('getDefaultGenericLogoBase64', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns base64 data URI when fetch succeeds', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: { get: () => 'image/png' },
        })
      );
      const result = await getDefaultGenericLogoBase64();
      expect(result).toMatch(/^data:image\/\w+;base64,/);
      vi.stubGlobal('fetch', originalFetch);
    });

    it('returns fallback when fetch returns non-ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
      const result = await getDefaultGenericLogoBase64();
      expect(result).toMatch(/^data:image\/png;base64,/);
      vi.stubGlobal('fetch', originalFetch);
    });

    it('returns fallback when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const result = await getDefaultGenericLogoBase64();
      expect(result).toMatch(/^data:image\/png;base64,/);
      vi.stubGlobal('fetch', originalFetch);
    });
  });

  describe('DEFAULT_GENERIC_LOGO', () => {
    it('should be a valid HTTPS URL', () => {
      expect(DEFAULT_GENERIC_LOGO).toMatch(/^https:\/\//);
    });

    it('should contain imagedelivery domain', () => {
      expect(DEFAULT_GENERIC_LOGO).toContain('imagedelivery.net');
    });
  });

  describe('normalizeImgAttributes', () => {
    it('should add centering styles when img has no style', () => {
      const html = '<img src="logo.png" alt="Logo">';
      const result = normalizeImgAttributes(html);
      expect(result).toContain('display: block');
      expect(result).toContain('margin: 0 auto');
    });

    it('should add style attribute when missing', () => {
      const html = '<img src="logo.png">';
      const result = normalizeImgAttributes(html);
      expect(result).toMatch(/style=['"]/);
      expect(result).toContain('display: block');
    });

    it('should preserve existing style and add centering if needed', () => {
      const html = '<img src="x.png" style="width: 100px;">';
      const result = normalizeImgAttributes(html);
      expect(result).toContain('width: 100px');
      expect(result).toContain('display: block');
      expect(result).toContain('margin: 0 auto');
    });

    it('should update display when not block', () => {
      const html = '<img src="x.png" style="display: inline;">';
      const result = normalizeImgAttributes(html);
      expect(result).toContain('display: block');
    });

    it('should update margin when not 0 auto', () => {
      const html = '<img src="x.png" style="margin: 10px;">';
      const result = normalizeImgAttributes(html);
      expect(result).toContain('margin: 0 auto');
    });

    it('should handle multiple img tags', () => {
      const html = '<img src="a.png"><img src="b.png" alt="B">';
      const result = normalizeImgAttributes(html);
      const imgCount = (result.match(/<img/g) || []).length;
      expect(imgCount).toBe(2);
      expect(result).toContain('display: block');
    });

    it('should handle self-closing img tag', () => {
      const html = '<img src="logo.png" />';
      const result = normalizeImgAttributes(html);
      expect(result).toContain('display: block');
    });

    it('should handle double-quoted style', () => {
      const html = '<img src="x.png" style="width: 50px;">';
      const result = normalizeImgAttributes(html);
      expect(result).toContain('width: 50px');
    });

    it('should return unchanged when no img tags', () => {
      const html = '<div>No images here</div>';
      const result = normalizeImgAttributes(html);
      expect(result).toBe(html);
    });
  });

  describe('validateImageUrl', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns true when fetch returns ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: true })
      );
      const result = await validateImageUrl('https://example.com/logo.png');
      expect(result).toBe(true);
      vi.stubGlobal('fetch', originalFetch);
    });

    it('returns false when fetch returns non-ok response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 404 })
      );
      const result = await validateImageUrl('https://example.com/missing.png');
      expect(result).toBe(false);
      vi.stubGlobal('fetch', originalFetch);
    });

    it('returns false when fetch throws', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const result = await validateImageUrl('https://example.com/bad.png');
      expect(result).toBe(false);
      vi.stubGlobal('fetch', originalFetch);
    });
  });

  describe('fixBrokenImages', () => {
    it('returns html unchanged when no img tags', async () => {
      const html = '<div>No images</div>';
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toBe(html);
    });

    it('skips data URIs and img.logo.dev (always valid)', async () => {
      const html = `<img src="data:image/png;base64,abc" alt="x"><img src="https://img.logo.dev/x.png" alt="y">`;
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toContain('data:image/png');
      expect(result).toContain('img.logo.dev');
    });

    it('replaces obviously broken URLs (localhost, relative, example.com)', async () => {
      const html = `<img src="http://localhost/logo.png" alt="x"><img src="/logo.png" alt="y">`;
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toContain(DEFAULT_GENERIC_LOGO);
    });

    it('skips merge tags/placeholders', async () => {
      const html = `<img src="{CUSTOMMAINLOGO}" alt="logo">`;
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toContain('{CUSTOMMAINLOGO}');
    });

    it('uses fallbackLogoUrl when provided', async () => {
      const customLogo = 'https://custom.com/logo.png';
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
      const html = `<img src="http://localhost/broken.png" alt="x">`;
      const result = await fixBrokenImages(html, 'Brand', customLogo);
      expect(result).toContain(customLogo);
      vi.restoreAllMocks();
    });
  });
});
