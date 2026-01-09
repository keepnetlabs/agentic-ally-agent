/**
 * URL Validation Utilities
 *
 * Validates request URLs (X-BASE-API-URL header) against allowed list
 * Prevents misconfigurations and SSRF attacks via header injection
 */

import { API_ENDPOINTS } from '../../constants';
import { getLogger } from './logger';

const logger = getLogger('UrlValidator');

/**
 * Validates a base API URL against the allowed list
 * Returns the validated URL or default fallback
 *
 * @param headerUrl - URL from X-BASE-API-URL header (optional)
 * @returns Validated URL or default
 *
 * @example
 * const baseApiUrl = validateBaseApiUrl(req.header('X-BASE-API-URL'));
 * // Returns: 'https://dash.keepnetlabs.com' or 'https://test-api.devkeepnet.com' or default
 */
export function validateBaseApiUrl(headerUrl?: string): string {
  // No header provided → use default
  if (!headerUrl) {
    logger.debug('No X-BASE-API-URL header provided, using default', {
      defaultUrl: API_ENDPOINTS.DEFAULT_BASE_API_URL
    });
    return API_ENDPOINTS.DEFAULT_BASE_API_URL;
  }

  const trimmedUrl = headerUrl.trim();

  // Validate URL format (must be valid URL, not arbitrary string)
  try {
    new URL(trimmedUrl);
  } catch (error) {
    logger.warn('Invalid URL format in X-BASE-API-URL header, using default', {
      headerUrl: trimmedUrl,
      error: (error as Error).message,
      defaultUrl: API_ENDPOINTS.DEFAULT_BASE_API_URL
    });
    return API_ENDPOINTS.DEFAULT_BASE_API_URL;
  }

  // Check against allowed list
  const isAllowed = API_ENDPOINTS.ALLOWED_BASE_API_URLS.some(
    (allowedUrl) => allowedUrl.toLowerCase() === trimmedUrl.toLowerCase()
  );

  if (!isAllowed) {
    logger.warn('X-BASE-API-URL not in allowed list, using default', {
      headerUrl: trimmedUrl,
      allowedUrls: API_ENDPOINTS.ALLOWED_BASE_API_URLS,
      defaultUrl: API_ENDPOINTS.DEFAULT_BASE_API_URL
    });
    return API_ENDPOINTS.DEFAULT_BASE_API_URL;
  }

  // URL is valid and allowed
  logger.debug('Valid X-BASE-API-URL header accepted', {
    url: trimmedUrl
  });
  return trimmedUrl;
}

/**
 * Type guard: check if URL is in allowed list
 * Useful for TypeScript assertions
 *
 * @param url - URL to check
 * @returns true if URL is allowed, false otherwise
 */
export function isAllowedBaseApiUrl(url: string): boolean {
  return API_ENDPOINTS.ALLOWED_BASE_API_URLS.some(
    (allowedUrl) => allowedUrl.toLowerCase() === url.toLowerCase()
  );
}

/**
 * Get list of allowed base API URLs (for documentation/debugging)
 * @returns Array of allowed URLs
 */
export function getAllowedBaseApiUrls(): readonly string[] {
  return API_ENDPOINTS.ALLOWED_BASE_API_URLS;
}
