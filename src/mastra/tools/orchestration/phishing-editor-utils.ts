

import { generateText } from 'ai';
import { getLogger } from '../../utils/core/logger';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { withTimeout } from '../../utils/core/resilience-utils';
import { resolveLogoAndBrand } from '../../utils/phishing/brand-resolver';
import { getIntentClassificationPrompt } from './phishing-editor-prompts';
import { LanguageModel } from '../../types/language-model';

/**
 * Detects if the user wants to use their internal brand logo or an external brand.
 * If internal, returns the whitelabel logo URL.
 * If external, resolves the brand logo using the standard resolver.
 */
export async function detectAndResolveBrand(
    editInstruction: string,
    aiModel: LanguageModel,
    whitelabelConfig: { mainLogoUrl?: string } | null
): Promise<{ brandContext: string; resolvedBrandInfo: any }> {
    const logger = getLogger('PhishingEditorUtils');
    let brandContext = '';
    let resolvedBrandInfo = null;

    try {
        // 1. Intent Classification: Does user want THEIR OWN logo or an EXTERNAL brand?
        const intentPrompt = getIntentClassificationPrompt(editInstruction);

        const intentResponse = await withTimeout(
            generateText({
                model: aiModel,
                messages: [{ role: 'user', content: intentPrompt }],
                temperature: 0.1, // High determinism
            }),
            10000 // 10s timeout for this lightweight check
        );

        const intentParsed = JSON.parse(cleanResponse(intentResponse.text, 'brand-intent'));
        const isInternalBrandRequest = intentParsed.isInternalBrandRequest;

        if (isInternalBrandRequest) {
            if (whitelabelConfig?.mainLogoUrl) {
                logger.info('Internal brand request detected, using whitelabel logo');
                resolvedBrandInfo = {
                    brandName: 'Organization Brand',
                    logoUrl: whitelabelConfig.mainLogoUrl,
                    isRecognizedBrand: true
                };
            } else {
                logger.warn('Internal brand request detected but no whitelabel logo configured');
                // Fallback to normal resolution or let LLM decide
            }
        }

        // If not internal (or internal failed), try external resolution
        if (!resolvedBrandInfo) {
            // Pass editInstruction as both name and scenario to help LLM extract brand name
            resolvedBrandInfo = await resolveLogoAndBrand(editInstruction, editInstruction, aiModel);
        }

        if (resolvedBrandInfo?.isRecognizedBrand && resolvedBrandInfo?.logoUrl) {
            // Log brand name but mask URL for security
            logger.info('Brand detected in edit instruction', { brand: resolvedBrandInfo.brandName, logoResolved: true });
            brandContext = `
CRITICAL - BRAND DETECTED:
The user wants to use "${resolvedBrandInfo.brandName}".
You MUST use EXACTLY this logo URL: "${resolvedBrandInfo.logoUrl}"
ACTION: REPLACE the existing logo src (or {CUSTOMMAINLOGO} placeholder) with this URL.
DO NOT use any other URL for the logo.`;
        }
    } catch (err) {
        logger.warn('Brand logic in editor failed, continuing without brand context', { error: err });
    }

    return { brandContext, resolvedBrandInfo };
}
