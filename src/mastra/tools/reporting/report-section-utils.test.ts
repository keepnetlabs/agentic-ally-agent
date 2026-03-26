import { describe, it, expect, vi } from 'vitest';
import { loadLatestReport, autoCorrectSection } from './report-section-utils';

// ============================================
// loadLatestReport
// ============================================

describe('loadLatestReport', () => {
  const validReport = {
    reportId: 'rpt_test',
    version: 3,
    pageTarget: 5,
    report: {
      meta: { title: 'Test', author: 'Agent', generatedAt: '2026-01-01', language: 'en', pageTarget: 5 },
      sections: [{ type: 'cover', id: 'cover', title: 'Cover', weight: 1.0, date: '2026-01-01' }],
    },
    editHistory: [],
  };

  it('returns null when no versions exist', async () => {
    const kvService = { get: vi.fn().mockResolvedValue(null) };
    const result = await loadLatestReport(kvService as any, 'rpt_none');
    expect(result).toBeNull();
    // Should have attempted all 20 versions in parallel
    expect(kvService.get).toHaveBeenCalledTimes(20);
  });

  it('returns latest version when multiple exist', async () => {
    const v5Report = { ...validReport, version: 5 };
    const v3Report = { ...validReport, version: 3 };
    const kvService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'report:rpt_test:v5') return Promise.resolve(v5Report);
        if (key === 'report:rpt_test:v3') return Promise.resolve(v3Report);
        return Promise.resolve(null);
      }),
    };

    const result = await loadLatestReport(kvService as any, 'rpt_test');
    expect(result?.version).toBe(5);
  });

  it('returns v1 when only v1 exists', async () => {
    const v1Report = { ...validReport, version: 1 };
    const kvService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'report:rpt_test:v1') return Promise.resolve(v1Report);
        return Promise.resolve(null);
      }),
    };

    const result = await loadLatestReport(kvService as any, 'rpt_test');
    expect(result?.version).toBe(1);
  });

  it('skips invalid report data and returns next valid one', async () => {
    const invalidData = { bad: 'data' };
    const v2Report = { ...validReport, version: 2 };
    const kvService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'report:rpt_test:v3') return Promise.resolve(invalidData);
        if (key === 'report:rpt_test:v2') return Promise.resolve(v2Report);
        return Promise.resolve(null);
      }),
    };

    const result = await loadLatestReport(kvService as any, 'rpt_test');
    expect(result?.version).toBe(2);
  });

  it('handles KV errors gracefully via Promise.allSettled', async () => {
    const v1Report = { ...validReport, version: 1 };
    const kvService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'report:rpt_test:v20') return Promise.reject(new Error('KV timeout'));
        if (key === 'report:rpt_test:v1') return Promise.resolve(v1Report);
        return Promise.resolve(null);
      }),
    };

    const result = await loadLatestReport(kvService as any, 'rpt_test');
    expect(result?.version).toBe(1);
  });

  it('fetches all 20 versions in parallel (not sequential)', async () => {
    const callOrder: string[] = [];
    const kvService = {
      get: vi.fn().mockImplementation((key: string) => {
        callOrder.push(key);
        return Promise.resolve(null);
      }),
    };

    await loadLatestReport(kvService as any, 'rpt_test');
    expect(kvService.get).toHaveBeenCalledTimes(20);
    // Verify keys are for v20 down to v1
    expect(callOrder[0]).toBe('report:rpt_test:v20');
    expect(callOrder[19]).toBe('report:rpt_test:v1');
  });
});

// ============================================
// autoCorrectSection
// ============================================

