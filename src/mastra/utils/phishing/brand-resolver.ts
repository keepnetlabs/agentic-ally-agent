import { generateText, LanguageModel } from 'ai';
import { DEFAULT_GENERIC_LOGO } from '../landing-page/image-validator';
import { getLogger } from '../core/logger';
import { cleanResponse } from '../content-processors/json-cleaner';
import { getLogoUrl } from '../landing-page/logo-resolver';
import { normalizeError, logErrorInfo } from '../core/error-utils';
import { errorService } from '../../services/error-service';
import { EXTRACTION_PARAMS, BRAND_CREATIVE_PARAMS } from '../config/llm-generation-params';

const logger = getLogger('BrandResolver');

export interface LogoAndBrandInfo {
  logoUrl: string;
  brandName: string | null;
  isRecognizedBrand: boolean;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Resolve {CUSTOMMAINLOGO} tag to actual logo URL and detect brand using LLM
 * Analyzes company name, scenario, and email template to determine brand recognition
 * 
 * @param fromName - Company/brand name from email analysis
 * @param scenario - Phishing scenario context
 * @param model - AI model instance for brand detection
 * @param emailTemplate - Optional email template for additional brand context
 * @returns Logo URL and brand information
 */
export async function resolveLogoAndBrand(
  fromName: string,
  scenario: string,
  model: LanguageModel,
  emailTemplate?: string
): Promise<LogoAndBrandInfo> {
  try {
    // Build context with email template if available
    const emailContext = emailTemplate
      ? `\n\nEmail Template (first 1000 chars):\n${emailTemplate.substring(0, 1000)}`
      : '';

    // Use LLM to determine brand recognition and domain
    const response = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a brand domain expert. Analyze the company/brand name, scenario, and email content to determine if it represents a well-known, recognized brand. Return ONLY valid JSON with: { "domain": "microsoft.com" or null, "brandName": "Microsoft" or null, "isRecognizedBrand": true/false, "brandColors": { "primary": "#0078D4", "secondary": "#737373", "accent": "#00A4EF" } or null }. If it\'s a generic/internal company (IT Support, HR Department, etc.), return domain: null, brandName: null, isRecognizedBrand: false, brandColors: null. For recognized brands, include their authentic brand colors (primary, secondary, accent) in hex format.'
        },
        {
          role: 'user',
          content: `Company/Brand Name: "${fromName}"\nScenario: "${scenario}"${emailContext}\n\nAnalyze if this represents a well-known brand:\n- Examples of recognized brands: Microsoft, Google, Amazon, Apple, PayPal, Netflix, Spotify, Adobe, Salesforce, Stripe, Shopify, Meta, Facebook, Twitter, LinkedIn, Instagram, TikTok, YouTube, Hepsiburada, Trendyol, GittiGidiyor, N11, Amazon.tr, etc.\n- Examples of generic/internal: IT Support, HR Department, Finance Team, Security Team, etc.\n\nFor recognized brands, include their authentic brand colors:\n- Amazon: primary: "#FF9900", secondary: "#000000", accent: "#FF9900"\n- Microsoft: primary: "#0078D4", secondary: "#737373", accent: "#00A4EF"\n- Google: primary: "#4285F4", secondary: "#EA4335", accent: "#34A853"\n- PayPal: primary: "#003087", secondary: "#009CDE", accent: "#012169"\n- Apple: primary: "#000000", secondary: "#A8A8A8", accent: "#007AFF"\n\nReturn ONLY valid JSON: { "domain": "microsoft.com" or null, "brandName": "Microsoft" or null, "isRecognizedBrand": true/false, "brandColors": { "primary": "#0078D4", "secondary": "#737373", "accent": "#00A4EF" } or null }`
        }
      ],
      ...EXTRACTION_PARAMS,
    });

    logger.debug('LLM Response for Brand Resolution', {
      rawText: response.text.substring(0, 200) + '...', // Log snippet
    });

    // Parse JSON response
    const cleanedResponse = response.text.trim();
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const domain = parsed.domain?.toLowerCase().trim();
      const brandName = parsed.brandName?.trim() || null;
      const isRecognizedBrand = parsed.isRecognizedBrand === true;

      if (isRecognizedBrand && domain && domain.includes('.')) {
        // Clean up domain (remove quotes, extra text)
        const cleanDomain = domain.replace(/['"]/g, '').split(/[\s\n]/)[0];
        if (cleanDomain.includes('.')) {
          const logoUrl = getLogoUrl(cleanDomain, 96);
          const brandColors = parsed.brandColors || null;
          logger.info('Resolved logo URL for brand', {
            brandName: brandName || fromName,
            domain: cleanDomain,
            logoUrl,
            hasBrandColors: !!brandColors
          });
          return {
            logoUrl,
            brandName: brandName || fromName,
            isRecognizedBrand: true,
            brandColors: brandColors || undefined
          };
        }
      }
    }

    // Fallback to placeholder domain logo for generic/internal companies
    // Instead of using generic corporate icon, generate a domain-based logo
    logger.info('No recognized brand found, generating placeholder domain logo', {
      fromName
    });

    // Generate placeholder domain from company name
    const placeholderDomain = generatePlaceholderDomain(fromName);
    const placeholderLogoUrl = getLogoUrl(placeholderDomain, 96);

    logger.info('Using placeholder domain logo', {
      fromName,
      placeholderDomain,
      logoUrl: placeholderLogoUrl
    });

    return {
      logoUrl: placeholderLogoUrl,
      brandName: null,
      isRecognizedBrand: false
    };
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.aiModel(err.message, {
      step: 'resolve-logo-and-brand',
      stack: err.stack,
    });
    logErrorInfo(logger, 'warn', 'Logo and brand resolution failed, generating placeholder domain logo', errorInfo);

    // Even on error, try to generate a placeholder domain logo instead of generic corporate icon
    try {
      const placeholderDomain = generatePlaceholderDomain(fromName);
      const placeholderLogoUrl = getLogoUrl(placeholderDomain, 96);
      return {
        logoUrl: placeholderLogoUrl,
        brandName: null,
        isRecognizedBrand: false
      };
    } catch (fallbackError) {
      const fallbackErr = normalizeError(fallbackError);
      const errorInfo = errorService.external(fallbackErr.message, {
        step: 'placeholder-logo-fallback',
        stack: fallbackErr.stack,
      });
      logErrorInfo(logger, 'error', 'Placeholder logo generation failed, using default logo as last resort', errorInfo);
      return {
        logoUrl: DEFAULT_GENERIC_LOGO,
        brandName: null,
        isRecognizedBrand: false
      };
    }
  }
}

