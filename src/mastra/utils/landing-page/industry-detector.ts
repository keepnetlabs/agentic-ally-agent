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
        gradient: string;
    };
    typography: {
        headingClass: string;
        bodyClass: string;
    };
    patterns: {
        cardStyle: string;
        buttonStyle: string;
        inputStyle: string;
    };
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
                primary: '#1e3a8a', // Deep blue
                secondary: '#1f2937', // Slate gray
                accent: '#f59e0b', // Gold
                gradient: 'from-blue-900 via-blue-700 to-blue-600'
            },
            typography: {
                headingClass: 'font-serif font-bold',
                bodyClass: 'font-sans'
            },
            patterns: {
                cardStyle: 'bg-white rounded-2xl shadow-2xl shadow-blue-900/20 border border-blue-100',
                buttonStyle: 'bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold px-6 py-3 rounded-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300',
                inputStyle: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all'
            },
            logoExample: 'https://via.placeholder.com/150x50/1e3a8a/ffffff?text=Bank+Logo'
        };
    }

    // Technology & Software
    if (text.match(/tech|software|cloud|digital|app|platform|google|microsoft|apple|amazon|meta|developer|api|code|saas/i)) {
        return {
            industry: 'Technology',
            colors: {
                primary: '#4285f4', // Google blue
                secondary: '#5f6368', // Gray
                accent: '#ea4335', // Red
                gradient: 'from-blue-500 via-purple-500 to-pink-500'
            },
            typography: {
                headingClass: 'font-sans font-bold',
                bodyClass: 'font-sans'
            },
            patterns: {
                cardStyle: 'bg-white rounded-3xl shadow-2xl shadow-purple-500/10',
                buttonStyle: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold px-6 py-3 rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-200',
                inputStyle: 'w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 outline-none transition-all'
            },
            logoExample: 'https://via.placeholder.com/150x50/4285f4/ffffff?text=Tech+Co'
        };
    }

    // Healthcare & Medical
    if (text.match(/health|medical|hospital|clinic|doctor|patient|pharmacy|medicine|care|wellness|insurance/i)) {
        return {
            industry: 'Healthcare',
            colors: {
                primary: '#059669', // Medical green
                secondary: '#0d9488', // Teal
                accent: '#06b6d4', // Cyan
                gradient: 'from-emerald-600 via-teal-600 to-cyan-600'
            },
            typography: {
                headingClass: 'font-sans font-semibold',
                bodyClass: 'font-sans'
            },
            patterns: {
                cardStyle: 'bg-white rounded-2xl shadow-2xl shadow-emerald-500/10 border border-emerald-50',
                buttonStyle: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all',
                inputStyle: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all'
            },
            logoExample: 'https://via.placeholder.com/150x50/059669/ffffff?text=Health+Co'
        };
    }

    // E-commerce & Retail
    if (text.match(/shop|store|retail|ecommerce|cart|order|product|delivery|shipping|discount|sale|marketplace/i)) {
        return {
            industry: 'E-commerce',
            colors: {
                primary: '#ff6600', // Orange
                secondary: '#16a34a', // Green
                accent: '#eab308', // Yellow
                gradient: 'from-orange-500 via-amber-500 to-yellow-500'
            },
            typography: {
                headingClass: 'font-sans font-bold',
                bodyClass: 'font-sans'
            },
            patterns: {
                cardStyle: 'bg-white rounded-2xl shadow-2xl shadow-orange-500/10',
                buttonStyle: 'bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold px-6 py-3 rounded-lg hover:shadow-xl hover:scale-[1.02] transition-all',
                inputStyle: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all'
            },
            logoExample: 'https://via.placeholder.com/150x50/ff6600/ffffff?text=Shop+Logo'
        };
    }

    // Default: Corporate/General
    return {
        industry: 'Corporate',
        colors: {
            primary: '#334155', // Slate
            secondary: '#64748b', // Slate-500
            accent: '#0ea5e9', // Sky blue
            gradient: 'from-slate-700 via-slate-600 to-slate-500'
        },
        typography: {
            headingClass: 'font-sans font-bold',
            bodyClass: 'font-sans'
        },
        patterns: {
            cardStyle: 'bg-white rounded-2xl shadow-2xl shadow-slate-500/10',
            buttonStyle: 'bg-gradient-to-r from-slate-700 to-slate-900 text-white font-semibold px-6 py-3 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all',
            inputStyle: 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-slate-500 focus:ring-4 focus:ring-slate-500/20 outline-none transition-all'
        },
        logoExample: 'https://via.placeholder.com/150x50/334155/ffffff?text=Company'
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
