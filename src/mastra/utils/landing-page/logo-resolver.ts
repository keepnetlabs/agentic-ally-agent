/**
 * Logo URL resolver - Uses Apistemic Logos API as primary source
 * Falls back to letter-based placeholder logos when brand not found
 * Optimized for 64x64 pixel logos in email templates
 */

import { getLogger } from '../core/logger';

const logger = getLogger('LogoResolver');

/**
 * Generate a random letter-based logo URL as fallback
 * Uses single-letter domains (a.com, b.com, etc.) for generic logos
 * 
 * @returns Logo URL for a random letter domain
 */
export function getRandomLetterLogoUrl(): string {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    return `https://logos-api.apistemic.com/domain:${randomLetter}.com`;
}

/**
 * Generate logo URL from domain using Apistemic Logos API
 * Falls back to random letter logo if domain is invalid
 * 
 * @param domain - Domain name (e.g., "google.com")
 * @param size - Logo size in pixels (default: 64 for email templates) - not used by Apistemic API
 * @returns Logo URL string
 */
export function getLogoUrl(domain: string, size: number = 64): string {
    if (!domain || !domain.includes('.')) {
        logger.warn('Invalid domain provided for logo resolution, using random letter logo', { domain });
        return getRandomLetterLogoUrl();
    }

    // Clean domain (remove protocol, www, paths, etc.)
    const cleanDomain = domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split('?')[0]
        .trim();

    if (!cleanDomain || !cleanDomain.includes('.')) {
        logger.warn('Domain cleaning resulted in invalid domain, using random letter logo', { original: domain, cleaned: cleanDomain });
        return getRandomLetterLogoUrl();
    }

    // Primary: Apistemic Logos API (high-quality brand logos)
    // Format: https://logos-api.apistemic.com/domain:{domain}
    const apiUrl = `https://logos-api.apistemic.com/domain:${cleanDomain}`;

    logger.info('Generated logo URL using Apistemic Logos API', {
        domain: cleanDomain,
        size,
        logoUrl: apiUrl
    });

    return apiUrl;
}

/**
 * Get multiple logo URL options for fallback purposes
 * Returns array of URLs in order of preference (high quality first)
 * Optimized for email template usage (64x64px)
 * 
 * @param domain - Domain name (e.g., "google.com")
 * @param size - Logo size in pixels (default: 64 for email templates)
 * @returns Array of logo URLs (primary first, fallbacks following)
 */
export function getLogoUrlFallbacks(domain: string, size: number = 64): string[] {
    if (!domain || !domain.includes('.')) {
        return [getRandomLetterLogoUrl()];
    }

    const cleanDomain = domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split('?')[0]
        .trim();

    if (!cleanDomain || !cleanDomain.includes('.')) {
        return [getRandomLetterLogoUrl()];
    }

    return [
        `https://logos-api.apistemic.com/domain:${cleanDomain}`,          // Primary: Apistemic Logos API
        `https://icon.horse/icon/${cleanDomain}`,                         // Fallback 1: Icon Horse
        `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`,  // Fallback 2: Google Favicon
        getRandomLetterLogoUrl()                                          // Fallback 3: Random letter logo
    ];
}

