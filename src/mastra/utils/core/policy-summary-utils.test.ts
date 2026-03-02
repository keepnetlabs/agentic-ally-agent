import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildHeuristicPolicySummary,
  POLICY_SUMMARY_TIMEOUT_MS,
  MAX_POLICY_INPUT_CHARS,
} from './policy-summary-utils';

vi.mock('./text-utils', () => ({
  truncateText: vi.fn((text: string, max: number) => text.substring(0, max)),
}));

import { truncateText } from './text-utils';

describe('policy-summary-utils', () => {
  beforeEach(() => {
    vi.mocked(truncateText).mockImplementation((text, max) => text.substring(0, max));
  });

  describe('constants', () => {
    it('POLICY_SUMMARY_TIMEOUT_MS is 60000', () => {
      expect(POLICY_SUMMARY_TIMEOUT_MS).toBe(60000);
    });

    it('MAX_POLICY_INPUT_CHARS is 24000', () => {
      expect(MAX_POLICY_INPUT_CHARS).toBe(24000);
    });
  });

  describe('buildHeuristicPolicySummary', () => {
    it('returns empty string for empty input', () => {
      expect(buildHeuristicPolicySummary('')).toBe('');
      expect(buildHeuristicPolicySummary('   ')).toBe('');
    });

    it('returns header and single section for simple policy', () => {
      const policy = 'Section 1 content here';
      const result = buildHeuristicPolicySummary(policy);
      expect(result).toContain('COMPANY POLICY SUMMARY (fallback, heuristic)');
      expect(result).toContain('SECTION 1 EXCERPT:');
      expect(result).toContain('Section 1 content here');
    });

    it('splits on --- separator', () => {
      const policy = 'Part A\n\n---\n\nPart B\n\n---\n\nPart C';
      const result = buildHeuristicPolicySummary(policy);
      expect(result).toContain('SECTION 1 EXCERPT:');
      expect(result).toContain('SECTION 2 EXCERPT:');
      expect(result).toContain('SECTION 3 EXCERPT:');
    });

    it('respects maxExcerptSections option', () => {
      const policy = 'A\n---\nB\n---\nC\n---\nD\n---\nE\n---\nF';
      const result = buildHeuristicPolicySummary(policy, { maxExcerptSections: 2 });
      expect(result).toContain('SECTION 1 EXCERPT:');
      expect(result).toContain('SECTION 2 EXCERPT:');
      expect(result).not.toContain('SECTION 3 EXCERPT:');
    });

    it('respects excerptMaxChars option', () => {
      const longText = 'A'.repeat(500);
      buildHeuristicPolicySummary(longText, { excerptMaxChars: 100 });
      expect(truncateText).toHaveBeenCalledWith(
        expect.any(String),
        100,
        'policy section excerpt'
      );
    });

    it('uses default 5 sections and 1200 chars when options not provided', () => {
      const policy = 'A\n---\nB\n---\nC\n---\nD\n---\nE';
      buildHeuristicPolicySummary(policy);
      expect(truncateText).toHaveBeenCalledWith(
        expect.any(String),
        1200,
        'policy section excerpt'
      );
    });

    it('includes fallback note', () => {
      const result = buildHeuristicPolicySummary('Policy text');
      expect(result).toContain('Automated summarization was unavailable');
      expect(result).toContain('excerpt-based fallback');
    });
  });
});
