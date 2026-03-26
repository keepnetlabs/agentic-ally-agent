import { describe, it, expect, vi } from 'vitest';

// Mock model providers
vi.mock('../../model-providers', () => ({
  getDefaultAgentModel: vi.fn(() => ({ modelId: 'mock-model' })),
}));

// Mock tracked generate
const mockGenerateText = vi.fn();
vi.mock('../../utils/core/tracked-generate', () => ({
  trackedGenerateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// Mock KVService
const kvPutMock = vi.fn().mockResolvedValue(true);
vi.mock('../../services/kv-service', () => ({
  KVService: class MockKVService {
    get = vi.fn();
    put = kvPutMock;
  },
}));

const { expandReportSectionsTool } = await import('./expand-report-sections-tool');

// Helper: build a minimal valid outline
const buildOutline = (sectionOverrides?: Array<Record<string, unknown>>) => ({
  meta: {
    title: 'Test Report',
    subtitle: 'Test',
    author: 'Agent',
    generatedAt: '2026-01-01T00:00:00.000Z',
    language: 'en',
    pageTarget: 3,
  },
  sections: sectionOverrides || [
    { type: 'cover', id: 'cover', title: 'Cover', weight: 1.0, brief: 'Cover page' },
    { type: 'executive_summary', id: 'exec', title: 'Summary', weight: 0.5, brief: 'Overview' },
    { type: 'content', id: 'content-1', title: 'Analysis', weight: 1.0, brief: 'Details' },
    { type: 'chart', id: 'chart-1', title: 'Trends', weight: 0.5, brief: 'Chart', chartType: 'bar' },
  ],
});

// Helper: return valid section JSON for a given section type
function mockSectionResponse(section: Record<string, unknown>) {
  const type = section.type as string;
  const base = { type, id: section.id, title: section.title, weight: section.weight };

  switch (type) {
    case 'cover':
      return JSON.stringify({ ...base, subtitle: 'Test', date: '2026-01-01' });
    case 'executive_summary':
      return JSON.stringify({ ...base, content: 'Summary text', keyFindings: ['Finding 1'] });
    case 'content':
      return JSON.stringify({ ...base, content: '## Analysis\n\nDetails here.' });
    case 'chart':
      return JSON.stringify({
        ...base,
        description: 'Trend data',
        chartConfig: {
          type: 'bar',
          data: { labels: ['A', 'B'], datasets: [{ label: 'S1', data: [10, 20], backgroundColor: ['#0B326F', '#E94F2E'] }] },
          options: {},
        },
      });
    default:
      return JSON.stringify({ ...base, content: 'Fallback' });
  }
}

describe('expand-report-sections-tool', () => {
  describe('tool definition', () => {
    it('has correct tool id', () => {
      expect(expandReportSectionsTool.id).toBe('expand_report_sections');
    });
  });

  describe('execute — success path', () => {
    it('expands all sections and stores in KV', async () => {
      const outline = buildOutline();

      // Mock LLM responses for each section
      for (const section of outline.sections) {
        mockGenerateText.mockResolvedValueOnce({
          text: mockSectionResponse(section),
          usage: { inputTokens: 100, outputTokens: 50 },
        });
      }

      const result = await expandReportSectionsTool.execute!(
        { outline } as any,
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.sectionCount).toBe(4);
      expect(data.expandRef).toBeDefined();
      expect(kvPutMock).toHaveBeenCalled();
    });
  });

  describe('execute — retry on failure', () => {
    it('retries failed non-critical section and uses placeholder on second failure', async () => {
      const outline = buildOutline([
        { type: 'cover', id: 'cover', title: 'Cover', weight: 1.0, brief: 'Cover' },
        { type: 'content', id: 'analysis', title: 'Analysis', weight: 1.0, brief: 'Details' },
      ]);

      // Cover succeeds
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({ type: 'cover', id: 'cover', title: 'Cover', weight: 1.0, subtitle: 'X', date: '2026-01-01' }),
        usage: {},
      });

      // Content fails first time
      mockGenerateText.mockRejectedValueOnce(new Error('LLM timeout'));

      // Content retry also fails → should become placeholder
      mockGenerateText.mockRejectedValueOnce(new Error('LLM timeout again'));

      const result = await expandReportSectionsTool.execute!(
        { outline } as any,
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.sectionCount).toBe(2);
      expect(data.failedSections).toEqual(['analysis']);
    });

    it('fails entire report when critical section (cover) fails after retry', async () => {
      const outline = buildOutline([
        { type: 'cover', id: 'cover', title: 'Cover', weight: 1.0, brief: 'Cover' },
      ]);

      // Cover fails first time
      mockGenerateText.mockRejectedValueOnce(new Error('Cover generation failed'));
      // Cover retry also fails
      mockGenerateText.mockRejectedValueOnce(new Error('Cover retry failed'));

      const result = await expandReportSectionsTool.execute!(
        { outline } as any,
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Critical section');
    });
  });

  describe('execute — KV storage failure', () => {
    it('returns success with warning when KV put fails', async () => {
      const outline = buildOutline([
        { type: 'cover', id: 'cover', title: 'Cover', weight: 1.0, brief: 'Cover' },
      ]);

      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({ type: 'cover', id: 'cover', title: 'Cover', weight: 1.0, subtitle: 'X', date: '2026-01-01' }),
        usage: {},
      });

      kvPutMock.mockResolvedValueOnce(false); // KV put fails

      const result = await expandReportSectionsTool.execute!(
        { outline } as any,
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.error).toContain('KV storage failed');
    });
  });

  describe('execute — LLM exception', () => {
    it('returns error when all LLM calls throw', async () => {
      const outline = buildOutline([
        { type: 'content', id: 'c1', title: 'Test', weight: 0.5, brief: 'Brief' },
      ]);

      mockGenerateText.mockRejectedValueOnce(new Error('Model down'));
      mockGenerateText.mockRejectedValueOnce(new Error('Model still down'));

      const result = await expandReportSectionsTool.execute!(
        { outline } as any,
        {} as any
      ) as Record<string, unknown>;

      // Non-critical section → placeholder → success with failedSections
      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.failedSections).toEqual(['c1']);
    });
  });
});
