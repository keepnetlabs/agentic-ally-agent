/**
 * Industry detection and design system for landing pages
 * Automatically detects company industry and provides appropriate color schemes
 */

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
     * Example logo URL for this industry (Clearbit, no placeholder.com).
     * This is just for reference; systemPrompt will still compute its own logo src.
     */
    logoExample: string;
}

/**
 * Detect industry from company name and scenario keywords
 * Returns appropriate design system for the detected industry
 *
 * @param fromName - Company/brand name
 * @param scenario - Scenario description
 * @returns IndustryDesign - Complete design system for the industry
 */
export function detectIndustry(fromName: string, scenario: string): IndustryDesign {
    const text = `${fromName} ${scenario}`.toLowerCase();

    // Banking & Finance
    if (text.match(/bank|finance|payment|credit|investment|paypal|stripe|visa|mastercard|wallet|transaction|account/i)) {
        return {
            industry: 'Banking & Finance',
            colors: {
                primary: '#1e3a8a',      // Deep blue
                secondary: '#1f2937',    // Slate gray
                accent: '#f59e0b',       // Gold
                gradient: 'linear-gradient(135deg, #0f172a, #1e3a8a)' // Dark to deep blue
            },
            typography: {
                headingClass: 'lp-heading-bank', // semantic, not Tailwind
                bodyClass: 'lp-body-bank'
            },
            patterns: {
                cardStyle: [
                    'background-color: #ffffff',
                    'border-radius: 18px',
                    'box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18)',
                    'border: 1px solid rgba(30, 64, 175, 0.12)',
                    'padding: 32px',
                    'max-width: 420px',
                    'margin: 0 auto'
                ].join('; '),
                buttonStyle: [
                    `background: #1e3a8a`,
                    'color: #ffffff',
                    'border-radius: 999px',
                    'padding: 12px 18px',
                    'font-weight: 600',
                    'font-size: 14px',
                    'border: none',
                    'cursor: pointer',
                    'box-shadow: 0 16px 30px rgba(15, 23, 42, 0.35)'
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
            // Example large bank
            logoExample: 'https://logo.clearbit.com/jpmorganchase.com'
        };
    }

    // Technology & Software
    if (text.match(/tech|software|cloud|digital|app|platform|google|microsoft|apple|amazon|meta|developer|api|code|saas/i)) {
        return {
            industry: 'Technology',
            colors: {
                primary: '#4285f4',      // Google blue
                secondary: '#5f6368',    // Neutral gray
                accent: '#ea4335',       // Red
                gradient: 'linear-gradient(135deg, #4285f4, #a855f7)'
            },
            typography: {
                headingClass: 'lp-heading-tech',
                bodyClass: 'lp-body-tech'
            },
            patterns: {
                cardStyle: [
                    'background-color: #ffffff',
                    'border-radius: 20px',
                    'box-shadow: 0 24px 60px rgba(79, 70, 229, 0.18)',
                    'border: 1px solid rgba(148, 163, 184, 0.18)',
                    'padding: 32px',
                    'max-width: 440px',
                    'margin: 0 auto'
                ].join('; '),
                buttonStyle: [
                    'background: linear-gradient(135deg, #4285f4, #8b5cf6)',
                    'color: #ffffff',
                    'border-radius: 999px',
                    'padding: 12px 20px',
                    'font-weight: 700',
                    'font-size: 14px',
                    'border: none',
                    'cursor: pointer',
                    'box-shadow: 0 18px 36px rgba(55, 48, 163, 0.35)'
                ].join('; '),
                inputStyle: [
                    'width: 100%',
                    'border-radius: 12px',
                    'border: 1px solid #e5e7eb',
                    'padding: 11px 12px',
                    'font-size: 14px',
                    'background-color: #f9fafb'
                ].join('; ')
            },
            logoExample: 'https://logo.clearbit.com/google.com'
        };
    }

    // Healthcare & Medical
    if (text.match(/health|medical|hospital|clinic|doctor|patient|pharmacy|medicine|care|wellness|insurance/i)) {
        return {
            industry: 'Healthcare',
            colors: {
                primary: '#059669',      // Medical green
                secondary: '#0d9488',    // Teal
                accent: '#06b6d4',       // Cyan
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
                    'box-shadow: 0 24px 60px rgba(16, 185, 129, 0.18)',
                    'border: 1px solid rgba(16, 185, 129, 0.12)',
                    'padding: 32px',
                    'max-width: 420px',
                    'margin: 0 auto'
                ].join('; '),
                buttonStyle: [
                    'background: linear-gradient(135deg, #059669, #0d9488)',
                    'color: #ffffff',
                    'border-radius: 999px',
                    'padding: 12px 18px',
                    'font-weight: 600',
                    'font-size: 14px',
                    'border: none',
                    'cursor: pointer',
                    'box-shadow: 0 16px 30px rgba(15, 118, 110, 0.35)'
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
            logoExample: 'https://logo.clearbit.com/mayoclinic.org'
        };
    }

    // E-commerce & Retail
    if (text.match(/shop|store|retail|ecommerce|cart|order|product|delivery|shipping|discount|sale|marketplace/i)) {
        return {
            industry: 'E-commerce',
            colors: {
                primary: '#ff6600',      // Orange
                secondary: '#16a34a',    // Green
                accent: '#eab308',       // Yellow
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
                    'box-shadow: 0 24px 60px rgba(248, 115, 22, 0.18)',
                    'border: 1px solid rgba(248, 115, 22, 0.12)',
                    'padding: 32px',
                    'max-width: 420px',
                    'margin: 0 auto'
                ].join('; '),
                buttonStyle: [
                    'background: linear-gradient(135deg, #ea580c, #f97316)',
                    'color: #ffffff',
                    'border-radius: 12px',
                    'padding: 12px 18px',
                    'font-weight: 700',
                    'font-size: 14px',
                    'border: none',
                    'cursor: pointer',
                    'box-shadow: 0 16px 30px rgba(180, 83, 9, 0.35)'
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
            logoExample: 'https://logo.clearbit.com/amazon.com'
        };
    }

    // Default: Corporate/General
    return {
        industry: 'Corporate',
        colors: {
            primary: '#334155',          // Slate
            secondary: '#64748b',        // Slate-500
            accent: '#0ea5e9',           // Sky blue
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
                'box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16)',
                'border: 1px solid rgba(148, 163, 184, 0.18)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: linear-gradient(135deg, #334155, #020617)',
                'color: #ffffff',
                'border-radius: 999px',
                'padding: 12px 18px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'box-shadow: 0 16px 30px rgba(15, 23, 42, 0.35)'
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
        logoExample: 'https://logo.clearbit.com/accenture.com'
    };
}

/**
 * Get list of all supported industries
 */
export function getSupportedIndustries(): string[] {
    return [
        'Banking & Finance',
        'Technology',
        'Healthcare',
        'E-commerce',
        'Corporate'
    ];
}

/**
 * Get industry-specific keywords for testing/validation
 */
export function getIndustryKeywords(industry: string): string[] {
    const keywordsMap: Record<string, string[]> = {
        'Banking & Finance': ['bank', 'finance', 'payment', 'credit', 'investment'],
        'Technology': ['tech', 'software', 'cloud', 'digital', 'saas'],
        'Healthcare': ['health', 'medical', 'hospital', 'doctor', 'patient'],
        'E-commerce': ['shop', 'store', 'retail', 'cart', 'order'],
        'Corporate': ['company', 'business', 'enterprise', 'organization']
    };

    return keywordsMap[industry] || [];
}
