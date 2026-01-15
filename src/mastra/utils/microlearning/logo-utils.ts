import { getLogger } from '../core/logger';

/**
 * Checks if the agent hallucinated a raw filename instead of a URL.
 * If found, it tries to extract a brand name to be used for resolution.
 * Modifies the updates object in place.
 */
export function handleLogoHallucination(updates: any, microlearningId: string): any {
    const logger = getLogger('LogoHallucinationHandler');
    const processedUpdates = { ...updates };

    // Scenario 1: Hallucinated Filename in SRC
    if (processedUpdates.theme?.logo?.src) {
        const src = processedUpdates.theme.logo.src;
        // Check if it looks like a filename (ends in ext) but NOT a full URL (no http/s)
        const isRawFilename = /\.(png|jpg|jpeg|svg|webp)$/i.test(src) && !/^https?:\/\//i.test(src);

        if (isRawFilename) {
            logger.warn('Intercepted hallucinated logo filename', {
                invalidSrc: src,
                microlearningId,
            });

            // INTELLIGENT RECOVERY: 
            // If the agent sent "apple_logo.png", it clearly meant "Apple".
            const filename = src.split('/').pop() || '';
            const possibleBrandName = filename
                .replace(/[-_]logo/gi, '')
                .replace(/\.(png|jpg|jpeg|svg|webp)$/i, '');

            if (possibleBrandName && possibleBrandName.length > 2) {
                logger.info('Auto-corrected hallucination from filename to brandName', { extractedBrand: possibleBrandName });
                processedUpdates.brandName = possibleBrandName;
            }

            // Remove the invalid logo update
            if (processedUpdates.theme.logo) {
                delete processedUpdates.theme.logo;
            }
            return processedUpdates;
        }
    }

    // Scenario 2: Missing SRC but valid ALT (e.g. "Apple Logo")
    // The agent sometimes tries to be helpful by setting alt text but fails to find a URL.
    if (processedUpdates.theme?.logo?.alt && !processedUpdates.theme?.logo?.src) {
        const alt = processedUpdates.theme.logo.alt;
        if (/logo/i.test(alt)) {
            const possibleBrandName = alt.replace(/logo/gi, '').trim();

            if (possibleBrandName && possibleBrandName.length > 2) {
                logger.warn('Intercepted missing logo src with valid alt', { alt, microlearningId });
                logger.info('Auto-corrected hallucination from alt-text to brandName', { extractedBrand: possibleBrandName });

                processedUpdates.brandName = possibleBrandName;

                // Cleanup the useless logo object
                delete processedUpdates.theme.logo;
            }
        }
    }

    return processedUpdates;
}