describe('autoCorrectSection', () => {
  describe('KPI dashboard trends', () => {
    it('keeps valid trends unchanged', () => {
      const section: Record<string, unknown> = {
        type: 'kpi_dashboard',
        kpis: [
          { label: 'Users', value: '100', trend: 'up' },
          { label: 'Cost', value: '$50', trend: 'down' },
          { label: 'Risk', value: '10%', trend: 'stable' },
        ],
      };
      autoCorrectSection(section);
      const kpis = section.kpis as Array<Record<string, unknown>>;
      expect(kpis[0].trend).toBe('up');
      expect(kpis[1].trend).toBe('down');
      expect(kpis[2].trend).toBe('stable');
    });

    it('corrects invalid trends to stable', () => {
      const section: Record<string, unknown> = {
        type: 'kpi_dashboard',
        kpis: [
          { label: 'Metric', value: '42', trend: 'rising' },
          { label: 'Score', value: '88', trend: 'decreasing' },
        ],
      };
      autoCorrectSection(section);
      const kpis = section.kpis as Array<Record<string, unknown>>;
      expect(kpis[0].trend).toBe('stable');
      expect(kpis[1].trend).toBe('stable');
    });

    it('does nothing for non-kpi sections', () => {
      const section: Record<string, unknown> = {
        type: 'content',
        content: 'hello',
      };
      autoCorrectSection(section);
      expect(section.type).toBe('content');
    });
  });

  describe('Timeline status', () => {
    it('maps done→completed, ongoing→in_progress, future→planned', () => {
      const section: Record<string, unknown> = {
        type: 'timeline',
        items: [
          { date: '2025-01', event: 'Launch', status: 'done' },
          { date: '2025-06', event: 'Phase 2', status: 'ongoing' },
          { date: '2026-01', event: 'Phase 3', status: 'future' },
        ],
      };
      autoCorrectSection(section);
      const items = section.items as Array<Record<string, unknown>>;
      expect(items[0].status).toBe('completed');
      expect(items[1].status).toBe('in_progress');
      expect(items[2].status).toBe('planned');
    });

    it('maps finished→completed, active→in_progress, upcoming→planned', () => {
      const section: Record<string, unknown> = {
        type: 'timeline',
        items: [
          { date: '2025-01', event: 'A', status: 'finished' },
          { date: '2025-06', event: 'B', status: 'active' },
          { date: '2026-01', event: 'C', status: 'upcoming' },
        ],
      };
      autoCorrectSection(section);
      const items = section.items as Array<Record<string, unknown>>;
      expect(items[0].status).toBe('completed');
      expect(items[1].status).toBe('in_progress');
      expect(items[2].status).toBe('planned');
    });

    it('keeps valid statuses unchanged', () => {
      const section: Record<string, unknown> = {
        type: 'timeline',
        items: [{ date: '2025-01', event: 'X', status: 'completed' }],
      };
      autoCorrectSection(section);
      const items = section.items as Array<Record<string, unknown>>;
      expect(items[0].status).toBe('completed');
    });
  });

  describe('Recommendations priority', () => {
    it('maps urgent→critical, important→high, normal→medium, minor→low', () => {
      const section: Record<string, unknown> = {
        type: 'recommendations',
        items: [
          { text: 'A', priority: 'urgent' },
          { text: 'B', priority: 'important' },
          { text: 'C', priority: 'normal' },
          { text: 'D', priority: 'minor' },
          { text: 'E', priority: 'optional' },
        ],
      };
      autoCorrectSection(section);
      const items = section.items as Array<Record<string, unknown>>;
      expect(items[0].priority).toBe('critical');
      expect(items[1].priority).toBe('high');
      expect(items[2].priority).toBe('medium');
      expect(items[3].priority).toBe('low');
      expect(items[4].priority).toBe('low');
    });

    it('keeps valid priorities unchanged', () => {
      const section: Record<string, unknown> = {
        type: 'recommendations',
        items: [
          { text: 'X', priority: 'critical' },
          { text: 'Y', priority: 'high' },
        ],
      };
      autoCorrectSection(section);
      const items = section.items as Array<Record<string, unknown>>;
      expect(items[0].priority).toBe('critical');
      expect(items[1].priority).toBe('high');
    });
  });

  describe('Edge cases', () => {
    it('handles empty kpis array', () => {
      const section: Record<string, unknown> = { type: 'kpi_dashboard', kpis: [] };
      autoCorrectSection(section);
      expect((section.kpis as unknown[]).length).toBe(0);
    });

    it('handles empty timeline items', () => {
      const section: Record<string, unknown> = { type: 'timeline', items: [] };
      autoCorrectSection(section);
      expect((section.items as unknown[]).length).toBe(0);
    });

    it('handles empty recommendations items', () => {
      const section: Record<string, unknown> = { type: 'recommendations', items: [] };
      autoCorrectSection(section);
      expect((section.items as unknown[]).length).toBe(0);
    });

    it('handles section without expected array field', () => {
      const section: Record<string, unknown> = { type: 'kpi_dashboard' };
      // Should not throw
      autoCorrectSection(section);
      expect(section.type).toBe('kpi_dashboard');
    });
  });
});
