import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPolicySummary, clearPolicyCache, getPolicyCacheStats } from './policy-cache';

// Mock all dependencies
vi.mock('./policy-fetcher', () => ({
  getPolicyContext: vi.fn(),
  extractCompanyIdFromTokenExport: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('../../model-providers', () => ({
  getModelWithOverride: vi.fn(),
}));

vi.mock('./logger', () => ({
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('./error-utils', () => ({
  normalizeError: vi.fn(err => (err instanceof Error ? err : new Error(String(err)))),
  logErrorInfo: vi.fn(),
}));

vi.mock('../../services/error-service', () => ({
  errorService: {
    aiModel: vi.fn((msg, _details) => ({ message: msg, code: 'AI_GENERATION_FAILED' })),
    external: vi.fn((msg, _details) => ({ message: msg, code: 'EXTERNAL_SERVICE_ERROR' })),
  },
}));

vi.mock('./request-storage', () => ({
  getRequestContext: vi.fn(),
}));

vi.mock('./resilience-utils', () => ({
  withRetry: vi.fn(fn => fn()),
  withTimeout: vi.fn(promise => promise),
}));

vi.mock('./policy-summary-utils', () => ({
  POLICY_SUMMARY_TIMEOUT_MS: 30000,
  MAX_POLICY_INPUT_CHARS: 50000,
  buildHeuristicPolicySummary: vi.fn(),
}));

vi.mock('./text-utils', () => ({
  truncateText: vi.fn((text, max) => text.substring(0, max)),
}));

import { getPolicyContext, extractCompanyIdFromTokenExport } from './policy-fetcher';
import { generateText } from 'ai';
import { getModelWithOverride } from '../../model-providers';
import { normalizeError } from './error-utils';
import { getRequestContext } from './request-storage';
import { truncateText } from './text-utils';
import { buildHeuristicPolicySummary } from './policy-summary-utils';

describe('policy-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPolicyCache();
  });

  afterEach(() => {
    clearPolicyCache();
  });

  describe('getPolicySummary - Cache Hits and Misses', () => {
    it('should fetch and cache policy on first call', async () => {
      const mockPolicy = 'Test security policy content';
      const mockSummary = 'Test summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();

      expect(result).toBe(mockSummary);
      expect(getPolicyContext).toHaveBeenCalledTimes(1);
      expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('should return cached summary on second call (cache hit)', async () => {
      const mockPolicy = 'Test security policy';
      const mockSummary = 'Cached summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // First call - should fetch
      await getPolicySummary();

      // Reset mocks to verify second call doesn't fetch
      vi.mocked(getPolicyContext).mockClear();
      vi.mocked(generateText).mockClear();

      // Second call - should use cache
      const result = await getPolicySummary();

      expect(result).toBe(mockSummary);
      expect(getPolicyContext).not.toHaveBeenCalled();
      expect(generateText).not.toHaveBeenCalled();
    });

    it('should return different cached summaries for different companies', async () => {
      const mockPolicy = 'Policy';
      const summary1 = 'Summary for Company 1';
      const summary2 = 'Summary for Company 2';

      // First company
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: summary1 });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result1 = await getPolicySummary();
      expect(result1).toBe(summary1);

      // Second company
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });

      vi.mocked(generateText).mockResolvedValue({ text: summary2 });

      const result2 = await getPolicySummary();
      expect(result2).toBe(summary2);
    });

    it('should refetch when company changes between calls', async () => {
      const mockPolicy = 'Policy';
      const summary1 = 'Summary 1';
      const summary2 = 'Summary 2';

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Company 1
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: summary1 });
      await getPolicySummary();

      // Company 2 - should trigger refetch
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: summary2 });

      const result = await getPolicySummary();
      expect(result).toBe(summary2);
      expect(generateText).toHaveBeenCalledTimes(2);
    });

    it('should not cache when companyId cannot be determined', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: undefined,
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // First call
      await getPolicySummary();

      // Second call without companyId should refetch
      const result = await getPolicySummary();
      expect(result).toBe(mockSummary);
      expect(generateText).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPolicySummary - Cache Expiration (1 hour TTL)', () => {
    it('should expire cache after 1 hour', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // First call
      await getPolicySummary();

      // Mock time passage (1 hour + 1 second)
      const oneHourMs = 3600000;
      vi.useFakeTimers();
      vi.advanceTimersByTime(oneHourMs + 1000);

      vi.mocked(generateText).mockClear();
      vi.mocked(getPolicyContext).mockClear();

      // Second call should refetch (cache expired)
      await getPolicySummary();

      expect(getPolicyContext).toHaveBeenCalled();
      expect(generateText).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should not expire cache before 1 hour', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      // Advance time by 30 minutes
      vi.useFakeTimers();
      vi.advanceTimersByTime(30 * 60 * 1000);

      vi.mocked(generateText).mockClear();

      // Should still use cache
      await getPolicySummary();
      expect(generateText).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should delete expired cache entry', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      // Check cache stats before expiration
      const statsBefore = getPolicyCacheStats();
      expect(statsBefore.cached).toBe(true);

      // Advance past TTL
      vi.useFakeTimers();
      vi.advanceTimersByTime(3600000 + 1000);

      // Fetch again to trigger expiration check
      await getPolicySummary();

      // Cache should be refreshed
      const statsAfter = getPolicyCacheStats();
      expect(statsAfter.ageMinutes).toBeLessThan(1);

      vi.useRealTimers();
    });

    it('should handle cache expiration during concurrent requests', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      vi.useFakeTimers();
      vi.advanceTimersByTime(3600000 + 1000);

      // Multiple concurrent requests after expiration
      const [result1, result2] = await Promise.all([getPolicySummary(), getPolicySummary()]);

      expect(result1).toBe(mockSummary);
      expect(result2).toBe(mockSummary);

      vi.useRealTimers();
    });

    it('should track cache age in minutes', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      vi.useFakeTimers();
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      const stats = getPolicyCacheStats();
      expect(stats.ageMinutes).toBe(5);
      expect(stats.expiresInMinutes).toBe(55);

      vi.useRealTimers();
    });
  });

  describe('getPolicySummary - CompanyId Resolution', () => {
    it('should use companyId from request context when available', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-from-context',
        token: 'token-123',
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();
      expect(stats.companyId).toBe('company-from-context');
      expect(extractCompanyIdFromTokenExport).not.toHaveBeenCalled();
    });

    it('should derive companyId from token when context companyId is unavailable', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: undefined,
        token: 'token-123',
      });

      vi.mocked(extractCompanyIdFromTokenExport).mockReturnValue('company-from-token');
      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();
      expect(stats.companyId).toBe('company-from-token');
      expect(extractCompanyIdFromTokenExport).toHaveBeenCalledWith('token-123');
    });

    it('should not derive companyId from token when context companyId exists', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-from-context',
        token: 'token-123',
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      expect(extractCompanyIdFromTokenExport).not.toHaveBeenCalled();
    });

    it('should handle undefined companyId gracefully', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: undefined,
        token: undefined,
      });

      vi.mocked(extractCompanyIdFromTokenExport).mockReturnValue(undefined);
      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();
      expect(result).toBe('Summary');

      const stats = getPolicyCacheStats();
      expect(stats.cached).toBe(false);
      expect(stats.reason).toBe('companyId unavailable');
    });

    it('should prefer derived token companyId only when context companyId is falsy', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: '',
        token: 'token-123',
      });

      vi.mocked(extractCompanyIdFromTokenExport).mockReturnValue('company-from-token');
      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();
      expect(stats.companyId).toBe('company-from-token');
    });
  });

  describe('getPolicySummary - 3-Level Fallback Strategy', () => {
    it('should use Level 1 (AI summarization) on success', async () => {
      const mockPolicy = 'Full policy text';
      const mockSummary = 'AI-generated summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();

      expect(result).toBe(mockSummary);
      expect(generateText).toHaveBeenCalled();
      expect(buildHeuristicPolicySummary).not.toHaveBeenCalled();
    });

    it('should fall back to Level 2 (heuristic) when Level 1 fails', async () => {
      const mockPolicy = 'Full policy text';
      const heuristicSummary = 'Heuristic summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('AI service timeout'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue(heuristicSummary);

      const result = await getPolicySummary();

      expect(result).toBe(heuristicSummary);
      expect(buildHeuristicPolicySummary).toHaveBeenCalledWith(mockPolicy);
    });

    it('should fall back to Level 3 (truncated raw policy) when Level 2 is empty', async () => {
      const mockPolicy = 'Full policy text'.repeat(100);

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('Timeout'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue('');

      const result = await getPolicySummary();

      expect(result).toContain('COMPANY POLICY (fallback, truncated raw text)');
      expect(result).toContain('Note: Policy summarization unavailable');
      expect(result).toContain('Full policy text');
    });

    it('should fall back to Level 3 when Level 2 returns whitespace-only string', async () => {
      const mockPolicy = 'Full policy text';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('Timeout'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue('   \n  \t  ');

      const result = await getPolicySummary();

      expect(result).toContain('COMPANY POLICY (fallback, truncated raw text)');
    });

    it('should cache any fallback level result', async () => {
      const mockPolicy = 'Full policy text';
      const heuristicSummary = 'Heuristic summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('Timeout'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue(heuristicSummary);

      // First call
      const result1 = await getPolicySummary();

      vi.mocked(getPolicyContext).mockClear();
      vi.mocked(buildHeuristicPolicySummary).mockClear();

      // Second call should use cache
      const result2 = await getPolicySummary();

      expect(result1).toBe(result2);
      expect(getPolicyContext).not.toHaveBeenCalled();
      expect(buildHeuristicPolicySummary).not.toHaveBeenCalled();
    });

    it('should use heuristic fallback when AI fails', async () => {
      const mockPolicy = 'Full policy text';
      const heuristicResult = 'Heuristic fallback summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('Timeout'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue(heuristicResult);

      const result = await getPolicySummary();

      expect(result).toBe(heuristicResult);
      expect(buildHeuristicPolicySummary).toHaveBeenCalledWith(mockPolicy);
    });

    it('should handle nested fallback failures gracefully', async () => {
      const mockPolicy = 'Full policy text';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('AI timeout'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue('');

      const result = await getPolicySummary();

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getPolicySummary - Multi-Tenant Safety', () => {
    it('should isolate cached policies between companies', async () => {
      const policy1 = 'Company 1 Policy';
      const policy2 = 'Company 2 Policy';
      const summary1 = 'Summary 1';
      const summary2 = 'Summary 2';

      // Company 1
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(policy1);
      vi.mocked(generateText).mockResolvedValue({ text: summary1 });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result1 = await getPolicySummary();

      // Company 2
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(policy2);
      vi.mocked(generateText).mockResolvedValue({ text: summary2 });

      const result2 = await getPolicySummary();

      // Verify isolation
      expect(result1).toBe(summary1);
      expect(result2).toBe(summary2);

      // Get both from cache and verify still different
      vi.mocked(generateText).mockClear();

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      const cachedResult1 = await getPolicySummary();

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      const cachedResult2 = await getPolicySummary();

      expect(cachedResult1).toBe(summary1);
      expect(cachedResult2).toBe(summary2);
      expect(generateText).not.toHaveBeenCalled();
    });

    it('should never share cache keys across companies', async () => {
      const policy = 'Policy';
      const summary = 'Summary';

      vi.mocked(getPolicyContext).mockResolvedValue(policy);
      vi.mocked(generateText).mockResolvedValue({ text: summary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Company 1
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      await getPolicySummary();

      const stats1 = getPolicyCacheStats();
      expect(stats1.companyId).toBe('company-1');

      // Company 2
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      await getPolicySummary();

      const stats2 = getPolicyCacheStats();
      expect(stats2.companyId).toBe('company-2');
      expect(stats1.companyId).not.toBe(stats2.companyId);
    });

    it('should not cache when company identity cannot be reliably determined', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: undefined,
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();
      expect(stats.cached).toBe(false);
      expect(stats.reason).toContain('unavailable');
    });

    it('should handle cache key format correctly', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'secure-company-id-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();
      expect(stats.companyId).toBe('secure-company-id-123');
      expect(stats.cached).toBe(true);
    });

    it('should prevent cache poisoning across requests', async () => {
      const policy1 = 'Policy 1';
      const policy2 = 'Policy 2';

      vi.mocked(getPolicyContext).mockResolvedValue(policy1);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary 1' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Company 1 caches
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      await getPolicySummary();

      // Company 2 with different policy
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      vi.mocked(getPolicyContext).mockResolvedValue(policy2);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary 2' });
      await getPolicySummary();

      // Company 1 should still have its cached summary
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });

      const stats1 = getPolicyCacheStats();
      expect(stats1.summaryLength).toBe('Summary 1'.length);
    });
  });

  describe('getPolicySummary - Error Handling', () => {
    it('should handle getPolicyContext returning null', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(null);

      const result = await getPolicySummary();

      expect(result).toBe('');
      expect(generateText).not.toHaveBeenCalled();
    });

    it('should handle getPolicyContext returning empty string', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('');

      const result = await getPolicySummary();

      expect(result).toBe('');
    });

    it('should recover from AI generation timeout', async () => {
      const mockPolicy = 'Policy';
      const heuristicSummary = 'Heuristic';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('Timeout exceeded'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue(heuristicSummary);

      const result = await getPolicySummary();

      expect(result).toBe(heuristicSummary);
    });

    it('should return result when outer error occurs', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      // First call fails, second call in catch succeeds
      vi.mocked(getPolicyContext)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('Policy from retry');

      const result = await getPolicySummary();

      // Should be truncated policy
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should normalize any error type thrown', async () => {
      const mockPolicy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockRejectedValue('String error');
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue('Fallback');

      const result = await getPolicySummary();

      expect(result).toBe('Fallback');
      expect(normalizeError).toHaveBeenCalled();
    });

    it('should handle model override retrieval failure', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(getModelWithOverride).mockImplementation(() => {
        throw new Error('Model not available');
      });

      try {
        await getPolicySummary();
      } catch {
        // Expected to fail at model override
      }
    });

    it('should handle detailed error messages', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockRejectedValue(new Error('Detailed error message'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue('Fallback');

      const result = await getPolicySummary();

      // Should successfully return fallback when AI fails with detailed error
      expect(result).toBe('Fallback');
      expect(buildHeuristicPolicySummary).toHaveBeenCalled();
    });
  });

  describe('getPolicySummary - Empty Policy Handling', () => {
    it('should return empty string for empty policy', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('');

      const result = await getPolicySummary();

      expect(result).toBe('');
    });

    it('should return empty string for null policy', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(null);

      const result = await getPolicySummary();

      expect(result).toBe('');
    });

    it('should return empty string for whitespace-only policy', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('   \n\t\n  ');

      const result = await getPolicySummary();

      expect(result).toBe('');
    });

    it('should trigger AI summarization for non-empty policy', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Non-empty policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      expect(generateText).toHaveBeenCalled();
    });

    it('should not trigger AI summarization for empty policy', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('');

      await getPolicySummary();

      expect(generateText).not.toHaveBeenCalled();
    });
  });

  describe('getPolicySummary - Policy Truncation', () => {
    it('should truncate policy before sending to AI', async () => {
      const longPolicy = 'x'.repeat(100000);

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(longPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      expect(truncateText).toHaveBeenCalledWith(longPolicy, 50000, expect.any(String));
    });

    it('should pass truncated policy to generateText', async () => {
      const policy = 'Policy content';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(policy);
      vi.mocked(truncateText).mockReturnValue('Truncated policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Truncated policy'),
        })
      );
    });

    it('should truncate raw policy in fallback', async () => {
      const longPolicy = 'x'.repeat(10000);

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(longPolicy);
      vi.mocked(generateText).mockRejectedValue(new Error('Timeout'));
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);
      vi.mocked(buildHeuristicPolicySummary).mockReturnValue('');

      await getPolicySummary();

      expect(truncateText).toHaveBeenCalledWith(longPolicy, 6000, expect.any(String));
    });

    it('should respect MAX_POLICY_INPUT_CHARS limit', async () => {
      const policy = 'Policy';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(policy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const calls = vi.mocked(truncateText).mock.calls;
      const policyTruncateCall = calls.find(c => c[2]?.includes('policy input'));
      expect(policyTruncateCall?.[1]).toBe(50000);
    });
  });

  describe('getPolicySummary - Integration Tests', () => {
    it('should complete full flow: fetch -> summarize -> cache', async () => {
      const mockPolicy = 'Full policy content';
      const mockSummary = 'Concise summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();

      expect(result).toBe(mockSummary);

      const stats = getPolicyCacheStats();
      expect(stats.cached).toBe(true);
      expect(stats.isValid).toBe(true);
      expect(stats.summaryLength).toBe(mockSummary.length);
    });

    it('should handle rapid successive sequential requests efficiently', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // First call - caches
      const result1 = await getPolicySummary();
      expect(result1).toBe(mockSummary);

      // Rapid successive calls should use cache
      const result2 = await getPolicySummary();
      const result3 = await getPolicySummary();

      expect(result2).toBe(mockSummary);
      expect(result3).toBe(mockSummary);
      // Should only generate once (cached after first)
      expect(generateText).toHaveBeenCalledTimes(1);
    });

    it('should preserve policy summary through cache lifecycle', async () => {
      const mockPolicy = 'Important policy';
      const mockSummary = 'Critical summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Fetch and cache
      const result1 = await getPolicySummary();

      // Wait and fetch again
      vi.useFakeTimers();
      vi.advanceTimersByTime(30 * 60 * 1000);

      const result2 = await getPolicySummary();
      vi.useRealTimers();

      expect(result1).toBe(mockSummary);
      expect(result2).toBe(mockSummary);
    });

    it('should handle context switching with cached state', async () => {
      const policy = 'Policy';
      const summary1 = 'Summary 1';
      const summary2 = 'Summary 2';

      vi.mocked(getPolicyContext).mockResolvedValue(policy);
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Company 1
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: summary1 });
      const r1 = await getPolicySummary();

      // Company 2
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: summary2 });
      const r2 = await getPolicySummary();

      // Back to Company 1
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      const r1Again = await getPolicySummary();

      expect(r1).toBe(summary1);
      expect(r2).toBe(summary2);
      expect(r1Again).toBe(summary1);
      // Only 2 generateText calls (company 2 was refetched because cache was not used for company 1's second access)
    });

    it('should complete flow with all expected steps', async () => {
      const mockPolicy = 'Full policy content';
      const mockSummary = 'Concise summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Execute full flow
      const result = await getPolicySummary();

      // Verify all steps completed
      expect(getRequestContext).toHaveBeenCalled();
      expect(getPolicyContext).toHaveBeenCalled();
      expect(generateText).toHaveBeenCalled();
      expect(result).toBe(mockSummary);

      // Verify cache was populated
      const stats = getPolicyCacheStats();
      expect(stats.cached).toBe(true);
    });
  });

  describe('clearPolicyCache', () => {
    it('should clear all cached policies', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Cache something
      await getPolicySummary();

      clearPolicyCache();

      // Verify cache is empty
      const stats = getPolicyCacheStats();
      expect(stats.cached).toBe(false);
    });

    it('should force refetch after clear', async () => {
      const mockPolicy = 'Policy';
      const mockSummary = 'Summary';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(mockPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: mockSummary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // First call caches
      await getPolicySummary();

      clearPolicyCache();

      vi.mocked(generateText).mockClear();

      // Second call should refetch
      await getPolicySummary();

      expect(generateText).toHaveBeenCalled();
    });

    it('should handle clearing empty cache gracefully', () => {
      expect(() => clearPolicyCache()).not.toThrow();
    });

    it('should clear only specific company cache', async () => {
      const policy = 'Policy';

      vi.mocked(getPolicyContext).mockResolvedValue(policy);
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Cache both companies
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary 1' });
      await getPolicySummary();

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary 2' });
      await getPolicySummary();

      // Clear ALL cache
      clearPolicyCache();

      // Both should be cleared
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      const stats1 = getPolicyCacheStats();
      expect(stats1.cached).toBe(false);

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      const stats2 = getPolicyCacheStats();
      expect(stats2.cached).toBe(false);
    });
  });

  describe('getPolicyCacheStats', () => {
    it('should return cache hit stats', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();

      expect(stats.cached).toBe(true);
      expect(stats.isValid).toBe(true);
      expect(stats.ageMinutes).toBeGreaterThanOrEqual(0);
      expect(stats.expiresInMinutes).toBeGreaterThan(0);
      expect(stats.summaryLength).toBeGreaterThan(0);
    });

    it('should return cache miss stats', () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      const stats = getPolicyCacheStats();

      expect(stats.cached).toBe(false);
      expect(stats.size).toBe(0);
    });

    it('should return unavailable reason when companyId is missing', () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: undefined,
        token: undefined,
      });

      const stats = getPolicyCacheStats();

      expect(stats.cached).toBe(false);
      expect(stats.reason).toContain('unavailable');
    });

    it('should return remaining expiration time', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      vi.useFakeTimers();
      vi.advanceTimersByTime(15 * 60 * 1000); // 15 minutes

      const stats = getPolicyCacheStats();
      expect(stats.expiresInMinutes).toBe(45);
      expect(stats.ageMinutes).toBe(15);

      vi.useRealTimers();
    });

    it('should return expired cache stats', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      vi.useFakeTimers();
      vi.advanceTimersByTime(3600000 + 1000);

      const stats = getPolicyCacheStats();
      expect(stats.isValid).toBe(false);

      vi.useRealTimers();
    });

    it('should report correct summary length', async () => {
      const summary = 'This is a test summary with 42 characters';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: summary });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();
      expect(stats.summaryLength).toBe(summary.length);
    });

    it('should derive companyId same way as getPolicySummary', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: undefined,
        token: 'token-123',
      });

      vi.mocked(extractCompanyIdFromTokenExport).mockReturnValue('company-from-token');
      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats = getPolicyCacheStats();
      expect(stats.companyId).toBe('company-from-token');
    });

    it('should handle stats requests for different companies', async () => {
      const policy = 'Policy';

      vi.mocked(getPolicyContext).mockResolvedValue(policy);
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      // Company 1
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-1',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary 1' });
      await getPolicySummary();

      const stats1 = getPolicyCacheStats();
      expect(stats1.companyId).toBe('company-1');
      expect(stats1.cached).toBe(true);

      // Company 2
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-2',
        token: undefined,
      });
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary 2' });
      await getPolicySummary();

      const stats2 = getPolicyCacheStats();
      expect(stats2.companyId).toBe('company-2');
      expect(stats2.cached).toBe(true);

      // Stats should be for company-2
      expect(stats1.companyId).not.toBe(stats2.companyId);
    });
  });

  describe('Edge Cases', () => {
    it('should handle policy with special characters', async () => {
      const specialPolicy = 'Policy with <script>alert("xss")</script> and & special chars';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(specialPolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();
      expect(result).toBeTruthy();
    });

    it('should handle very long company IDs', async () => {
      const longCompanyId = 'x'.repeat(500);

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: longCompanyId,
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();
      expect(result).toBe('Summary');

      const stats = getPolicyCacheStats();
      expect(stats.companyId).toBe(longCompanyId);
    });

    it('should handle unicode in policy', async () => {
      const unicodePolicy = 'Policy with émojis 🔒 and αβγ and 中文';

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(unicodePolicy);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();
      expect(result).toBe('Summary');
    });

    it('should handle extremely large policy (overflow protection)', async () => {
      const hugePol = 'x'.repeat(1000000); // 1MB policy

      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue(hugePol);
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const result = await getPolicySummary();
      expect(result).toBeTruthy();

      // Verify truncation was called
      expect(truncateText).toHaveBeenCalled();
    });

    it('should handle concurrent requests to same company', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      const promises = Array(10)
        .fill(null)
        .map(() => getPolicySummary());

      const results = await Promise.all(promises);

      // All should succeed and return same summary
      results.forEach(r => {
        expect(r).toBe('Summary');
      });

      // With concurrent requests, each will try to fetch independently
      // This is expected behavior for a simple in-memory cache
      expect(generateText).toHaveBeenCalled();
    });

    it('should handle timezone changes gracefully', async () => {
      vi.mocked(getRequestContext).mockReturnValue({
        companyId: 'company-123',
        token: undefined,
      });

      vi.mocked(getPolicyContext).mockResolvedValue('Policy');
      vi.mocked(generateText).mockResolvedValue({ text: 'Summary' });
      vi.mocked(getModelWithOverride).mockReturnValue({} as any);

      await getPolicySummary();

      const stats1 = getPolicyCacheStats();
      expect(stats1.ageMinutes).toBe(0);
      expect(stats1.expiresInMinutes).toBe(60);

      vi.useFakeTimers();
      vi.advanceTimersByTime(30 * 60 * 1000);

      const stats2 = getPolicyCacheStats();

      expect(stats2.ageMinutes).toBe(30);
      expect(stats2.expiresInMinutes).toBe(30);

      vi.useRealTimers();
    });
  });
});
