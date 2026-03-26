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

// Mock loadLatestReport directly — avoids KVService constructor issues
const mockLoadLatestReport = vi.fn();
vi.mock('./report-section-utils', () => ({
  loadLatestReport: (...args: unknown[]) => mockLoadLatestReport(...args),
  autoCorrectSection: vi.fn(),
}));

// Mock KVService — must use class syntax for `new KVService()` in tool
const kvPutMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../../services/kv-service', () => ({
  KVService: class MockKVService {
    get = vi.fn();
    put = kvPutMock;
  },
}));

const { editReportSectionTool } = await import('./edit-report-section-tool');

const validReportState = {
  reportId: 'rpt_test123',
  version: 1,
  pageTarget: 5,
  report: {
    meta: { title: 'Test Report', author: 'Agent', generatedAt: '2026-01-01', language: 'en', pageTarget: 5 },
    sections: [
      { type: 'cover', id: 'cover', title: 'Test Report', weight: 1.0, date: '2026-01-01' },
      { type: 'executive_summary', id: 'exec-summary', title: 'Executive Summary', weight: 0.5, content: 'Old summary', keyFindings: ['Finding 1'] },
      { type: 'table', id: 'data-table', title: 'Data Table', weight: 0.5, columns: ['A', 'B'], rows: [['1', '2']] },
    ],
  },
  editHistory: [],
};

describe('edit-report-section-tool', () => {
  describe('tool definition', () => {
    it('has correct tool id', () => {
      expect(editReportSectionTool.id).toBe('edit_report_section');
    });
  });

  describe('execute — report not found', () => {
    it('returns error when report not found in KV', async () => {
      mockLoadLatestReport.mockResolvedValueOnce(null);

      const result = await editReportSectionTool.execute!(
        { reportId: 'rpt_missing', sectionRef: 'table', instruction: 'Change data' },
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('execute — section not found', () => {
    it('returns error when section ref does not match', async () => {
      mockLoadLatestReport.mockResolvedValueOnce(validReportState);

      const result = await editReportSectionTool.execute!(
        { reportId: 'rpt_test123', sectionRef: 'nonexistent-xyz', instruction: 'Change it' },
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('execute — success path', () => {
    it('finds section by type and regenerates', async () => {
      mockLoadLatestReport.mockResolvedValueOnce(validReportState);

      const newSection = {
        type: 'table',
        id: 'data-table',
        title: 'Data Table',
        weight: 0.5,
        columns: ['Q1', 'Q2'],
        rows: [['100', '200']],
      };
      mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(newSection), usage: {} });

      const result = await editReportSectionTool.execute!(
        { reportId: 'rpt_test123', sectionRef: 'table', instruction: 'Show quarterly data' },
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('finds section by id', async () => {
      mockLoadLatestReport.mockResolvedValueOnce(validReportState);

      const newSection = {
        type: 'executive_summary',
        id: 'exec-summary',
        title: 'Executive Summary',
        weight: 0.5,
        content: 'Updated summary',
        keyFindings: ['New finding'],
      };
      mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(newSection), usage: {} });

      const result = await editReportSectionTool.execute!(
        { reportId: 'rpt_test123', sectionRef: 'exec-summary', instruction: 'Update findings' },
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(true);
    });

    it('finds section by title (case-insensitive)', async () => {
      mockLoadLatestReport.mockResolvedValueOnce(validReportState);

      const newSection = {
        type: 'table',
        id: 'data-table',
        title: 'Data Table',
        weight: 0.5,
        columns: ['X', 'Y'],
        rows: [['A', 'B']],
      };
      mockGenerateText.mockResolvedValueOnce({ text: JSON.stringify(newSection), usage: {} });

      const result = await editReportSectionTool.execute!(
        { reportId: 'rpt_test123', sectionRef: 'data table', instruction: 'Update' },
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(true);
    });
  });

  describe('execute — LLM error', () => {
    it('returns error when LLM fails', async () => {
      mockLoadLatestReport.mockResolvedValueOnce(validReportState);
      mockGenerateText.mockRejectedValueOnce(new Error('LLM timeout'));

      const result = await editReportSectionTool.execute!(
        { reportId: 'rpt_test123', sectionRef: 'table', instruction: 'Change it' },
        {} as any
      ) as Record<string, unknown>;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
