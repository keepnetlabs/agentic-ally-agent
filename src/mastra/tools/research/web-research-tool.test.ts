import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Mock env
vi.stubEnv('JINA_API_KEY', '');

// Import after mocks
const { webResearchTool } = await import('./web-research-tool');

describe('web-research-tool', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('tool definition', () => {
    it('has correct tool id', () => {
      expect(webResearchTool.id).toBe('web_research');
    });
  });

  describe('execute — search only (fetchTopUrls=0)', () => {
    it('returns snippets from Jina search', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => `[1] Title: Security Report 2025
URL Source: https://example.com/report
Description: Annual security report

[2] Title: Phishing Stats
URL Source: https://example.com/phishing
Description: Phishing statistics overview`,
      });

      const result = await webResearchTool.execute(
        { query: 'cybersecurity report 2025', fetchTopUrls: 0 },
        {} as any
      );

      expect(result.success).toBe(true);
      expect(result.data?.snippets.length).toBeGreaterThanOrEqual(1);
      expect(result.data?.fullPages).toEqual([]);
      expect(result.data?.query).toBe('cybersecurity report 2025');
    });

    it('returns empty snippets when search returns no results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      const result = await webResearchTool.execute(
        { query: 'obscure query', fetchTopUrls: 0 },
        {} as any
      );

      expect(result.success).toBe(true);
      expect(result.data?.snippets).toEqual([]);
    });

    it('gracefully handles search API failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await webResearchTool.execute(
        { query: 'test query', fetchTopUrls: 0 },
        {} as any
      );

      // Graceful degradation — never blocks report pipeline
      expect(result.success).toBe(true);
      expect(result.data?.snippets).toEqual([]);
      expect(result.data?.summary).toContain('unavailable');
    });

    it('gracefully handles non-ok response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const result = await webResearchTool.execute(
        { query: 'rate limited', fetchTopUrls: 0 },
        {} as any
      );

      expect(result.success).toBe(true);
      expect(result.data?.snippets).toEqual([]);
    });
  });

  describe('execute — with full page fetch', () => {
    it('fetches full pages for top URLs', async () => {
      // First call: Jina Search
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => `[1] Title: Test Page
URL Source: https://example.com/test
Description: Test description`,
      });

      // Second call: Jina Reader for full page
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => '# Test Page\n\nFull markdown content here.',
      });

      const result = await webResearchTool.execute(
        { query: 'test', fetchTopUrls: 1 },
        {} as any
      );

      expect(result.success).toBe(true);
      expect(result.data?.fullPages.length).toBe(1);
      expect(result.data?.fullPages[0].markdown).toContain('Full markdown content');
    });

    it('skips YouTube URLs in full page fetch', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => `[1] Title: Video
URL Source: https://youtube.com/watch?v=abc
Description: YouTube video

[2] Title: Article
URL Source: https://example.com/article
Description: Real article`,
      });

      // Only the non-YouTube URL should be fetched
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => '# Article content',
      });

      const result = await webResearchTool.execute(
        { query: 'test', fetchTopUrls: 2 },
        {} as any
      );

      expect(result.success).toBe(true);
      // YouTube skipped, only article fetched
      expect(result.data?.fullPages.length).toBe(1);
      expect(result.data?.fullPages[0].url).toContain('example.com');
    });

    it('handles individual page fetch failure gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => `[1] Title: Page 1
URL Source: https://example.com/page1
Description: First page

[2] Title: Page 2
URL Source: https://example.com/page2
Description: Second page`,
      });

      // First page fails
      fetchMock.mockRejectedValueOnce(new Error('Page timeout'));
      // Second page succeeds
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => '# Page 2 content',
      });

      const result = await webResearchTool.execute(
        { query: 'test', fetchTopUrls: 2 },
        {} as any
      );

      expect(result.success).toBe(true);
      // One page failed, one succeeded
      expect(result.data?.fullPages.length).toBe(1);
      expect(result.data?.fullPages[0].url).toContain('page2');
    });
  });

  describe('execute — JSON response format', () => {
    it('parses JSON response from Jina', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            data: [
              { title: 'Result 1', url: 'https://example.com/1', description: 'Desc 1' },
              { title: 'Result 2', url: 'https://example.com/2', content: 'Content 2' },
            ],
          }),
      });

      const result = await webResearchTool.execute(
        { query: 'json test', fetchTopUrls: 0 },
        {} as any
      );

      expect(result.success).toBe(true);
      expect(result.data?.snippets.length).toBe(2);
      expect(result.data?.snippets[0].title).toBe('Result 1');
    });
  });
});
