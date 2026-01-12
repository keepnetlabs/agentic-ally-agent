
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
    // Mock fetch
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    beforeEach(() => {
        fetchMock.mockReset();
        // Default to failure to trigger fallback to Apistemic (preserving existing test behavior)
        fetchMock.mockResolvedValue({ ok: false });
    });

    describe('getRandomLetterLogoUrl', () => {
        it('returns a valid apistemic url', () => {
            const url = getRandomLetterLogoUrl();
            expect(url).toMatch(/https:\/\/logos-api\.apistemic\.com\/domain:[a-z]\.com/);
        });
    });

    describe('getLogoUrl', () => {
        it('returns correct API url for valid domain (fallback to apistemic)', async () => {
            const url = await getLogoUrl('google.com');
            expect(url).toBe('https://logos-api.apistemic.com/domain:google.com');
            expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('logo.dev'), { method: 'HEAD' });
        });

        it('returns logo.dev url when available', async () => {
            fetchMock.mockResolvedValue({ ok: true });
            const url = await getLogoUrl('google.com');
            expect(url).toContain('img.logo.dev/google.com');
            expect(url).toContain('token=');
        });

        it('cleans domain input', async () => {
            const url = await getLogoUrl('https://www.google.com/search');
            expect(url).toBe('https://logos-api.apistemic.com/domain:google.com');
        });

        it('returns random letter for invalid domain', async () => {
            const url = await getLogoUrl('invalid');
            expect(url).toContain('logos-api.apistemic.com/domain:');
            expect(url).toMatch(/\.com$/);
        });

        it('returns random letter for null/empty domain', async () => {
            const url = await getLogoUrl('');
            expect(url).toContain('logos-api.apistemic.com/domain:');
        });
    });

    describe('getLogoUrlFallbacks', () => {
        it('returns multiple options', () => {
            const urls = getLogoUrlFallbacks('openai.com');
            expect(urls).toHaveLength(5);
            expect(urls[0]).toContain('logo.dev');
            expect(urls[1]).toBe('https://logos-api.apistemic.com/domain:openai.com');
            expect(urls[2]).toContain('icon.horse');
            expect(urls[3]).toContain('google.com/s2/favicons');
        });
    });
});
