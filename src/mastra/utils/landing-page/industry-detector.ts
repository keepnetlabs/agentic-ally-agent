/**
 * Industry detection and design system for landing pages
 * Automatically detects company industry and provides appropriate color schemes
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { getLogger } from '../core/logger';
import { getDefaultGenerationModel } from '../../model-providers';
import { cleanResponse } from '../content-processors/json-cleaner';

const logger = getLogger('IndustryDetector');

// Industry name to design system mapping
const INDUSTRY_DESIGN_MAP: Record<string, Omit<IndustryDesign, 'industry'>> = {
    'Banking & Finance': {
        colors: {
            primary: '#1e3a8a',
            secondary: '#1f2937',
            accent: '#f59e0b',
            gradient: 'linear-gradient(135deg, #0f172a, #1e3a8a)'
        },
        typography: {
            headingClass: 'lp-heading-bank',
            bodyClass: 'lp-body-bank'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(30, 64, 175, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: #1e3a8a',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/jpmorganchase.com'
    },
    'Technology': {
        colors: {
            primary: '#4285f4',
            secondary: '#5f6368',
            accent: '#ea4335',
            gradient: 'linear-gradient(135deg, #4285f4, #a855f7)'
        },
        typography: {
            headingClass: 'lp-heading-tech',
            bodyClass: 'lp-body-tech'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(148, 163, 184, 0.18)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #4285f4, #8b5cf6)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/google.com'
    },
    'Healthcare': {
        colors: {
            primary: '#059669',
            secondary: '#0d9488',
            accent: '#06b6d4',
            gradient: 'linear-gradient(135deg, #059669, #0ea5e9)'
        },
        typography: {
            headingClass: 'lp-heading-health',
            bodyClass: 'lp-body-health'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(16, 185, 129, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #059669, #0d9488)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/mayoclinic.org'
    },
    'E-commerce': {
        colors: {
            primary: '#ff6600',
            secondary: '#16a34a',
            accent: '#eab308',
            gradient: 'linear-gradient(135deg, #fb923c, #facc15)'
        },
        typography: {
            headingClass: 'lp-heading-ecom',
            bodyClass: 'lp-body-ecom'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(248, 115, 22, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #ea580c, #f97316)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/amazon.com'
    },
    'Corporate': {
        colors: {
            primary: '#334155',
            secondary: '#64748b',
            accent: '#0ea5e9',
            gradient: 'linear-gradient(135deg, #020617, #334155)'
        },
        typography: {
            headingClass: 'lp-heading-corporate',
            bodyClass: 'lp-body-corporate'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(148, 163, 184, 0.18)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #334155, #020617)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(51, 65, 85, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/accenture.com'
    },
    'Education': {
        colors: {
            primary: '#7c3aed',          // Purple
            secondary: '#6366f1',        // Indigo
            accent: '#a855f7',           // Purple-500
            gradient: 'linear-gradient(135deg, #7c3aed, #6366f1)'
        },
        typography: {
            headingClass: 'lp-heading-edu',
            bodyClass: 'lp-body-edu'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(124, 58, 237, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #7c3aed, #6366f1)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/coursera.org'
    },
    'Media & Entertainment': {
        colors: {
            primary: '#dc2626',          // Red
            secondary: '#991b1b',        // Red-800
            accent: '#ef4444',           // Red-500
            gradient: 'linear-gradient(135deg, #dc2626, #ef4444)'
        },
        typography: {
            headingClass: 'lp-heading-media',
            bodyClass: 'lp-body-media'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(220, 38, 38, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #dc2626, #ef4444)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/netflix.com'
    },
    'Government': {
        colors: {
            primary: '#1e40af',          // Blue-800
            secondary: '#1e3a8a',        // Blue-900
            accent: '#3b82f6',           // Blue-500
            gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)'
        },
        typography: {
            headingClass: 'lp-heading-gov',
            bodyClass: 'lp-body-gov'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(30, 64, 175, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #1e40af, #3b82f6)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 8px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/usa.gov'
    },
    'Real Estate': {
        colors: {
            primary: '#c2410c',          // Orange-700
            secondary: '#ea580c',        // Orange-600
            accent: '#fb923c',           // Orange-400
            gradient: 'linear-gradient(135deg, #c2410c, #fb923c)'
        },
        typography: {
            headingClass: 'lp-heading-realestate',
            bodyClass: 'lp-body-realestate'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(194, 65, 12, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #c2410c, #ea580c)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(194, 65, 12, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/zillow.com'
    },
    'Hospitality & Travel': {
        colors: {
            primary: '#0891b2',          // Cyan-600
            secondary: '#0e7490',        // Cyan-700
            accent: '#06b6d4',           // Cyan-500
            gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)'
        },
        typography: {
            headingClass: 'lp-heading-travel',
            bodyClass: 'lp-body-travel'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(8, 145, 178, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #0891b2, #06b6d4)',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(8, 145, 178, 0.3)'
            ].join('; '),
            inputStyle: [
                'width: 100%',
                'border-radius: 10px',
                'border: 1px solid #e5e7eb',
                'padding: 11px 12px',
                'font-size: 14px',
                'background-color: #f9fafb'
            ].join('; ')
        },
        logoExample: 'https://icon.horse/icon/booking.com'
    }
};

export interface IndustryDesign {
    industry: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        gradient: string; // can be used for backgrounds if needed
    };
    typography: {
        /**
         * Semantic heading style identifier (not a Tailwind class).
         * You can either ignore this or map it to your own CSS classes.
         */
        headingClass: string;
        /**
         * Semantic body style identifier (not a Tailwind class).
         */
        bodyClass: string;
    };
    patterns: {
        /**
         * Recommended inline-style snippet for cards (no frameworks).
         * Example usage:
         *   <div style={industryDesign.patterns.cardStyle}>...</div>
         */
        cardStyle: string;
        /**
         * Recommended inline-style snippet for primary buttons.
         */
        buttonStyle: string;
        /**
         * Recommended inline-style snippet for inputs.
         */
        inputStyle: string;
    };
    /**
     * Example logo URL for this industry (using alternative logo services).
     * This is just for reference; systemPrompt will still compute its own logo src.
     */
    logoExample: string;
}

