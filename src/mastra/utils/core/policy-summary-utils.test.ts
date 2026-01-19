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

        it('should handle single section without delimiter', () => {
            const policy = 'Single section content';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('SECTION 1 EXCERPT');
            expect(summary).toContain('Single section content');
            expect(summary).not.toContain('SECTION 2');
        });

        it('should handle undefined options', () => {
            const policy = 'Content';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toBeDefined();
            expect(summary).toContain('Content');
        });

        it('should use default maxExcerptSections of 5', () => {
            const policy = '1\n---\n2\n---\n3\n---\n4\n---\n5\n---\n6\n---\n7';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('1');
            expect(summary).toContain('5');
            expect(summary).not.toContain('SECTION 6');
            expect(summary).not.toContain('SECTION 7');
        });

        it('should use default excerptMaxChars of 1200', () => {
            const longContent = 'A'.repeat(1500);
            const policy = longContent;
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('[TRUNCATED');
        });

        it('should handle maxExcerptSections=0', () => {
            const policy = '1\n---\n2\n---\n3';
            const summary = buildHeuristicPolicySummary(policy, { maxExcerptSections: 0 });

            expect(summary).toContain('COMPANY POLICY SUMMARY');
            expect(summary).not.toContain('SECTION 1');
        });

        it('should handle excerptMaxChars=0', () => {
            const policy = 'Some content';
            const summary = buildHeuristicPolicySummary(policy, { excerptMaxChars: 0 });

            // truncateText with 0 should return empty or very short
            expect(summary).toBeDefined();
        });

        it('should filter out empty sections', () => {
            const policy = '1\n---\n\n---\n2\n---\n   \n---\n3';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('1');
            expect(summary).toContain('2');
            expect(summary).toContain('3');
            // Empty sections should be filtered
        });

        it('should handle sections with leading/trailing whitespace', () => {
            const policy = '  Section 1  \n---\n  Section 2  ';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Section 1');
            expect(summary).toContain('Section 2');
        });

        it('should handle delimiter with extra whitespace', () => {
            const policy = 'Part 1\n  ---  \nPart 2';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Part 1');
            expect(summary).toContain('Part 2');
        });

        it('should number sections starting from 1', () => {
            const policy = 'A\n---\nB\n---\nC';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('SECTION 1 EXCERPT');
            expect(summary).toContain('SECTION 2 EXCERPT');
            expect(summary).toContain('SECTION 3 EXCERPT');
        });

        it('should include fallback note', () => {
            const policy = 'Content';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('fallback, heuristic');
            expect(summary).toContain('Automated summarization was unavailable');
        });

        it('should handle unicode characters', () => {
            const policy = '你好世界\n---\nПривет мир\n---\n🌍🌎🌏';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('你好世界');
            expect(summary).toContain('Привет мир');
            expect(summary).toContain('🌍🌎🌏');
        });

        it('should handle newlines within sections', () => {
            const policy = 'Line 1\nLine 2\nLine 3\n---\nSection 2';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Line 1');
            expect(summary).toContain('Line 2');
            expect(summary).toContain('Line 3');
        });

        it('should handle special characters in sections', () => {
            const policy = 'Section with $pecial @#% chars\n---\nMore <html> & "quotes"';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('$pecial @#% chars');
            expect(summary).toContain('<html> & "quotes"');
        });

        it('should handle very long text with multiple sections', () => {
            const sections = Array.from({ length: 10 }, (_, i) => `Section ${i + 1} content`.repeat(100));
            const policy = sections.join('\n---\n');
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('SECTION 1 EXCERPT');
            expect(summary).toContain('SECTION 5 EXCERPT');
            expect(summary).not.toContain('SECTION 6');
        });

        it('should handle maxExcerptSections=1', () => {
            const policy = 'First\n---\nSecond\n---\nThird';
            const summary = buildHeuristicPolicySummary(policy, { maxExcerptSections: 1 });

            expect(summary).toContain('First');
            expect(summary).not.toContain('SECTION 2');
        });

        it('should handle maxExcerptSections larger than section count', () => {
            const policy = 'Only one section';
            const summary = buildHeuristicPolicySummary(policy, { maxExcerptSections: 100 });

            expect(summary).toContain('SECTION 1 EXCERPT');
            expect(summary).not.toContain('SECTION 2');
        });

        it('should handle excerptMaxChars=1', () => {
            const policy = 'Long content that should be truncated';
            const summary = buildHeuristicPolicySummary(policy, { excerptMaxChars: 1 });

            expect(summary).toContain('[TRUNCATED');
        });

        it('should handle policy with only delimiters', () => {
            const policy = '\n---\n\n---\n\n---\n';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('COMPANY POLICY SUMMARY');
            // No sections should be present since all are empty
        });

        it('should handle very short sections', () => {
            const policy = 'a\n---\nb\n---\nc';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('a');
            expect(summary).toContain('b');
            expect(summary).toContain('c');
        });

        it('should preserve formatting within sections', () => {
            const policy = 'Section with:\n- Bullet 1\n- Bullet 2\n\nAnd paragraph';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Bullet 1');
            expect(summary).toContain('Bullet 2');
            expect(summary).toContain('paragraph');
        });

        it('should handle tabs and mixed whitespace', () => {
            const policy = 'Content\twith\ttabs\n---\n  Spaces  and\ttabs';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('with\ttabs');
            expect(summary).toContain('Spaces');
        });

        it('should handle real-world policy structure', () => {
            const policy = `
COMPANY SECURITY POLICY

Introduction
This document outlines security requirements for all employees.

---

Section 1: Password Requirements
Passwords must be at least 12 characters.
Passwords must include uppercase, lowercase, numbers, and symbols.

---

Section 2: Device Management
All company devices must be encrypted.
Lost devices must be reported immediately.

---

Section 3: Data Handling
Sensitive data must not be shared externally.
Use approved file sharing services only.
`;
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('COMPANY POLICY SUMMARY');
            expect(summary).toContain('SECTION 1 EXCERPT');
            expect(summary).toContain('Password Requirements');
            expect(summary).toContain('Device Management');
            expect(summary).toContain('Data Handling');
        });

        it('should handle policy with markdown-like formatting', () => {
            const policy = '# Header\n**Bold** and *italic*\n---\n## Section\n- List item';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Header');
            expect(summary).toContain('**Bold**');
            expect(summary).toContain('*italic*');
        });

        it('should handle policy with URLs', () => {
            const policy = 'See https://example.com for details\n---\nContact support@example.com';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('https://example.com');
            expect(summary).toContain('support@example.com');
        });

        it('should handle policy with code snippets', () => {
            const policy = 'Use the command: `ssh user@host`\n---\nOr run: npm install';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('ssh user@host');
            expect(summary).toContain('npm install');
        });

        it('should handle empty options object', () => {
            const policy = 'Content';
            const summary = buildHeuristicPolicySummary(policy, {});

            expect(summary).toContain('Content');
            expect(summary).toContain('SECTION 1 EXCERPT');
        });

        it('should handle maxExcerptSections with partial options', () => {
            const policy = '1\n---\n2\n---\n3';
            const summary = buildHeuristicPolicySummary(policy, { maxExcerptSections: 2 });

            expect(summary).toContain('1');
            expect(summary).toContain('2');
            expect(summary).not.toContain('SECTION 3');
        });

        it('should handle excerptMaxChars with partial options', () => {
            const longContent = 'A'.repeat(100);
            const policy = longContent;
            const summary = buildHeuristicPolicySummary(policy, { excerptMaxChars: 50 });

            expect(summary).toContain('[TRUNCATED');
        });

        it('should handle policy ending with delimiter', () => {
            const policy = 'Section 1\n---\nSection 2\n---\n';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Section 1');
            expect(summary).toContain('Section 2');
        });

        it('should handle policy starting with delimiter', () => {
            const policy = '\n---\nSection 1\n---\nSection 2';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Section 1');
            expect(summary).toContain('Section 2');
        });

        it('should handle multiple consecutive delimiters', () => {
            const policy = 'Section 1\n---\n\n---\n\n---\nSection 2';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Section 1');
            expect(summary).toContain('Section 2');
        });

        it('should join output with newlines correctly', () => {
            const policy = 'Section 1';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary.split('\n').length).toBeGreaterThan(3);
            expect(summary).toContain('\n\n');
        });

        it('should handle very large maxExcerptSections', () => {
            const policy = '1\n---\n2';
            const summary = buildHeuristicPolicySummary(policy, { maxExcerptSections: 999999 });

            expect(summary).toContain('1');
            expect(summary).toContain('2');
        });

        it('should handle very large excerptMaxChars', () => {
            const policy = 'Content';
            const summary = buildHeuristicPolicySummary(policy, { excerptMaxChars: 999999 });

            expect(summary).toContain('Content');
            expect(summary).not.toContain('[TRUNCATED');
        });

        it('should trim input before processing', () => {
            const policy = '\n\n  Section content  \n\n';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('Section content');
        });

        it('should handle policy with only whitespace between delimiters', () => {
            const policy = '   \n---\n   \n---\n   ';
            const summary = buildHeuristicPolicySummary(policy);

            expect(summary).toContain('COMPANY POLICY SUMMARY');
            // All sections are empty/whitespace
        });
    });
});
