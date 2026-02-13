import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  validateImageUrl,
  fixBrokenImages,
  normalizeImgAttributes,
  getDefaultGenericLogoBase64,
  validateImageUrlCached,
  DEFAULT_GENERIC_LOGO,
  resetCaches,
} from './image-validator';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock dependencies
vi.mock('../core/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('image-validator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    resetCaches();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateImageUrl', () => {
    it('returns true for 200 OK', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const result = await validateImageUrl('http://example.com/image.png');
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://example.com/image.png',
        expect.objectContaining({ method: 'HEAD' })
      );
    });

    it('returns false for 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result = await validateImageUrl('http://example.com/bad.png');
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await validateImageUrl('http://example.com/error.png');
      expect(result).toBe(false);
    });
  });

  describe('fixBrokenImages', () => {
    it('keeps valid images', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      const html = '<img src="http://valid-site.com/valid.png" alt="Valid">';
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toBe(html);
    });

    it('replaces obviously broken URLs without fetch', async () => {
      const html = '<img src="invalid-url" alt="Broken">';
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toContain(DEFAULT_GENERIC_LOGO);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('replaces 404 images with default logo', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false }); // 404
      const html = '<img src="http://example.com/missing.png" alt="Missing">';
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toContain(DEFAULT_GENERIC_LOGO);
      expect(result).toContain('max-width: 200px'); // Checks style injection
    });

    it('replaces broken images with custom fallback', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const html = '<img src="http://example.com/missing.png" alt="Missing">';
      const fallback = 'http://fallback.com/logo.png';
      const result = await fixBrokenImages(html, 'Brand', fallback);
      expect(result).toContain(fallback);
    });

    it('ignores placeholder tags', async () => {
      const html = '<img src="{CUSTOMMAINLOGO}" alt="Logo">';
      const result = await fixBrokenImages(html, 'Brand');
      expect(result).toBe(html);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('normalizeImgAttributes', () => {
    it('adds styles to plain img tags', () => {
      const html = '<img src="test.png">';
      const result = normalizeImgAttributes(html);
      expect(result).toContain("style='display: block; margin: 0 auto;'");
    });

    it('merges existing styles', () => {
      const html = '<img src="test.png" style="border: 1px solid black">';
      const result = normalizeImgAttributes(html);
      expect(result).toContain('display: block');
      expect(result).toContain('margin: 0 auto');
      expect(result).toContain('border: 1px solid black');
    });
  });

  describe('getDefaultGenericLogoBase64', () => {
    it('fetches and converts logo to base64', async () => {
      const mockBuffer = new TextEncoder().encode('fake-image-data').buffer;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
        headers: { get: () => 'image/png' },
      });

      const result = await getDefaultGenericLogoBase64();
      expect(result).toContain('data:image/png;base64,');
    });

    it('returns fallback 1x1 png on failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result = await getDefaultGenericLogoBase64();
      expect(result).toContain('data:image/png;base64,iVBORw0KGgo');
    });
  });

  describe('validateImageUrlCached', () => {
    it('uses cache for subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      // First call
      await validateImageUrlCached('http://cached.com/img.png');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call (should be cached)
      await validateImageUrlCached('http://cached.com/img.png');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
