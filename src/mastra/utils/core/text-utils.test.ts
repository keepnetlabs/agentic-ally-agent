import { describe, it, expect } from 'vitest';
import { truncateText } from './text-utils';

describe('text-utils', () => {
    describe('truncateText', () => {
        it('should return original text if within limit', () => {
            expect(truncateText('Short text', 20)).toBe('Short text');
        });

        it('should truncate and append notice if exceeds limit', () => {
            const longText = 'This is a very long text that needs truncation';
            const result = truncateText(longText, 10);

            expect(result).not.toBe(longText);
            expect(result.length).toBeGreaterThan(10); // Because of the suffix
            expect(result).toContain('[TRUNCATED: text exceeded 10 characters]');
            expect(result.startsWith('This is a')).toBe(true);
        });

        it('should use custom label in suffix', () => {
            const result = truncateText('Content', 3, 'desc');
            expect(result).toContain('[TRUNCATED: desc exceeded 3 characters]');
        });
    });
});
