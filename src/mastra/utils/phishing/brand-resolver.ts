import { generateText } from 'ai';
import { DEFAULT_GENERIC_LOGO } from '../landing-page/image-validator';

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
  model: any,
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
      temperature: 0.1 // Low temperature for deterministic extraction
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
          const clearbitUrl = `https://logo.clearbit.com/${cleanDomain}`;
          const brandColors = parsed.brandColors || null;
          console.log(`🎨 Resolved logo URL for brand "${brandName || fromName}": ${clearbitUrl}${brandColors ? ` with colors: ${JSON.stringify(brandColors)}` : ''}`);
          return {
            logoUrl: clearbitUrl,
            brandName: brandName || fromName,
            isRecognizedBrand: true,
            brandColors: brandColors || undefined
          };
        }
      }
    }

    // Fallback to default logo for generic/internal companies
    console.log(`ℹ️ No recognized brand found for "${fromName}", using default logo`);
    return {
      logoUrl: DEFAULT_GENERIC_LOGO,
      brandName: null,
      isRecognizedBrand: false
    };
  } catch (error) {
    console.warn('⚠️ Logo and brand resolution failed, using default logo:', error);
    return {
      logoUrl: DEFAULT_GENERIC_LOGO,
      brandName: null,
      isRecognizedBrand: false
    };
  }
}


