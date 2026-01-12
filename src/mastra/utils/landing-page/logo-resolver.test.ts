
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getLogoUrl, getLogoUrlFallbacks, getRandomLetterLogoUrl } from './logo-resolver';

// Mock logger
vi.mock('../core/logger', () => ({
    getLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    })
}));

describe('logo-resolver', () => {
    describe('getRandomLetterLogoUrl', () => {
        it('returns a valid apistemic url', () => {
            const url = getRandomLetterLogoUrl();
            expect(url).toMatch(/https:\/\/logos-api\.apistemic\.com\/domain:[a-z]\.com/);
        });
    });

    describe('getLogoUrl', () => {
        it('returns logo.dev url (direct) for valid domain', () => {
            const url = getLogoUrl('google.com');
            expect(url).toContain('img.logo.dev/google.com');
            expect(url).toContain('token=');
            expect(url).toContain('size=96'); // Default size
        });

        it('supports custom size', () => {
            const url = getLogoUrl('google.com', 128);
            expect(url).toContain('size=128');
        });

        it('cleans domain input', () => {
            const url = getLogoUrl('https://www.google.com/search');
            expect(url).toContain('img.logo.dev/google.com');
        });

        it('returns random letter for invalid domain', () => {
            const url = getLogoUrl('invalid');
            expect(url).toContain('logos-api.apistemic.com/domain:');
            expect(url).toMatch(/\.com$/);
        });

        it('returns random letter for null/empty domain', () => {
            const url = getLogoUrl('');
            expect(url).toContain('logos-api.apistemic.com/domain:');
        });
    });

    describe('getLogoUrlFallbacks', () => {
        it('returns multiple options', () => {
            const urls = getLogoUrlFallbacks('openai.com');
            expect(urls).toHaveLength(5);
            expect(urls[0]).toContain('img.logo.dev/openai.com');
            expect(urls[0]).toContain('size=96'); // Check optimized size
            expect(urls[1]).toBe('https://logos-api.apistemic.com/domain:openai.com');
            expect(urls[2]).toContain('icon.horse');
            expect(urls[3]).toContain('google.com/s2/favicons');
        });
    });
});
