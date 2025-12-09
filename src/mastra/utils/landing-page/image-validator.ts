/**
 * Image validation utilities for landing pages
 * Validates image URLs with real HTTP requests and fixes broken images
 */

// Default generic corporate logo (SVG data URI) - used as fallback when brand logos fail
// Modern, professional icon-only logo with gradient background
export const DEFAULT_GENERIC_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23334155;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%231e293b;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='80' height='80' fill='url(%23grad)' rx='16'/%3E%3Ccircle cx='40' cy='40' r='18' fill='none' stroke='%23ffffff' stroke-width='3'/%3E%3Cpath d='M 40 25 L 40 40 L 50 40' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' fill='none'/%3E%3C/svg%3E";

/**
 * Validate image URL with real HTTP HEAD request
 * @param url - Image URL to validate
 * @returns Promise<boolean> - true if image is accessible, false otherwise
 */
export async function validateImageUrl(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const response = await fetch(url, {
            method: 'HEAD', // Only get headers, not full image
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Check if response is successful (200-299)
        return response.ok;
    } catch (error) {
        // Network error, timeout, or invalid URL
        return false;
    }
}

/**
 * Validate and fix broken images in HTML
 * Performs 2-step validation:
 * 1. Heuristic check (fast fail for obvious issues)
 * 2. Real HTTP validation (HEAD request for valid-looking URLs)
 *
 * @param html - HTML string to process
 * @param brandName - Brand name to use as fallback text logo
 * @returns Promise<string> - HTML with broken images replaced
 */
export async function fixBrokenImages(html: string, brandName: string): Promise<string> {
    // Find all img tags with src attributes
    const imgRegex = /<img[^>]+src=['"]([^'"]+)['"][^>]*>/gi;

    let fixedHtml = html;
    const matches = [...html.matchAll(imgRegex)];

    // Build map of unique URLs to validate (avoid duplicate HTTP requests)
    const uniqueUrls = new Set<string>();
    const urlToMatches = new Map<string, Array<{ fullTag: string; index: number }>>();

    matches.forEach((match, index) => {
        const fullImgTag = match[0];
        const imgSrc = match[1];

        if (!urlToMatches.has(imgSrc)) {
            urlToMatches.set(imgSrc, []);
            uniqueUrls.add(imgSrc);
        }
        urlToMatches.get(imgSrc)!.push({ fullTag: fullImgTag, index });
    });

    // Validate all unique URLs in parallel (with cached validation)
    const validationPromises = Array.from(uniqueUrls).map(async (url) => {
        // Skip data URIs (they're always valid, no need to validate)
        if (url.startsWith('data:')) {
            console.log(`✅ Skipping validation for data URI (always valid)`);
            return { url, isValid: true };
        }

        // Quick heuristic check first (fail fast for obvious issues)
        const isObviouslyBroken =
            !url.startsWith('http') ||
            url.includes('localhost') ||
            url.startsWith('/') ||
            url.startsWith('./') ||
            url.startsWith('../') ||
            url.includes('example.com');

        if (isObviouslyBroken) {
            return { url, isValid: false };
        }

        // Use cached validation for valid-looking URLs
        if (url.startsWith('http')) {
            console.log(`🔍 Validating image URL: ${url}`);
            const isValid = await validateImageUrlCached(url);

            if (!isValid) {
                console.log(`❌ Image validation failed (404 or timeout): ${url}`);
            } else {
                console.log(`✅ Image validated successfully: ${url}`);
            }

            return { url, isValid };
        }

        return { url, isValid: false };
    });

    const validationResults = await Promise.all(validationPromises);
    const urlValidityMap = new Map(validationResults.map(r => [r.url, r.isValid]));

    // Replace all broken images (including duplicates) with default generic logo
    urlToMatches.forEach((matchesForUrl, url) => {
        const isValid = urlValidityMap.get(url) ?? false;

        if (!isValid) {
            console.log(`🔧 Replacing ${matchesForUrl.length} broken image(s) with default generic logo`);

            matchesForUrl.forEach(({ fullTag }) => {
                // Simply replace the src attribute, keep all other attributes intact
                const fixedTag = fullTag.replace(/src=['"]([^'"]*)['"]/i, `src='${DEFAULT_GENERIC_LOGO}'`);
                fixedHtml = fixedHtml.replace(fullTag, fixedTag);
            });
        }
    });

    return fixedHtml;
}

/**
 * Cached version of validateImageUrl for performance
 * Stores validation results to avoid repeated HTTP requests
 * Cache entries expire after 5 minutes to handle temporary outages
 */
interface CacheEntry {
    isValid: boolean;
    timestamp: number;
}

const imageValidationCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function validateImageUrlCached(url: string): Promise<boolean> {
    const cached = imageValidationCache.get(url);

    // Check if cache entry exists and is still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log(`📦 Using cached validation result for: ${url}`);
        return cached.isValid;
    }

    // Cache miss or expired - validate and update cache
    const isValid = await validateImageUrl(url);
    imageValidationCache.set(url, {
        isValid,
        timestamp: Date.now()
    });

    // Cleanup expired entries periodically (only when cache grows)
    if (imageValidationCache.size > 100) {
        cleanupExpiredCacheEntries();
    }

    return isValid;
}

/**
 * Remove expired cache entries to prevent memory leaks
 */
function cleanupExpiredCacheEntries(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [url, entry] of imageValidationCache.entries()) {
        if (now - entry.timestamp >= CACHE_TTL_MS) {
            imageValidationCache.delete(url);
            removedCount++;
        }
    }

    if (removedCount > 0) {
        console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
    }
}

/**
 * Clear the image validation cache
 * Useful for testing or when you want to force re-validation
 */
export function clearImageValidationCache(): void {
    imageValidationCache.clear();
    console.log('🧹 Image validation cache cleared');
}
