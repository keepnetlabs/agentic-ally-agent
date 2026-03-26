import { describe, it, expect, vi } from 'vitest';

// Mock model providers
vi.mock('../../model-providers', () => ({
  getDefaultAgentModel: vi.fn(() => ({ modelId: 'mock-model' })),
}));

// Mock tracked generate — returns a valid outline JSON
const mockGenerateText = vi.fn();
vi.mock('../../utils/core/tracked-generate', () => ({
  trackedGenerateText: (...args: unknown[]) => mockGenerateText(...args),
}));

const { generateReportOutlineTool } = await import('./generate-report-outline-tool');

const validOutlineJson = JSON.stringify({
  meta: {
    title: 'Cybersecurity Report',
    subtitle: 'Q1 2026',
    author: 'Agentic Ally',
    generatedAt: '2026-03-26T00:00:00.000Z',
    language: 'en',
    pageTarget: 5,
  },
  sections: [
    { type: 'cover', id: 'cover', title: 'Cybersecurity Report', weight: 1.0, brief: 'Cover page' },
    { type: 'executive_summary', id: 'exec-summary', title: 'Executive Summary', weight: 0.5, brief: 'Overview of findings' },
    { type: 'kpi_dashboard', id: 'kpi-dashboard', title: 'Key Metrics', weight: 0.5, brief: 'Security KPIs' },
    { type: 'chart', id: 'attack-trends', title: 'Attack Trends', weight: 0.75, brief: 'Monthly attack data', chartType: 'bar' },
    { type: 'content', id: 'detailed-analysis', title: 'Analysis', weight: 0.75, brief: 'Detailed threat analysis' },
    { type: 'recommendations', id: 'recs', title: 'Recommendations', weight: 0.75, brief: 'Action items' },
    { type: 'content', id: 'conclusion', title: 'Conclusion', weight: 0.75, brief: 'Summary and next steps' },
  ],
});

describe('generate-report-outline-tool', () => {
  describe('tool definition', () => {
    it('has correct tool id', () => {
      expect(generateReportOutlineTool.id).toBe('generate_report_outline');
    });
  });

  describe('execute — success path', () => {
    it('returns success with valid outline', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: validOutlineJson,
        usage: { inputTokens: 500, outputTokens: 300 },
      });

      const result = await generateReportOutlineTool.execute!(
        { topic: 'Cybersecurity', pageTarget: 5, language: 'en', mode: 'generate' },
        {} as any
      );

      const res = result as Record<string, unknown>;
      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      const data = res.data as Record<string, unknown>;
      expect(data.meta).toBeDefined();
      expect(data.sections).toBeDefined();
    });

    it('passes research context to LLM when provided', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: validOutlineJson,
        usage: { inputTokens: 800, outputTokens: 300 },
      });

      await generateReportOutlineTool.execute!(
        {
          topic: 'Cybersecurity',
          pageTarget: 5,
          language: 'en',
          mode: 'generate',
          researchContext: 'Some research data from web search',
        },
        {} as any
      );

      // Verify trackedGenerateText was called
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateText.mock.calls[0];
      expect(callArgs[0]).toBe('report-outline');
      // User message should contain research context
      const messages = callArgs[1].messages;
      const userMsg = messages.find((m: { role: string }) => m.role === 'user');
      expect(userMsg.content).toContain('Some research data');
    });

    it('defaults pageTarget to 5 when not provided', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: validOutlineJson,
        usage: {},
      });

      const result = await generateReportOutlineTool.execute!(
        { topic: 'Test Report' } as any,
        {} as any
      );

      expect((result as Record<string, unknown>).success).toBe(true);
    });
  });

  describe('execute — error paths', () => {
    it('returns error when LLM produces invalid JSON', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: 'This is not JSON at all',
        usage: {},
      });

      const result = await generateReportOutlineTool.execute!(
        { topic: 'Test', pageTarget: 3, language: 'en', mode: 'generate' },
        {} as any
      );

      const res = result as Record<string, unknown>;
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('returns error when LLM call throws', async () => {
      mockGenerateText.mockRejectedValueOnce(new Error('Model timeout'));

      const r1 = await generateReportOutlineTool.execute!(
        { topic: 'Test', pageTarget: 3, language: 'en', mode: 'generate' },
        {} as any
      ) as Record<string, unknown>;

      expect(r1.success).toBe(false);
      expect(r1.error).toContain('failed');
    });

    it('returns error when schema validation fails', async () => {
      // Valid JSON but missing required fields
      mockGenerateText.mockResolvedValueOnce({
        text: JSON.stringify({ meta: { title: 'X' }, sections: [] }),
        usage: {},
      });

      const r2 = await generateReportOutlineTool.execute!(
        { topic: 'Test', pageTarget: 3, language: 'en', mode: 'generate' },
        {} as any
      ) as Record<string, unknown>;

      expect(r2.success).toBe(false);
      expect(r2.error).toContain('validation');
    });
  });

  describe('execute — enhance mode', () => {
    it('includes source document summary in LLM call', async () => {
      mockGenerateText.mockResolvedValueOnce({
        text: validOutlineJson,
        usage: {},
      });

      await generateReportOutlineTool.execute!(
        {
          topic: 'Transformed Report',
          pageTarget: 5,
          language: 'en',
          mode: 'enhance',
          sourceDocument: 'This is a long document with lots of content about security...',
        },
        {} as any
      );

      const callArgs = mockGenerateText.mock.calls[0];
      const messages = callArgs[1].messages;
      const userMsg = messages.find((m: { role: string }) => m.role === 'user');
      expect(userMsg.content).toContain('enhance');
      expect(userMsg.content).toContain('long document');
    });
  });
});
