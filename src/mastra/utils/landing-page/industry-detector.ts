/**
 * Industry detection and design system for landing pages
 * Automatically detects company industry and provides appropriate color schemes
 */

import { generateText, LanguageModel } from 'ai';
import { getLogger } from '../core/logger';
import { getDefaultGenerationModel } from '../../model-providers';
import { cleanResponse } from '../content-processors/json-cleaner';
import { normalizeError } from '../core/error-utils';
import { CLASSIFICATION_PARAMS } from '../config/llm-generation-params';

const logger = getLogger('IndustryDetector');

// Industry name to design system mapping
const getLogoDevToken = () => process.env.LOGO_DEV_TOKEN || 'LOGO_DEV_PUBLISHABLE_KEY';

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
        get logoExample() { return `https://img.logo.dev/jpmorganchase.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(bank|finance|payment|credit|investment|paypal|stripe|visa|mastercard|wallet|transaction|account)\b/i
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
                'background: #4285f4',
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
        get logoExample() { return `https://img.logo.dev/google.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(tech|software|cloud|digital|app|platform|google|microsoft|apple|amazon|meta|developer|api|code|saas)\b/i
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
                'background: #059669',
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
        get logoExample() { return `https://img.logo.dev/mayoclinic.org?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(health|medical|hospital|clinic|doctor|patient|pharmacy|medicine|care|wellness|insurance)\b/i
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
                'background: #ea580c',
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
        get logoExample() { return `https://img.logo.dev/amazon.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(shop|store|retail|ecommerce|cart|order|product|delivery|shipping|discount|sale|marketplace)\b/i
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
                'background: #334155',
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
        get logoExample() { return `https://img.logo.dev/accenture.com?token=${getLogoDevToken()}&size=96`; },
        keywords: null // Default fallback, no specific keywords
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
                'background: #7c3aed',
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
        get logoExample() { return `https://img.logo.dev/coursera.org?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(education|school|university|college|course|learning|student|teacher|academy|training|edtech)\b/i
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
                'background: #dc2626',
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
        get logoExample() { return `https://img.logo.dev/netflix.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(media|entertainment|movie|film|tv|streaming|music|video|news|publisher|broadcast|channel)\b/i
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
                'background: #1e40af',
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
        get logoExample() { return `https://img.logo.dev/usa.gov?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(government|federal|state|irs|dmv|social security|tax|voting|citizen|public service|municipal)\b/i
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
                'background: #c2410c',
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
        get logoExample() { return `https://img.logo.dev/zillow.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(real estate|realty|property|housing|home|apartment|rental|mortgage|realtor|zillow|redfin)\b/i
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
                'background: #0891b2',
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
        get logoExample() { return `https://img.logo.dev/booking.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(hotel|travel|tourism|vacation|booking|reservation|airline|airport|hospitality|restaurant|dining)\b/i
    },
    'Logistics & Delivery': {
        colors: {
            primary: '#92400e',          // Amber-800
            secondary: '#78350f',        // Amber-900
            accent: '#fbbf24',           // Amber-400
            gradient: 'linear-gradient(135deg, #92400e, #fbbf24)'
        },
        typography: {
            headingClass: 'lp-heading-logistics',
            bodyClass: 'lp-body-logistics'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(146, 64, 14, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: #92400e',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(146, 64, 14, 0.3)'
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
        get logoExample() { return `https://img.logo.dev/dhl.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(dhl|ups|fedex|shipping|package|parcel|tracking|courier|delivery|post|logistics)\b/i
    },
    'Social Media': {
        colors: {
            primary: '#0284c7',          // Sky-600
            secondary: '#0369a1',        // Sky-700
            accent: '#38bdf8',           // Sky-400
            gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)'
        },
        typography: {
            headingClass: 'lp-heading-social',
            bodyClass: 'lp-body-social'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(2, 132, 199, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: #0284c7',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3)'
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
        get logoExample() { return `https://img.logo.dev/linkedin.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(facebook|instagram|linkedin|twitter|tiktok|social|profile|connection|follower|post|snapchat)\b/i
    },
    'HR & Recruiting': {
        colors: {
            primary: '#4b5563',          // Gray-600
            secondary: '#374151',        // Gray-700
            accent: '#06b6d4',           // Cyan-500
            gradient: 'linear-gradient(135deg, #4b5563, #06b6d4)'
        },
        typography: {
            headingClass: 'lp-heading-hr',
            bodyClass: 'lp-body-hr'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(75, 85, 99, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: #4b5563',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(75, 85, 99, 0.3)'
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
        get logoExample() { return `https://img.logo.dev/workday.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(hr|human resources|recruiting|hiring|job|payroll|salary|interview|career|workday|onboarding)\b/i
    },
    'Utilities & Energy': {
        colors: {
            primary: '#d97706',          // Amber-600
            secondary: '#b45309',        // Amber-700
            accent: '#f59e0b',           // Amber-500
            gradient: 'linear-gradient(135deg, #d97706, #f59e0b)'
        },
        typography: {
            headingClass: 'lp-heading-util',
            bodyClass: 'lp-body-util'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(217, 119, 6, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: #d97706',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3)'
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
        get logoExample() { return `https://img.logo.dev/britishgas.co.uk?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(electricity|water|gas|energy|utility|bill|invoice|power|heating|electric|infrastructure)\b/i
    },
    'Telecommunications': {
        colors: {
            primary: '#db2777',          // Pink-600
            secondary: '#be185d',        // Pink-700
            accent: '#f472b6',           // Pink-400
            gradient: 'linear-gradient(135deg, #db2777, #8b5cf6)'
        },
        typography: {
            headingClass: 'lp-heading-telecom',
            bodyClass: 'lp-body-telecom'
        },
        patterns: {
            cardStyle: [
                'background-color: #ffffff',
                'border-radius: 18px',
                'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1)',
                'border: 1px solid rgba(219, 39, 119, 0.12)',
                'padding: 32px',
                'max-width: 420px',
                'margin: 0 auto'
            ].join('; '),
            buttonStyle: [
                'background: #db2777',
                'color: #ffffff',
                'border-radius: 8px',
                'padding: 12px 24px',
                'font-weight: 600',
                'font-size: 14px',
                'border: none',
                'cursor: pointer',
                'transition: all 0.2s ease',
                'box-shadow: 0 4px 12px rgba(219, 39, 119, 0.3)'
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
        get logoExample() { return `https://img.logo.dev/t-mobile.com?token=${getLogoDevToken()}&size=96`; },
        keywords: /\b(telecom|internet|mobile|phone|cellular|data plan|fiber|broadband|wifi|5g|4g|sim card|carrier|roaming)\b/i
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
    /**
     * Regex keywords for industry detection fallback
     */
    keywords?: RegExp | null;
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
    model?: LanguageModel
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
- Logistics & Delivery
- Social Media
- HR & Recruiting
- Utilities & Energy
- Telecommunications
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
Logistics & Delivery: "DHL", "FedEx", "UPS", "Post" → Logistics & Delivery
Social Media: "Facebook", "LinkedIn", "Instagram", "Twitter" → Social Media
HR & Recruiting: "Workday", "ADP", "Indeed" → HR & Recruiting
Utilities & Energy: "British Gas", "PG&E", "Electrical" → Utilities & Energy
Telecommunications: "AT&T", "Verizon", "T-Mobile", "Vodafone" → Telecommunications
Generic: "Acme Corp", "ABC Industries" → Corporate
`;

        const userPrompt = `Company/Brand Name: ${fromName}
Scenario: ${scenario}

Based on the company name and scenario description, determine the most appropriate industry category.`;

        const response = await generateText({
            model: aiModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${examples}\n\n${userPrompt}` }
            ],
            ...CLASSIFICATION_PARAMS,
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
        const err = normalizeError(error);
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

    let bestMatch: string = 'Corporate';
    let maxMatches = 0;

    // Iterate through all industries and count keyword matches
    for (const [industry, design] of Object.entries(INDUSTRY_DESIGN_MAP)) {
        if (!design.keywords) continue;

        // Use match with global flag to count all occurrences, but since we store regex without global flag in map,
        // we essentially check availability now. For better scoring, we re-create regex with 'g'
        const source = design.keywords.source;
        // The original regex has \b wrappers, so we can use match directly
        // However, a simple match returns null or array. 
        // To score, we can count how many unique keywords from the group matched

        const match = text.match(design.keywords);
        if (match) {
            // Basic scoring: Length of the match or just 1 for presence
            // Let's improve scoring: Count total number of keyword hits
            // We'll create a global regex from the source to count all hits
            const globalRegex = new RegExp(source, 'gi');
            const allMatches = text.match(globalRegex);
            const score = allMatches ? allMatches.length : 0;

            // Tie-breaker: If scores are equal, prefer the one with longer matched string (more specific)
            // But simple count is usually enough. 
            // Priority override: Utilities > Finance for "bill payment"
            // Since we scan all, if Utilities has 2 matches (electricity, bill) and finance has 1 (payment), Utilities wins.

            if (score > maxMatches) {
                maxMatches = score;
                bestMatch = industry;
            }
        }
    }

    return {
        industry: bestMatch,
        ...INDUSTRY_DESIGN_MAP[bestMatch]
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
    model?: LanguageModel
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

