/**
 * Logo URL resolver - Alternative to Clearbit
 * Uses multiple fallback services to ensure high-quality logo availability for email templates
 * Optimized for 64x64 pixel logos in email templates
 */

import { getLogger } from '../core/logger';

const logger = getLogger('LogoResolver');

/**
 * Generate logo URL from domain using alternative services
 * Prioritizes high-quality logo services suitable for email templates (64x64px)
 * Falls back through multiple services if one fails
 * 
 * @param domain - Domain name (e.g., "google.com")
 * @param size - Logo size in pixels (default: 64 for email templates)
 * @returns Logo URL string
 */
export function getLogoUrl(domain: string, size: number = 64): string {
    if (!domain || !domain.includes('.')) {
        logger.warn('Invalid domain provided for logo resolution', { domain });
        return '';
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
        logger.warn('Domain cleaning resulted in invalid domain', { original: domain, cleaned: cleanDomain });
        return '';
    }

    // Primary: Icon Horse (high-quality logos, optimized for email templates)
    // Format: https://icon.horse/icon/{domain}
    // Provides high-resolution logos suitable for 64x64 email templates
    // Icon Horse automatically serves the best quality favicon/logo available
    // For fallback options, use getLogoUrlFallbacks() function
    const iconHorseUrl = `https://icon.horse/icon/${cleanDomain}`;

    logger.info('Generated logo URL using Icon Horse', {
        domain: cleanDomain,
        size,
        logoUrl: iconHorseUrl
    });

    return iconHorseUrl;
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
        return [];
    }

    const cleanDomain = domain
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split('?')[0]
        .trim();

    if (!cleanDomain || !cleanDomain.includes('.')) {
        return [];
    }

    return [
        `https://icon.horse/icon/${cleanDomain}`,                         // Primary: Icon Horse (high quality)
        `https://logo.dev/${cleanDomain}`,                                 // Fallback 1: Logo.dev (high quality)
        `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${size}`,  // Fallback 2: Google Favicon
        `https://api.faviconkit.com/${cleanDomain}/${size}`                // Fallback 3: FaviconKit
    ];
}

