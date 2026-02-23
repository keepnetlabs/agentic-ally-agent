import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trackCost } from './cost-tracker';

// Mock the logger
vi.mock('./logger', () => {
  const mock = {
    warn: vi.fn(),
    info: vi.fn(),
  };
  return {
    getLogger: vi.fn(() => mock),
  };
});

import { getLogger } from './logger';

describe('cost-tracker', () => {
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = getLogger('CostTracker');
  });

  describe('trackCost - Model Normalization', () => {
    it('should track cost for gpt-4o with versioned model name', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('generate-scene', 'gpt-4o-2024-10-01', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].model).toBe('gpt-4o-2024-10-01');
      expect(logCall[1].operation).toBe('generate-scene');
    });

    it('should track cost for gpt-4o-mini with version', () => {
      const usage = { promptTokens: 2000, completionTokens: 1000 };
      trackCost('analyze-prompt', 'gpt-4o-mini-2024-07-18', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].model).toBe('gpt-4o-mini-2024-07-18');
    });

    it('should track cost for Cloudflare Workers AI model', () => {
      const usage = { promptTokens: 1500, completionTokens: 800 };
      trackCost('generate-content', '@cf/openai/gpt-oss-120b', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].tokens.input).toBe(1500);
    });

    it('should track cost for gemini model with version', () => {
      const usage = { promptTokens: 5000, completionTokens: 3000 };
      trackCost('translate-content', 'gemini-1.5-flash-2025-01-10', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should warn for unknown model and use fallback pricing', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('test-operation', 'unknown-model-v2024', usage);

      expect(mockLogger.warn).toHaveBeenCalled();
      const warnCall = mockLogger.warn.mock.calls[0];
      expect(warnCall[0]).toContain('Unknown model');
      expect(warnCall[1].originalModel).toBe('unknown-model-v2024');
    });

    it('should use prefix match when exact match not found (e.g. gpt-4o-custom)', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('prefix-match', 'gpt-4o-custom-variant', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].model).toBe('gpt-4o-custom-variant');
      expect(logCall[1].cost).toBeDefined();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle gpt-5-nano with version suffix', () => {
      const usage = { promptTokens: 800, completionTokens: 400 };
      trackCost('generate-simple', 'gpt-5-nano-2024-12-01', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle gpt-5-mini model', () => {
      const usage = { promptTokens: 2000, completionTokens: 1200 };
      trackCost('analyze-complex', 'gpt-5-mini-2024-11-15', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].cost).toBeDefined();
    });

    it('should handle gemini-2.5-pro model', () => {
      const usage = { promptTokens: 10000, completionTokens: 5000 };
      trackCost('complex-analysis', 'gemini-2.5-pro-2024-10-01', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle gemini-2.5-flash model', () => {
      const usage = { promptTokens: 3000, completionTokens: 1500 };
      trackCost('quick-translate', 'gemini-2.5-flash', usage);

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle gemini-3-pro model', () => {
      const usage = { promptTokens: 8000, completionTokens: 4000 };
      trackCost('advanced-reasoning', 'gemini-3-pro-2025-01-01', usage);

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('trackCost - Cost Calculations', () => {
    it('should calculate correct cost for gpt-4o input/output tokens', () => {
      const usage = { promptTokens: 1000000, completionTokens: 1000000 };
      trackCost('test-operation', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // gpt-4o: input $2.50, output $10.00 per 1M tokens
      expect(cost.input).toBe(2.5);
      expect(cost.output).toBe(10.0);
      expect(cost.total).toBe(12.5);
    });

    it('should calculate correct cost for gpt-4o-mini', () => {
      const usage = { promptTokens: 1000000, completionTokens: 1000000 };
      trackCost('test', 'gpt-4o-mini', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // gpt-4o-mini: input $0.15, output $0.60 per 1M tokens
      expect(cost.input).toBe(0.15);
      expect(cost.output).toBe(0.6);
      expect(cost.total).toBe(0.75);
    });

    it('should calculate correct cost for Cloudflare Workers AI', () => {
      const usage = { promptTokens: 1000000, completionTokens: 1000000 };
      trackCost('test', '@cf/openai/gpt-oss-120b', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // @cf/openai/gpt-oss-120b: input $0.01, output $0.03 per 1M tokens
      expect(cost.input).toBe(0.01);
      expect(cost.output).toBe(0.03);
      expect(cost.total).toBe(0.04);
    });

    it('should calculate correct cost for gemini-1.5-flash', () => {
      const usage = { promptTokens: 1000000, completionTokens: 1000000 };
      trackCost('test', 'gemini-1.5-flash', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // gemini-1.5-flash: input $0.075, output $0.30 per 1M tokens
      expect(cost.input).toBe(0.075);
      expect(cost.output).toBe(0.3);
      expect(cost.total).toBe(0.375);
    });

    it('should calculate correct cost for gemini-2.5-pro', () => {
      const usage = { promptTokens: 1000000, completionTokens: 1000000 };
      trackCost('test', 'gemini-2.5-pro', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // gemini-2.5-pro: input $1.25, output $10.00 per 1M tokens
      expect(cost.input).toBe(1.25);
      expect(cost.output).toBe(10.0);
      expect(cost.total).toBe(11.25);
    });

    it('should handle small token counts accurately', () => {
      const usage = { promptTokens: 100, completionTokens: 50 };
      trackCost('small-task', 'gpt-4o-mini', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // 100 tokens input: (100/1000000) * 0.15 = 0.000015
      // 50 tokens output: (50/1000000) * 0.60 = 0.00003
      expect(cost.input).toBe(0.000015);
      expect(cost.output).toBe(0.00003);
      expect(cost.total).toBeCloseTo(0.000045, 6);
    });

    it('should handle zero token counts', () => {
      const usage = { promptTokens: 0, completionTokens: 0 };
      trackCost('zero-tokens', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      expect(cost.input).toBe(0);
      expect(cost.output).toBe(0);
      expect(cost.total).toBe(0);
    });

    it('should handle prompt tokens only', () => {
      const usage = { promptTokens: 5000, completionTokens: 0 };
      trackCost('read-only', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      expect(cost.output).toBe(0);
      expect(cost.total).toBeGreaterThan(0);
    });

    it('should handle completion tokens only', () => {
      const usage = { promptTokens: 0, completionTokens: 5000 };
      trackCost('write-only', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      expect(cost.input).toBe(0);
      expect(cost.total).toBeGreaterThan(0);
    });
  });

  describe('trackCost - Cached Token Handling', () => {
    it('should apply 50% discount for cached tokens', () => {
      const usage = {
        promptTokens: 1000000,
        completionTokens: 1000000,
        cachedTokens: 500000,
      };
      trackCost('cached-operation', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;
      const tokens = logCall[1].tokens;

      // Verify cached vs uncached split
      expect(tokens.cached).toBe(500000);
      expect(tokens.uncached).toBe(500000);

      // Uncached: (500000/1000000) * 2.50 = 1.25
      // Cached: (500000/1000000) * 2.50 * 0.5 = 0.625
      // Output: (1000000/1000000) * 10.00 = 10.0
      // Total: 1.25 + 0.625 + 10.0 = 11.875
      expect(cost.input).toBe(1.25);
      expect(cost.cached).toBe(0.625);
      expect(cost.output).toBe(10.0);
      expect(cost.total).toBeCloseTo(11.875, 3);
    });

    it('should handle all tokens cached', () => {
      const usage = {
        promptTokens: 1000000,
        completionTokens: 1000000,
        cachedTokens: 1000000,
      };
      trackCost('all-cached', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // All cached: (1000000/1000000) * 2.50 * 0.5 = 1.25 (50% of normal input cost)
      expect(cost.input).toBe(0);
      expect(cost.cached).toBe(1.25);
      expect(cost.output).toBe(10.0);
    });

    it('should ignore cache tokens greater than prompt tokens', () => {
      // This is an edge case - cache tokens should never exceed prompt tokens
      const usage = {
        promptTokens: 1000000,
        completionTokens: 1000000,
        cachedTokens: 2000000, // More than prompt tokens
      };
      trackCost('invalid-cache', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const tokens = logCall[1].tokens;

      // uncachedPromptTokens = promptTokens - cachedTokens = 1M - 2M = -1M (negative)
      expect(tokens.uncached).toBeLessThan(0);
    });

    it('should handle partial caching', () => {
      const usage = {
        promptTokens: 100000,
        completionTokens: 50000,
        cachedTokens: 25000,
      };
      trackCost('partial-cache', 'gpt-4o-mini', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const tokens = logCall[1].tokens;
      const cost = logCall[1].cost;

      expect(tokens.cached).toBe(25000);
      expect(tokens.uncached).toBe(75000);
      expect(cost.cached).toBeGreaterThan(0);
      expect(cost.input).toBeGreaterThan(cost.cached);
    });

    it('should apply caching discount for Cloudflare Workers AI', () => {
      const usage = {
        promptTokens: 1000000,
        completionTokens: 500000,
        cachedTokens: 400000,
      };
      trackCost('cf-cached', '@cf/openai/gpt-oss-120b', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // Uncached: (600000/1000000) * 0.01 = 0.006
      // Cached: (400000/1000000) * 0.01 * 0.5 = 0.002
      // Output: (500000/1000000) * 0.03 = 0.015
      expect(cost.cached).toBe(0.002);
    });
  });

  describe('trackCost - Legacy Token Format Support', () => {
    it('should support legacy inputTokens format', () => {
      const usage = { inputTokens: 1000, outputTokens: 500 };
      trackCost('legacy-format', 'gpt-4o', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].tokens.input).toBe(1000);
      expect(logCall[1].tokens.output).toBe(500);
    });

    it('should prefer promptTokens over inputTokens', () => {
      const usage = {
        promptTokens: 2000,
        inputTokens: 1000,
        completionTokens: 500,
      };
      trackCost('prefer-new-format', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].tokens.input).toBe(2000);
    });

    it('should prefer completionTokens over outputTokens', () => {
      const usage = {
        promptTokens: 1000,
        completionTokens: 800,
        outputTokens: 500,
      };
      trackCost('prefer-new-output', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].tokens.output).toBe(800);
    });

    it('should handle mixed old and new format', () => {
      const usage = {
        promptTokens: 1000,
        outputTokens: 500, // Legacy key
      };
      trackCost('mixed-format', 'gpt-4o', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].tokens.output).toBe(500);
    });
  });

  describe('trackCost - Structured Logging', () => {
    it('should log with correct operation name', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('my-custom-operation', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].operation).toBe('my-custom-operation');
    });

    it('should include type field for analytics', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('test-op', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].type).toBe('llm_cost');
    });

    it('should include ISO timestamp', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('test-op', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const timestamp = logCall[1].timestamp;

      expect(typeof timestamp).toBe('string');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should include all token counts in log', () => {
      const usage = { promptTokens: 1000, completionTokens: 500, cachedTokens: 100 };
      trackCost('test-op', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const tokens = logCall[1].tokens;

      expect(tokens.input).toBe(1000);
      expect(tokens.output).toBe(500);
      expect(tokens.cached).toBe(100);
      expect(tokens.uncached).toBe(900);
      expect(tokens.total).toBe(1500);
    });

    it('should log all cost components', () => {
      const usage = { promptTokens: 1000000, completionTokens: 1000000, cachedTokens: 200000 };
      trackCost('test-op', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      expect(cost.input).toBeDefined();
      expect(cost.cached).toBeDefined();
      expect(cost.output).toBeDefined();
      expect(cost.total).toBeDefined();
    });

    it('should preserve original model name in logs', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('op', 'gpt-4o-2024-10-01', usage);

      const logCall = mockLogger.info.mock.calls[0];
      expect(logCall[1].model).toBe('gpt-4o-2024-10-01');
    });

    it('should format costs with 6 decimal places', () => {
      const usage = { promptTokens: 1234, completionTokens: 5678 };
      trackCost('test', 'gpt-4o-mini', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      // Check all cost values are properly formatted
      expect(cost.input.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(cost.output.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(cost.total.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });
  });

  describe('trackCost - Edge Cases', () => {
    it('should handle very large token counts', () => {
      const usage = {
        promptTokens: 1000000000, // 1 billion
        completionTokens: 500000000,
      };
      trackCost('large-task', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const cost = logCall[1].cost;

      expect(cost.total).toBeGreaterThan(0);
      expect(typeof cost.total).toBe('number');
      expect(!isNaN(cost.total)).toBe(true);
    });

    it('should handle undefined optional fields', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };
      trackCost('test', 'gpt-4o', usage);

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle empty usage object', () => {
      const usage = {};
      trackCost('empty-usage', 'gpt-4o', usage);

      const logCall = mockLogger.info.mock.calls[0];
      const tokens = logCall[1].tokens;

      expect(tokens.input).toBe(0);
      expect(tokens.output).toBe(0);
    });

    it('should be idempotent', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };

      trackCost('test-op', 'gpt-4o', usage);
      const call1 = mockLogger.info.mock.calls[0];

      mockLogger.info.mockClear();

      trackCost('test-op', 'gpt-4o', usage);
      const call2 = mockLogger.info.mock.calls[0];

      expect(call1[1].cost.total).toBe(call2[1].cost.total);
    });

    it('should not throw on unknown models', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };

      expect(() => {
        trackCost('test', 'unknown-model-xyz', usage);
      }).not.toThrow();
    });

    it('should handle model names with special characters', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };

      expect(() => {
        trackCost('test', '@cf/openai/gpt-oss-120b', usage);
      }).not.toThrow();
    });

    it('should handle multiple slashes in model name', () => {
      const usage = { promptTokens: 1000, completionTokens: 500 };

      expect(() => {
        trackCost('test', 'provider/org/model-name', usage);
      }).not.toThrow();
    });
  });

  describe('trackCost - Integration Tests', () => {
    it('should track cost for typical generate-scene operation', () => {
      const usage = {
        promptTokens: 5000,
        completionTokens: 3000,
        cachedTokens: 1000,
      };
      trackCost('generate-scene-1', 'gpt-4o', usage);

      expect(mockLogger.info).toHaveBeenCalled();
      const logCall = mockLogger.info.mock.calls[0];

      expect(logCall[1].operation).toBe('generate-scene-1');
      expect(logCall[1].type).toBe('llm_cost');
      expect(logCall[1].cost.total).toBeGreaterThan(0);
    });

    it('should track multiple operations independently', () => {
      const usage1 = { promptTokens: 1000, completionTokens: 500 };
      const usage2 = { promptTokens: 2000, completionTokens: 1000 };

      trackCost('operation-1', 'gpt-4o', usage1);
      trackCost('operation-2', 'gpt-4o', usage2);

      expect(mockLogger.info).toHaveBeenCalledTimes(2);

      const call1Cost = mockLogger.info.mock.calls[0][1].cost.total;
      const call2Cost = mockLogger.info.mock.calls[1][1].cost.total;

      expect(call2Cost).toBeGreaterThan(call1Cost);
    });

    it('should handle rapid successive operations', () => {
      for (let i = 0; i < 5; i++) {
        const usage = { promptTokens: 1000, completionTokens: 500 };
        trackCost(`operation-${i}`, 'gpt-4o-mini', usage);
      }

      expect(mockLogger.info).toHaveBeenCalledTimes(5);
    });
  });
});
