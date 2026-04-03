import type { LanguageModel } from 'ai';
import { trackedGenerateText } from '../core/tracked-generate';
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

const INTERNAL_DOMAIN_SUFFIXES = ['.local', '.internal', '.localhost', '.example', '.test', '.invalid'];

interface BrandResolutionSignals {
  fromName: string;
  scenario: string;
  emailTemplate?: string;
  brandHint?: string;
  normalizedSignalHints: string;
  explicitDomainCandidates: string[];
  analysisBrandSignals?: AnalysisBrandSignals;
}

interface CanonicalBrandResolution {
  canonicalBrandName: string | null;
  brandName: string | null;
  domain?: string;
  isRecognizedBrand: boolean;
  confidence: 'high' | 'medium' | 'low';
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface AnalysisBrandSignals {
  brandIntent?: 'public-brand' | 'internal-brand' | 'generic';
  canonicalBrandName?: string;
  localizedBrandSurface?: string;
  brandEvidence?: string[];
  candidateDomains?: string[];
  brandConfidence?: 'high' | 'medium' | 'low';
  scriptOrLocaleHint?: string;
}

function normalizeBrandSignal(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/[^\p{L}\p{N}.@/_ -]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanResolvedDomain(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  let domain = value.toLowerCase().trim().replace(/['"]/g, '');

  try {
    if (/^https?:\/\//i.test(domain)) {
      domain = new URL(domain).hostname;
    }
  } catch {
    // Keep original string if it is not a full URL.
  }

  domain = domain.replace(/^www\./, '').split(/[/?#\s]/)[0];
  return domain.includes('.') ? domain : undefined;
}

function isInternalOrPlaceholderDomain(domain: string): boolean {
  return INTERNAL_DOMAIN_SUFFIXES.some(suffix => domain.endsWith(suffix));
}

function extractExplicitDomainCandidates(parts: Array<string | undefined>): string[] {
  const candidates = new Set<string>();

  for (const part of parts) {
    if (!part) continue;

    for (const match of part.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) {
      const domain = cleanResolvedDomain(match[1]);
      if (domain && !isInternalOrPlaceholderDomain(domain)) {
        candidates.add(domain);
      }
    }

    for (const match of part.matchAll(/@([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) {
      const domain = cleanResolvedDomain(match[1]);
      if (domain && !isInternalOrPlaceholderDomain(domain)) {
        candidates.add(domain);
      }
    }
  }

  return Array.from(candidates).slice(0, 5);
}

function buildNormalizedSignalHints(parts: Array<string | undefined>): string {
  const normalized = parts.map(part => normalizeBrandSignal(part || '')).filter(Boolean);
  if (normalized.length === 0) {
    return '';
  }

  return `\nNormalized Signal Hints:\n- ${normalized.join('\n- ')}`;
}

function buildAnalysisBrandSignalContext(signals?: AnalysisBrandSignals): string {
  if (!signals) {
    return '';
  }

  const lines: string[] = [];
  if (signals.brandIntent) lines.push(`- Brand Intent: ${signals.brandIntent}`);
  if (signals.canonicalBrandName) lines.push(`- Canonical Brand Name: ${signals.canonicalBrandName}`);
  if (signals.localizedBrandSurface) lines.push(`- Localized Brand Surface: ${signals.localizedBrandSurface}`);
  if (signals.brandEvidence?.length) lines.push(`- Brand Evidence: ${signals.brandEvidence.join(' | ')}`);
  if (signals.candidateDomains?.length) lines.push(`- Candidate Domains: ${signals.candidateDomains.join(', ')}`);
  if (signals.brandConfidence) lines.push(`- Upstream Brand Confidence: ${signals.brandConfidence}`);
  if (signals.scriptOrLocaleHint) lines.push(`- Script/Locale Hint: ${signals.scriptOrLocaleHint}`);

  return lines.length ? `\nAnalysis Brand Signals:\n${lines.join('\n')}` : '';
}

function buildBrandResolutionSignals(params: {
  fromName: string;
  scenario: string;
  emailTemplate?: string;
  brandHint?: string;
  analysisBrandSignals?: AnalysisBrandSignals;
}): BrandResolutionSignals {
  const analysisDomains = (params.analysisBrandSignals?.candidateDomains || [])
    .map(domain => cleanResolvedDomain(domain))
    .filter((domain): domain is string => !!domain && !isInternalOrPlaceholderDomain(domain));

  return {
    fromName: params.fromName,
    scenario: params.scenario,
    emailTemplate: params.emailTemplate,
    brandHint: params.brandHint,
    normalizedSignalHints: buildNormalizedSignalHints([
      params.fromName,
      params.scenario,
      params.brandHint,
      params.analysisBrandSignals?.localizedBrandSurface,
      params.analysisBrandSignals?.canonicalBrandName,
      ...(params.analysisBrandSignals?.brandEvidence || []),
    ]),
    explicitDomainCandidates: Array.from(
      new Set([
        ...analysisDomains,
        ...extractExplicitDomainCandidates([params.fromName, params.scenario, params.brandHint, params.emailTemplate]),
      ])
    ).slice(0, 5),
    analysisBrandSignals: params.analysisBrandSignals,
  };
}

function buildCanonicalizationPrompt(signals: BrandResolutionSignals): { system: string; user: string } {
  const emailContext = signals.emailTemplate
    ? `\n\nEmail Template (first 1000 chars):\n${signals.emailTemplate.substring(0, 1000)}`
    : '';
  const brandHintContext = signals.brandHint ? `\nBrand Hint: "${signals.brandHint}"` : '';
  const explicitDomainContext = signals.explicitDomainCandidates.length
    ? `\nExplicit Domain Hints: ${signals.explicitDomainCandidates.join(', ')}`
    : '';
  const analysisBrandSignalContext = buildAnalysisBrandSignalContext(signals.analysisBrandSignals);

  return {
    system:
      'You are a brand canonicalization and domain-resolution expert. Analyze the company/brand name, scenario, optional brand hint, normalized signal hints, explicit domain hints, upstream analysis brand signals, and email content to determine whether the request refers to a recognized public brand or a generic/internal sender. Inputs may be written in any language or script, including Turkish, Thai, Indonesian, German, Spanish, Arabic, and mixed-language product wording. Do not assume English. Do not rely on exact English string matches. Always perform dynamic canonicalization from the observed signals. Treat upstream analysis brand signals as high-signal guidance, especially when they have medium or high confidence, but still verify consistency against the total evidence. If a public brand is strongly implied by the evidence, resolve it to a canonical public brand and its best matching domain. If the evidence is weak, keep it generic/internal. Return ONLY valid JSON with: { "domain": "microsoft.com" or null, "brandName": "Microsoft" or null, "canonicalBrandName": "Microsoft" or null, "isRecognizedBrand": true/false, "confidence": "high" | "medium" | "low", "brandColors": { "primary": "#0078D4", "secondary": "#737373", "accent": "#00A4EF" } or null }. Brand colors should be authentic only when the brand match is strong.',
    user: `Company/Brand Name: "${signals.fromName}"\nScenario: "${signals.scenario}"${brandHintContext}${signals.normalizedSignalHints}${explicitDomainContext}${analysisBrandSignalContext}${emailContext}\n\nAnalyze whether this refers to a recognized public brand.\n- Inputs may be multilingual, mixed-script, or localized product wording.\n- Examples mentioned in the prompt are illustrative, not exhaustive.\n- Use dynamic canonicalization from the observed signals, not fixed alias matching.\n- Prefer explicit public-domain hints only when they align with the rest of the evidence.\n- Use upstream analysis brand signals as structured evidence, not as a blind override.\n- If the sender looks generic or internal, return a non-recognized result.\n\nReturn ONLY valid JSON: { "domain": "microsoft.com" or null, "brandName": "Microsoft" or null, "canonicalBrandName": "Microsoft" or null, "isRecognizedBrand": true/false, "confidence": "high" | "medium" | "low", "brandColors": { "primary": "#0078D4", "secondary": "#737373", "accent": "#00A4EF" } or null }`,
  };
}

function resolveCanonicalConfidence(params: {
  parsedConfidence: unknown;
  isRecognizedBrand: boolean;
  parsedDomain?: string;
  brandName?: string | null;
  canonicalBrandName?: string | null;
}): 'high' | 'medium' | 'low' {
  const { parsedConfidence, isRecognizedBrand, parsedDomain, brandName, canonicalBrandName } = params;

  if (parsedConfidence === 'high' || parsedConfidence === 'medium' || parsedConfidence === 'low') {
    return parsedConfidence;
  }

  const hasRecognizedBrandEvidence = isRecognizedBrand && Boolean(parsedDomain || brandName || canonicalBrandName);
  return hasRecognizedBrandEvidence ? 'medium' : 'low';
}

function parseCanonicalBrandResolution(responseText: string, explicitDomainCandidates: string[]): CanonicalBrandResolution | undefined {
  const cleanedResponse = responseText.trim();
  const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return undefined;
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const isRecognizedBrand = parsed.isRecognizedBrand === true;
  const parsedDomain = cleanResolvedDomain(parsed.domain);
  const confidence = resolveCanonicalConfidence({
    parsedConfidence: parsed.confidence,
    isRecognizedBrand,
    parsedDomain,
    brandName: parsed.brandName,
    canonicalBrandName: parsed.canonicalBrandName,
  });
  const fallbackExplicitDomain = isRecognizedBrand && explicitDomainCandidates.length === 1 ? explicitDomainCandidates[0] : undefined;
  const resolvedDomain = parsedDomain || fallbackExplicitDomain;

  return {
    canonicalBrandName: parsed.canonicalBrandName?.trim() || parsed.brandName?.trim() || null,
    brandName: parsed.brandName?.trim() || parsed.canonicalBrandName?.trim() || null,
    domain: resolvedDomain,
    isRecognizedBrand,
    confidence,
    brandColors: parsed.brandColors || undefined,
  };
}

async function resolveCanonicalBrand(signals: BrandResolutionSignals, model: LanguageModel): Promise<CanonicalBrandResolution | undefined> {
  const prompt = buildCanonicalizationPrompt(signals);
  const response = await trackedGenerateText('brand-resolver', {
    model,
    messages: [
      {
        role: 'system',
        content: prompt.system,
      },
      {
        role: 'user',
        content: prompt.user,
      },
    ],
    ...EXTRACTION_PARAMS,
  });

  logger.debug('LLM Response for Brand Resolution', {
    rawText: response.text.substring(0, 200) + '...',
  });

  return parseCanonicalBrandResolution(response.text, signals.explicitDomainCandidates);
}

/**
 * Resolve {CUSTOMMAINLOGO} tag to actual logo URL and detect brand using LLM
 * Analyzes company name, scenario, and email template to determine brand recognition
 *
 * @param fromName - Company/brand name from email analysis
 * @param scenario - Phishing scenario context
 * @param model - AI model instance for brand detection
 * @param emailTemplate - Optional email template for additional brand context
 * @param brandHint - Optional original topic or brand hint for public-brand recognition
 * @param analysisBrandSignals - Optional structured multilingual brand signals produced during scenario analysis
 * @returns Logo URL and brand information
 */
export async function resolveLogoAndBrand(
  fromName: string,
  scenario: string,
  model: LanguageModel,
  emailTemplate?: string,
  brandHint?: string,
  analysisBrandSignals?: AnalysisBrandSignals
): Promise<LogoAndBrandInfo> {
  try {
    const signals = buildBrandResolutionSignals({ fromName, scenario, emailTemplate, brandHint, analysisBrandSignals });
    const canonicalResolution = await resolveCanonicalBrand(signals, model);
    const effectiveConfidence = canonicalResolution?.confidence || 'low';

    if (canonicalResolution?.isRecognizedBrand && canonicalResolution.domain && effectiveConfidence !== 'low') {
      const logoUrl = getLogoUrl(canonicalResolution.domain, 96);
      logger.info('Resolved logo URL via dynamic canonicalization pipeline', {
        brandName: canonicalResolution.brandName || fromName,
        canonicalBrandName: canonicalResolution.canonicalBrandName,
        confidence: effectiveConfidence,
        domain: canonicalResolution.domain,
        logoUrl,
      });
      return {
        logoUrl,
        brandName: canonicalResolution.brandName || canonicalResolution.canonicalBrandName || fromName,
        isRecognizedBrand: true,
        brandColors: canonicalResolution.brandColors,
      };
    }

    if (canonicalResolution?.isRecognizedBrand && canonicalResolution.domain && effectiveConfidence === 'low') {
      logger.info('Rejected recognized-brand resolution because confidence remained low', {
        brandName: canonicalResolution.brandName,
        canonicalBrandName: canonicalResolution.canonicalBrandName,
        domain: canonicalResolution.domain,
      });
    }

    // Fallback to placeholder domain logo for generic/internal companies
    // Instead of using generic corporate icon, generate a domain-based logo
    logger.info('No recognized brand found, generating placeholder domain logo', {
      fromName,
    });

    // Generate placeholder domain from company name
    const placeholderDomain = generatePlaceholderDomain(fromName);
    const placeholderLogoUrl = getLogoUrl(placeholderDomain, 96);

    logger.info('Using placeholder domain logo', {
      fromName,
      placeholderDomain,
      logoUrl: placeholderLogoUrl,
    });

    return {
      logoUrl: placeholderLogoUrl,
      brandName: null,
      isRecognizedBrand: false,
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
        isRecognizedBrand: false,
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
        isRecognizedBrand: false,
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
      fromName,
    });

    const response = await trackedGenerateText('brand-resolver', {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a brand naming expert. Based on the phishing scenario analysis, suggest a realistic, contextually appropriate brand/company name that fits the scenario. Return ONLY valid JSON: { "suggestedBrandName": "Brand Name", "domain": "brandname.com" or null }. The brand name should be realistic and fit the scenario context (e.g., for "invoice" scenarios: accounting/finance brands, for "security" scenarios: tech/security brands). Keep it simple and realistic - 1-2 words maximum. If you suggest a domain, make it realistic but generic (e.g., "securepay.com", "invoicepro.com").',
        },
        {
          role: 'user',
          content: `Scenario: "${scenario}"\nCategory: "${category}"\nFrom Name: "${fromName}"\n\nSuggest a realistic brand name and optional domain that fits this phishing scenario context. Return ONLY valid JSON: { "suggestedBrandName": "Brand Name", "domain": "brandname.com" or null }`,
        },
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
            logoUrl,
          });
        } else {
          // Invalid domain format, use placeholder
          logoUrl = getLogoUrl(generatePlaceholderDomain(suggestedBrandName), 96);
          logger.info('Generated contextual brand with placeholder logo (invalid domain)', {
            brandName: suggestedBrandName,
            logoUrl,
          });
        }
      } else {
        // No domain provided, generate placeholder domain logo
        logoUrl = getLogoUrl(generatePlaceholderDomain(suggestedBrandName), 96);
        logger.info('Generated contextual brand with placeholder logo', {
          brandName: suggestedBrandName,
          logoUrl,
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
      isRecognizedBrand: false,
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
        isRecognizedBrand: false,
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
        isRecognizedBrand: false,
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
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Ensure non-empty result
  const domainName = sanitized || 'brand';

  // Use .local for internal companies to indicate placeholder domain
  // This will go through getLogoUrl() which uses Apistemic API
  // For invalid domains, getLogoUrl falls back to random letter logo
  return `${domainName}.local`;
}
