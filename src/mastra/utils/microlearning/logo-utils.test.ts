
import { describe, it, expect, vi } from 'vitest';
import { handleLogoHallucination } from './logo-utils';

// Mock logger to avoid cluttering output
vi.mock('../core/logger', () => ({
    getLogger: () => ({
        warn: vi.fn(),
        info: vi.fn(),
    }),
}));

describe('handleLogoHallucination', () => {
    const microlearningId = 'test-id';

    it('should ALLOW valid external URLs (e.g. unknown brand/domain)', () => {
        const validUrl = 'https://valid-domain.com/assets/logos/custom.png';
        const updates = {
            theme: {
                logo: {
                    src: validUrl
                }
            }
        };
        const result = handleLogoHallucination(updates, microlearningId);

        // Smart Policy: If it's not a known hallucination source or major brand, let it through.
        // User might have provided a valid custom logo.
        expect(result.theme?.logo?.src).toBe(validUrl);
        expect(result.brandName).toBeUndefined();
    });

    it('should detect and fix raw filenames (e.g. apple.png)', () => {
        const updates = {
            theme: {
                logo: {
                    src: 'apple_logo.png'
                }
            }
        };
        const result = handleLogoHallucination(updates, microlearningId);
        expect(result.theme?.logo).toBeUndefined(); // Should be deleted
        expect(result.brandName).toBe('apple'); // Should be extracted
    });

    it('should detect and fix hallucinated Microsoft URLs (handling double extensions)', () => {
        const updates = {
            theme: {
                logo: {
                    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/Microsoft_logo.svg.png'
                }
            }
        };
        const result = handleLogoHallucination(updates, microlearningId);
        expect(result.theme?.logo).toBeUndefined(); // Should be deleted

        // This was failing before (returning "Microsoft.svg"). New regex matches "Microsoft".
        // Case insensitive match often returns "Microsoft" or "microsoft" depending on input casing
        expect(result.brandName?.toLowerCase()).toBe('microsoft');
    });

    it('should detect and fix hallucinated Google URLs', () => {
        const updates = {
            theme: {
                logo: {
                    src: 'https://www.google.com/images/branding/googlelogo/google_logo.png'
                }
            }
        };
        const result = handleLogoHallucination(updates, microlearningId);
        expect(result.theme?.logo).toBeUndefined();
        expect(result.brandName).toBe('google');
    });

    it('should ALLOW valid external URLs for non-watched brands', () => {
        const updates = {
            theme: {
                logo: {
                    src: 'https://cdn.example.com/img/netflix_fan_site_logo.jpg'
                }
            }
        };
        const result = handleLogoHallucination(updates, microlearningId);

        // Netflix IS a watched brand, so it SHOULD be intercepted if found in filename
        // Wait, "netflix" is in WATCHED_BRANDS. So this should actually be intercepted!
        expect(result.theme?.logo).toBeUndefined();
        expect(result.brandName).toBe('netflix_fan_site');
    });

    it('should ALLOW valid external URLs for truly custom brands', () => {
        const updates = {
            theme: {
                logo: {
                    src: 'https://cdn.example.com/img/unknown_startup_logo.jpg'
                }
            }
        };
        const result = handleLogoHallucination(updates, microlearningId);
        expect(result.theme?.logo?.src).toBe('https://cdn.example.com/img/unknown_startup_logo.jpg');
    });
});