/**
 * AI-based industry detection using LLM
 * Falls back to regex-based detection if AI fails
 *
 * @param fromName - Company/brand name
 * @param scenario - Scenario description
 * @param model - Optional AI model (defaults to default generation model)
 * @returns IndustryDesign - Complete design system for the industry
 */
async function detectIndustryWithAI(
    fromName: string,
    scenario: string,
    model?: any
): Promise<IndustryDesign | null> {
    try {
        const aiModel = model || getDefaultGenerationModel();

        const systemPrompt = `You are an expert at identifying company industries based on company names and business scenarios.

Your task is to classify the industry into one of these categories:
- Banking & Finance
- Technology
- Healthcare
- E-commerce
- Education
- Media & Entertainment
- Government
- Real Estate
- Hospitality & Travel
- Corporate (default for generic companies)

Return ONLY a valid JSON object with this structure:
{
  "industry": "one of the categories above"
}`;

        const examples = `Examples:

Banking & Finance: "PayPal", "Stripe", "Bank of America" → Banking & Finance
Technology: "Google", "Microsoft", "AWS" → Technology
Healthcare: "Mayo Clinic", "CVS", "UnitedHealth" → Healthcare
E-commerce: "Amazon", "eBay", "Shopify" → E-commerce
Education: "Coursera", "Udemy", "Khan Academy" → Education
Media & Entertainment: "Netflix", "Spotify", "YouTube" → Media & Entertainment
Government: "IRS", "Social Security", "DMV" → Government
Real Estate: "Zillow", "Redfin", "Realtor.com" → Real Estate
Hospitality & Travel: "Booking.com", "Airbnb", "Expedia" → Hospitality & Travel
Generic: "Acme Corp", "ABC Industries" → Corporate`;

        const userPrompt = `Company/Brand Name: ${fromName}
Scenario: ${scenario}

Based on the company name and scenario description, determine the most appropriate industry category.`;

        const response = await generateText({
            model: aiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${examples}\n\n${userPrompt}` }
            ],
            temperature: 0.3, // Low temperature for consistent classification
        });

        const cleanedJson = cleanResponse(response.text, 'industry-detection');
        const parsed = JSON.parse(cleanedJson);

        const detectedIndustry = parsed.industry;
        if (!detectedIndustry || typeof detectedIndustry !== 'string') {
            logger.warn('AI returned invalid industry name', { parsed });
            return null;
        }

        // Map detected industry to design system
        const designSystem = INDUSTRY_DESIGN_MAP[detectedIndustry];
        if (!designSystem) {
            logger.warn('Unknown industry detected by AI, using Corporate fallback', {
                detectedIndustry
            });
            return {
                industry: 'Corporate',
                ...INDUSTRY_DESIGN_MAP['Corporate']
            };
        }

        logger.info('AI detected industry successfully', { detectedIndustry });
        return {
            industry: detectedIndustry,
            ...designSystem
        };

    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn('AI industry detection failed, will use regex fallback', {
            error: err.message
        });
        return null;
    }
}

/**
 * Regex-based industry detection (fallback method)
 * Uses keyword matching to identify industry
 *
 * @param fromName - Company/brand name
 * @param scenario - Scenario description
 * @returns IndustryDesign - Complete design system for the industry
 */
function detectIndustryWithRegex(fromName: string, scenario: string): IndustryDesign {
    const text = `${fromName} ${scenario}`.toLowerCase();

    // Banking & Finance
    if (text.match(/bank|finance|payment|credit|investment|paypal|stripe|visa|mastercard|wallet|transaction|account/i)) {
        return {
            industry: 'Banking & Finance',
            ...INDUSTRY_DESIGN_MAP['Banking & Finance']
        };
    }

    // Technology & Software
    if (text.match(/tech|software|cloud|digital|app|platform|google|microsoft|apple|amazon|meta|developer|api|code|saas/i)) {
        return {
            industry: 'Technology',
            ...INDUSTRY_DESIGN_MAP['Technology']
        };
    }

    // Healthcare & Medical
    if (text.match(/health|medical|hospital|clinic|doctor|patient|pharmacy|medicine|care|wellness|insurance/i)) {
        return {
            industry: 'Healthcare',
            ...INDUSTRY_DESIGN_MAP['Healthcare']
        };
    }

    // E-commerce & Retail
    if (text.match(/shop|store|retail|ecommerce|cart|order|product|delivery|shipping|discount|sale|marketplace/i)) {
        return {
            industry: 'E-commerce',
            ...INDUSTRY_DESIGN_MAP['E-commerce']
        };
    }

    // Education
    if (text.match(/education|school|university|college|course|learning|student|teacher|academy|training|edtech/i)) {
        return {
            industry: 'Education',
            ...INDUSTRY_DESIGN_MAP['Education']
        };
    }

    // Media & Entertainment
    if (text.match(/media|entertainment|movie|film|tv|streaming|music|video|news|publisher|broadcast|channel/i)) {
        return {
            industry: 'Media & Entertainment',
            ...INDUSTRY_DESIGN_MAP['Media & Entertainment']
        };
    }

    // Government
    if (text.match(/government|federal|state|irs|dmv|social security|tax|voting|citizen|public service|municipal/i)) {
        return {
            industry: 'Government',
            ...INDUSTRY_DESIGN_MAP['Government']
        };
    }

    // Real Estate
    if (text.match(/real estate|realty|property|housing|home|apartment|rental|mortgage|realtor|zillow|redfin/i)) {
        return {
            industry: 'Real Estate',
            ...INDUSTRY_DESIGN_MAP['Real Estate']
        };
    }

    // Hospitality & Travel
    if (text.match(/hotel|travel|tourism|vacation|booking|reservation|airline|airport|hospitality|restaurant|dining/i)) {
        return {
            industry: 'Hospitality & Travel',
            ...INDUSTRY_DESIGN_MAP['Hospitality & Travel']
        };
    }

    // Default: Corporate/General
    return {
        industry: 'Corporate',
        ...INDUSTRY_DESIGN_MAP['Corporate']
    };
}

/**
 * Detect industry from company name and scenario keywords
 * Uses AI-first approach with regex fallback (3-level fallback pattern)
 *
 * @param fromName - Company/brand name
 * @param scenario - Scenario description
 * @param model - Optional AI model (if not provided, uses regex fallback only)
 * @returns IndustryDesign - Complete design system for the industry
 */
export async function detectIndustry(
    fromName: string,
    scenario: string,
    model?: any
): Promise<IndustryDesign> {
    // Level 1: Try AI-based detection if model is provided
    if (model) {
        const aiResult = await detectIndustryWithAI(fromName, scenario, model);
        if (aiResult) {
            return aiResult;
        }
        logger.debug('AI detection failed, using regex fallback');
    }

    // Level 2: Fallback to regex-based detection
    return detectIndustryWithRegex(fromName, scenario);
}

