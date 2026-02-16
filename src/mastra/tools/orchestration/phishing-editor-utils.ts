import { generateText } from 'ai';
import { getLogger } from '../../utils/core/logger';
import { normalizeError, logErrorInfo } from '../../utils/core/error-utils';
import { errorService } from '../../services/error-service';
import { cleanResponse } from '../../utils/content-processors/json-cleaner';
import { withTimeout } from '../../utils/core/resilience-utils';
import { resolveLogoAndBrand } from '../../utils/phishing/brand-resolver';
import { getIntentClassificationPrompt } from './phishing-editor-prompts';
import { LanguageModel } from '../../types/language-model';
import { EXTRACTION_PARAMS } from '../../utils/config/llm-generation-params';

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
        ...EXTRACTION_PARAMS,
      }),
      20000 // 20s timeout for this lightweight check
    );

    const intentParsed = JSON.parse(cleanResponse(intentResponse.text, 'brand-intent'));
    const isInternalBrandRequest = intentParsed.isInternalBrandRequest;

    logger.info('🔍 Brand intent classification result', {
      isInternalBrandRequest: !!isInternalBrandRequest,
      hasWhitelabelLogo: !!whitelabelConfig?.mainLogoUrl,
    });

    if (isInternalBrandRequest) {
      if (whitelabelConfig?.mainLogoUrl) {
        logger.info('🔍 Internal brand request detected, using whitelabel logo');
        resolvedBrandInfo = {
          brandName: 'Organization Brand',
          logoUrl: whitelabelConfig.mainLogoUrl,
          isRecognizedBrand: true,
        };
      } else {
        logger.warn('⚠️ Internal brand request detected but no whitelabel logo configured');
        // Fallback to normal resolution or let LLM decide
      }
    }

    // If not internal (or internal failed), try external resolution
    if (!resolvedBrandInfo) {
      // 2. LLM brand extraction to improve recognition for explicit logo requests
      const brandExtractPrompt = [
        'Extract the external brand name explicitly requested in the user instruction.',
        'Return ONLY valid JSON: { "brandName": "Brand Name" or null }.',
        'If user is asking to use their own company logo, return null.',
        `Instruction: "${editInstruction}"`,
      ].join('\n');

      let extractedBrandName: string | null = null;
      try {
        const brandExtractResponse = await withTimeout(
          generateText({
            model: aiModel,
            messages: [{ role: 'user', content: brandExtractPrompt }],
            ...EXTRACTION_PARAMS,
          }),
          10000
        );
        const extractedParsed = JSON.parse(cleanResponse(brandExtractResponse.text, 'brand-extract'));
        extractedBrandName = extractedParsed.brandName?.trim() || null;
        logger.info('🔍 Brand extraction result', {
          extractedBrandName,
          hasExtractedBrand: !!extractedBrandName,
        });
      } catch (extractError) {
        const err = normalizeError(extractError);
        const errorInfo = errorService.aiModel(err.message, { step: 'brand-extraction', stack: err.stack });
        logErrorInfo(logger, 'warn', 'Brand extraction failed, continuing with default resolution', errorInfo);
      }

      const brandSeed = extractedBrandName || editInstruction;
      resolvedBrandInfo = await resolveLogoAndBrand(brandSeed, editInstruction, aiModel);
    }

    if (resolvedBrandInfo?.isRecognizedBrand && resolvedBrandInfo?.logoUrl) {
      // Log brand name but mask URL for security
      logger.info('🔍 Brand detected in edit instruction', {
        brand: resolvedBrandInfo.brandName,
        logoResolved: true,
      });
      brandContext = `
CRITICAL - BRAND DETECTED:
The user wants to use "${resolvedBrandInfo.brandName}".
You MUST use EXACTLY this logo URL: "${resolvedBrandInfo.logoUrl}"
ACTION: REPLACE the existing logo src (or {CUSTOMMAINLOGO} placeholder) with this URL.
DO NOT use any other URL for the logo.`;
    }
  } catch (err) {
    const normalized = normalizeError(err);
    const errorInfo = errorService.external(normalized.message, {
      step: 'brand-logic-editor',
      stack: normalized.stack,
    });
    logErrorInfo(logger, 'warn', 'Brand logic in editor failed, continuing without brand context', errorInfo);
  }

  return { brandContext, resolvedBrandInfo };
}
