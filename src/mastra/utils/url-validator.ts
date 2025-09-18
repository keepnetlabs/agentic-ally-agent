/**
 * URL validation utility for microlearning resources
 * Validates URLs from trusted cybersecurity authorities
 */

const TRUSTED_DOMAINS = [
  'ncsc.gov.uk',      // UK National Cyber Security Centre
  'cisa.gov',         // US Cybersecurity and Infrastructure Security Agency
  'nist.gov'          // US National Institute of Standards and Technology
];

/**
 * Validates if a URL is from a trusted domain and accessible
 * @param url - The URL to validate
 * @returns Promise<boolean> - True if valid and accessible
 */
export async function validateResourceUrl(url: string): Promise<boolean> {
  try {
    // Parse URL
    const urlObj = new URL(url);

    // Check if domain is in trusted list
    const isValidDomain = TRUSTED_DOMAINS.some(domain =>
      urlObj.hostname.includes(domain)
    );

    if (!isValidDomain) {
      console.warn(`⚠️ URL validation failed: Untrusted domain ${urlObj.hostname}`);
      return false;
    }

    // Check if URL is accessible (HEAD request)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`✅ URL validation passed: ${url}`);
      return true;
    } else {
      console.warn(`⚠️ URL validation failed: HTTP ${response.status} for ${url}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ URL validation error: ${error} for ${url}`);
    return false;
  }
}

/**
 * Gets a fallback URL for a given topic
 * @param topic - The training topic
 * @returns string - Fallback URL
 */
export function getFallbackUrl(topic: string): string {
  const topicLower = topic.toLowerCase();

  // Technical standards and guidelines (passwords, cryptography, etc.)
  if (topicLower.includes('password') || topicLower.includes('crypto') ||
      topicLower.includes('encryption') || topicLower.includes('standard')) {
    return 'https://www.nist.gov/cybersecurity';
  }

  // UK-specific guidance or general security awareness
  if (topicLower.includes('awareness') || topicLower.includes('training') ||
      topicLower.includes('education') || topicLower.includes('phishing') ||
      topicLower.includes('email')) {
    return 'https://www.ncsc.gov.uk/';
  }

  // Infrastructure, incident response, critical systems
  if (topicLower.includes('incident') || topicLower.includes('infrastructure') ||
      topicLower.includes('critical') || topicLower.includes('response') ||
      topicLower.includes('supply chain') || topicLower.includes('industrial')) {
    return 'https://www.cisa.gov/topics';
  }

  // Default fallback - CISA cybersecurity main page
  return 'https://www.cisa.gov/cybersecurity';
}

/**
 * Validates URL and returns valid URL or fallback
 * @param url - AI suggested URL
 * @param topic - Training topic for fallback
 * @returns Promise<string> - Valid URL or fallback
 */
export async function validateOrFallback(url: string, topic: string): Promise<string> {
  const isValid = await validateResourceUrl(url);

  if (isValid) {
    return url;
  } else {
    const fallback = getFallbackUrl(topic);
    console.log(`🔄 Using fallback URL for ${topic}: ${fallback}`);
    return fallback;
  }
}