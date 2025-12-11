/**
 * Image validation utilities for landing pages
 * Validates image URLs with real HTTP requests and fixes broken images
 */

// Default generic corporate logo URL - used as fallback when brand logos fail
// Modern, professional icon-only logo with gradient background
export const DEFAULT_GENERIC_LOGO = "https://imagedelivery.net/KxWh-mxPGDbsqJB3c5_fmA/761ba07b-5af5-443c-95b6-9499596afd00/public";

/**
 * Normalize img tag attributes and ensure proper centering styles
 * Ensures img tags have proper centering styles (display: block; margin: 0 auto)
 * 
 * @param html - HTML string with img tags
 * @returns HTML with normalized img tag attributes (centered)
 */
export function normalizeImgAttributes(html: string): string {
    // Find all img tags - match the entire tag including self-closing
    const imgRegex = /<img\s+([^>]+)(?:\s*\/)?>/gi;

    return html.replace(imgRegex, (match, attributes) => {
        // Extract style attribute if present
        const styleMatch = attributes.match(/style\s*=\s*['"]([^'"]*)['"]/i);
        let style = styleMatch ? styleMatch[1] : '';

        // Ensure centering styles are present
        if (!style.includes('display:') && !style.includes('margin:')) {
            style = `display: block; margin: 0 auto; ${style}`.trim();
        } else {
            // Update existing display/margin if needed
            if (!style.includes('display: block')) {
                style = style.replace(/display:\s*[^;]+/i, 'display: block');
            }
            if (!style.includes('margin: 0 auto')) {
                style = style.replace(/margin:\s*[^;]+/i, 'margin: 0 auto');
            }
        }

        // Update or add style attribute
        if (styleMatch) {
            return match.replace(/style\s*=\s*['"]([^'"]*)['"]/i, `style='${style}'`);
        } else {
            // Add style attribute if not present
            return match.replace(/>$/, ` style='${style}'>`);
        }
    });
}

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
                // Replace src attribute with default logo URL
                const fixedTag = fullTag.replace(/src\s*=\s*['"]([^'"]*)['"]/i, `src='${DEFAULT_GENERIC_LOGO}'`);
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