/**
 * Generate a contextual brand name and logo URL based on phishing scenario analysis
 * Used when brand detection fails - generates a realistic brand that fits the scenario context
 * 
 * @param scenario - Phishing scenario description
 * @param category - Phishing category (e.g., "Invoice", "Security Alert")
 * @param fromName - Original sender name from analysis
 * @param model - AI model instance for brand generation
 * @returns LogoAndBrandInfo with generated brand name and logo URL (or default)
 */
export async function generateContextualBrand(
  scenario: string,
  category: string,
  fromName: string,
  model: LanguageModel
): Promise<LogoAndBrandInfo> {
  try {
    logger.info('Generating contextual brand based on scenario analysis', {
      scenario: scenario.substring(0, 100),
      category,
      fromName
    });

    const response = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a brand naming expert. Based on the phishing scenario analysis, suggest a realistic, contextually appropriate brand/company name that fits the scenario. Return ONLY valid JSON: { "suggestedBrandName": "Brand Name", "domain": "brandname.com" or null }. The brand name should be realistic and fit the scenario context (e.g., for "invoice" scenarios: accounting/finance brands, for "security" scenarios: tech/security brands). Keep it simple and realistic - 1-2 words maximum. If you suggest a domain, make it realistic but generic (e.g., "securepay.com", "invoicepro.com").'
        },
        {
          role: 'user',
          content: `Scenario: "${scenario}"\nCategory: "${category}"\nFrom Name: "${fromName}"\n\nSuggest a realistic brand name and optional domain that fits this phishing scenario context. Return ONLY valid JSON: { "suggestedBrandName": "Brand Name", "domain": "brandname.com" or null }`
        }
      ],
      ...BRAND_CREATIVE_PARAMS,
    });

    // Clean and parse JSON response
    const cleanedJson = cleanResponse(response.text, 'contextual-brand-generation');
    const parsed = JSON.parse(cleanedJson);

    const suggestedBrandName = parsed.suggestedBrandName?.trim();
    const domain = parsed.domain?.toLowerCase().trim();

    if (suggestedBrandName && suggestedBrandName.length > 0) {
      // Always try to use logo service - prefer provided domain, fallback to placeholder domain
      let logoUrl: string;

      if (domain && domain.includes('.')) {
        const cleanDomain = domain.replace(/['"]/g, '').split(/[\s\n]/)[0];
        if (cleanDomain.includes('.')) {
          logoUrl = getLogoUrl(cleanDomain, 96);
          logger.info('Generated contextual brand with logo from domain', {
            brandName: suggestedBrandName,
            domain: cleanDomain,
            logoUrl
          });
        } else {
          // Invalid domain format, use placeholder
          logoUrl = getLogoUrl(generatePlaceholderDomain(suggestedBrandName), 96);
          logger.info('Generated contextual brand with placeholder logo (invalid domain)', {
            brandName: suggestedBrandName,
            logoUrl
          });
        }
      } else {
        // No domain provided, generate placeholder domain logo
        logoUrl = getLogoUrl(generatePlaceholderDomain(suggestedBrandName), 96);
        logger.info('Generated contextual brand with placeholder logo', {
          brandName: suggestedBrandName,
          logoUrl
        });
      }

      return {
        logoUrl,
        brandName: suggestedBrandName,
        isRecognizedBrand: false, // Still not a recognized brand, just contextual
      };
    }

    // Fallback if brand name generation failed - use placeholder domain logo
    logger.warn('Failed to generate contextual brand name, using placeholder logo');
    const placeholderLogoUrl = getLogoUrl(generatePlaceholderDomain('brand'), 96);
    return {
      logoUrl: placeholderLogoUrl,
      brandName: null,
      isRecognizedBrand: false
    };
  } catch (error) {
    const err = normalizeError(error);
    const errorInfo = errorService.aiModel(err.message, {
      step: 'generate-contextual-brand',
      stack: err.stack,
    });
    logErrorInfo(logger, 'warn', 'Contextual brand generation failed, attempting placeholder logo', errorInfo);

    // Try to use placeholder logo, fallback to DEFAULT_GENERIC_LOGO only if that fails too
    try {
      const placeholderLogoUrl = getLogoUrl(generatePlaceholderDomain('brand'), 96);
      return {
        logoUrl: placeholderLogoUrl,
        brandName: null,
        isRecognizedBrand: false
      };
    } catch (fallbackError) {
      const fallbackErr = normalizeError(fallbackError);
      const errorInfo = errorService.external(fallbackErr.message, {
        step: 'contextual-brand-placeholder-fallback',
        stack: fallbackErr.stack,
      });
      logErrorInfo(logger, 'error', 'Placeholder logo generation failed, using default logo as last resort', errorInfo);
      return {
        logoUrl: DEFAULT_GENERIC_LOGO,
        brandName: null,
        isRecognizedBrand: false
      };
    }
  }
}

/**
 * Generate a placeholder domain from a company/brand name
 * Used to create domain-based logos instead of using generic corporate icons
 *
 * @param brandName - Company or brand name
 * @returns A domain-like placeholder (e.g., "itsupport.local" from "IT Support")
 */
function generatePlaceholderDomain(brandName: string): string {
  // Convert to lowercase and replace spaces/special chars with hyphens
  const sanitized = brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens

  // Ensure non-empty result
  const domainName = sanitized || 'brand';

  // Use .local for internal companies to indicate placeholder domain
  // This will go through getLogoUrl() which uses Apistemic API
  // For invalid domains, getLogoUrl falls back to random letter logo
  return `${domainName}.local`;
}


