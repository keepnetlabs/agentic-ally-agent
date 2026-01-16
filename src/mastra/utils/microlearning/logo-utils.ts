import { z } from 'zod';
import { updatesSchema } from '../../workflows/microlearning-schemas';
import { getLogger } from '../core/logger';

type Updates = z.infer<typeof updatesSchema>;

// Heuristic Configuration
const SUSPICIOUS_DOMAINS = [
    'wikimedia.org',
    'wikipedia.org',
    'google.com',
    'bing.com',
    'placeholder.com',
    'dummyimage.com'
];

const WATCHED_BRANDS = [
    'microsoft',
    'google',
    'apple',
    'amazon',
    'facebook',
    'meta',
    'netflix',
    'tesla',
    'linkedin',
    'instagram',
    'twitter',
    'x.com',
    'adobe',
    'salesforce'
];

/**
 * Checks if the agent hallucinated a raw filename instead of a URL.
 * If found, it tries to extract a brand name to be used for resolution.
 * Modifies the updates object in place.
 */
export function handleLogoHallucination(updates: Updates, microlearningId: string): Updates {
    const logger = getLogger('LogoHallucinationHandler');
    const processedUpdates = { ...updates };

    // Scenario 1: External URL or Raw Filename
    if (processedUpdates.theme?.logo?.src) {
        const src = processedUpdates.theme.logo.src;

        // 1. Check for raw filenames (e.g. "apple.png") - ALWAYS Intercept
        const isRawFilename = /\.(png|jpg|jpeg|svg|webp)$/i.test(src) && !/^https?:\/\//i.test(src);

        // 2. Check for External URLs
        const isExternalUrl = /^https?:\/\//i.test(src);

        // 3. Smart Heuristics for External URLs
        let isSuspiciousHallucination = false;

        if (isExternalUrl) {
            // A. Block known hallucination sources
            const isSuspiciousDomain = SUSPICIOUS_DOMAINS.some(domain => src.toLowerCase().includes(domain));

            // B. Block likely hallucinated "Major Brand" URLs (e.g. some-random-site.com/microsoft.png)
            // We only block if the filename explicitly names a watched brand, assuming we have a better internal logo.
            const isWatchedBrand = WATCHED_BRANDS.some(brand => src.toLowerCase().includes(brand));

            isSuspiciousHallucination = isSuspiciousDomain || isWatchedBrand;
        }

        if (isRawFilename || isSuspiciousHallucination) {
            // INTELLIGENT RECOVERY
            const filename = src.split('/').pop() || '';
            const extractedName = filename
                .replace(/[-_]logo/gi, '')
                .replace(/%20/g, ' ')
                .replace(/(\.(png|jpg|jpeg|svg|webp))+(\?.*)?$/i, '')
                .trim();

            // Safety check: Ensure the extracted name matches a watched brand if it was triggered by one
            // This prevents "mysite.com/my-microsoft-project.png" from being stripped unless we are sure.
            // But for hallucinations, we generally want to recover the brand.

            if (extractedName && extractedName.length > 2) {
                logger.warn('Intercepted hallucinated/suspicious logo', {
                    originalSrc: src,
                    extractedBrand: extractedName,
                    reason: isRawFilename ? 'raw_filename' : 'suspicious_url'
                });

                processedUpdates.brandName = extractedName;

                if (processedUpdates.theme.logo) {
                    delete processedUpdates.theme.logo;
                }
                return processedUpdates;
            }
        }
    }

    // Scenario 2: Missing SRC but valid ALT
    if (processedUpdates.theme?.logo?.alt && !processedUpdates.theme?.logo?.src) {
        const alt = processedUpdates.theme.logo.alt;
        if (/logo/i.test(alt)) {
            const possibleBrandName = alt.replace(/logo/gi, '').trim();

            if (possibleBrandName && possibleBrandName.length > 2) {
                logger.warn('Intercepted missing logo src with valid alt', { alt, microlearningId });
                processedUpdates.brandName = possibleBrandName;
                delete processedUpdates.theme.logo;
            }
        }
    }

    return processedUpdates;
}
