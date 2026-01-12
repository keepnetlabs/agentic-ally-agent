import { describe, it, expect } from 'vitest';
import { buildHeuristicPolicySummary } from './policy-summary-utils';

describe('policy-summary-utils', () => {
    describe('buildHeuristicPolicySummary', () => {
        it('should return empty string for empty input', () => {
            expect(buildHeuristicPolicySummary('')).toBe('');
            expect(buildHeuristicPolicySummary('   ')).toBe('');
        });

        it('should create summary from chunks', () => {
            const policy = `
Introduction
---
Section 1 content
---
Section 2 content
`;
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('COMPANY POLICY SUMMARY (fallback, heuristic)');
            expect(summary).toContain('SECTION 1 EXCERPT');
            expect(summary).toContain('Introduction');
            expect(summary).toContain('Section 1 content');
        });

        it('should respect maxExcerptSections option', () => {
            const policy = `1\n---\n2\n---\n3\n---\n4`;
            const summary = buildHeuristicPolicySummary(policy, { maxExcerptSections: 2 });

            // Content split by \n---\n
            // chunks: 1, 2, 3, 4
            // max 2 -> 1, 2

            expect(summary).toContain('1');
            expect(summary).toContain('2');
            expect(summary).not.toContain('SECTION 3');
        });

        it('should truncate long sections', () => {
            const longSection = 'a'.repeat(100);
            const policy = `${longSection}`;

            const summary = buildHeuristicPolicySummary(policy, { excerptMaxChars: 10 });

            expect(summary).toContain(longSection.slice(0, 5)); // Check partial
            expect(summary).toContain('[TRUNCATED');
        });
    });
});
