/**
 * Security Utilities
 *
 * Utilities for secure logging and data masking to prevent sensitive information
 * from appearing in logs or being exposed in error messages.
 *
 * Masking Strategy:
 * - Use [REDACTED_FIELDTYPE] format for all sensitive data
 * - Do NOT show any visible characters from actual secrets
 * - Prevents attackers from identifying patterns or partial credentials
 *
 * Usage:
 * ```typescript
 * const maskedPayload = maskSensitiveField(payload, 'accessToken');
 * logger.debug('Payload prepared', { payload: maskedPayload });
 * ```
 */

/**
 * Masks a sensitive field in an object for safe logging
 * Replaces sensitive value with [REDACTED_FIELDNAME]
 *
 * @param payload - The object containing the sensitive field
 * @param fieldName - Name of the sensitive field to mask (e.g., 'accessToken', 'apiKey', 'password')
 * @returns New object with the sensitive field masked
 *
 * @example
 * ```typescript
 * const payload = { id: '123', accessToken: 'secret-token-abc123xyz' };
 * const masked = maskSensitiveField(payload, 'accessToken');
 * // Result: { id: '123', accessToken: '[REDACTED_ACCESSTOKEN]' }
 * ```
 */
export function maskSensitiveField<T extends Record<string, any>>(
  payload: T,
  fieldName: string,
  _value?: string  // _value parameter kept for backward compatibility but not used
): T {
  return {
    ...payload,
    [fieldName]: `[REDACTED_${fieldName.toUpperCase()}]`,
  };
}

/**
 * Masks an email address for safe logging
 * Hides local part, shows domain suffix
 *
 * @example
 * 'john.doe@company.com' → '[REDACTED_EMAIL@company.com]'
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '[REDACTED_EMAIL]';
  }

  const [, domain] = email.split('@');
  return `[REDACTED_EMAIL@${domain}]`;
}

/**
 * Masks a phone number for safe logging
 * Shows only country code and last 2 digits
 *
 * @example
 * '+1-555-123-4567' → '+1-[REDACTED]-67'
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return '[REDACTED_PHONE]';
  }

  // Keep first 2 and last 2 characters (usually country code and last digits)
  const lastTwo = phone.slice(-2);
  return `${phone.slice(0, 2)}-[REDACTED]-${lastTwo}`;
}

/**
 * Masks a URL's sensitive query parameters
 * Keeps domain, redacts everything after ?
 *
 * @example
 * 'https://api.example.com/path?token=secret&key=value' → 'https://api.example.com/path?[REDACTED_PARAMS]'
 */
export function maskUrlParams(url: string): string {
  const index = url.indexOf('?');
  if (index === -1) {
    return url;
  }
  return url.substring(0, index) + '?[REDACTED_PARAMS]';
}

/**
 * Deeply redacts sensitive fields from an object recursively
 * Useful for masking entire payloads
 *
 * @param obj - Object to redact
 * @param sensitiveKeys - Field names to redact (case-insensitive)
 * @returns New object with sensitive fields masked
 *
 * @example
 * ```typescript
 * const payload = {
 *   user: { email: 'john@example.com', apiKey: 'secret' },
 *   token: 'abc123xyz'
 * };
 * const masked = deepRedact(payload, ['apiKey', 'token', 'email']);
 * // All nested matching keys are masked
 * ```
 */
export function deepRedact(
  obj: any,
  sensitiveKeys: string[] = ['token', 'apiKey', 'accessToken', 'password', 'secret', 'email', 'phone']
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepRedact(item, sensitiveKeys));
  }

  const redacted: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => keyLower.includes(sk.toLowerCase()));

    if (isSensitive) {
      redacted[key] = `[REDACTED_${key.toUpperCase()}]`;
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = deepRedact(value, sensitiveKeys);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Masks HTTP headers for safe logging
 * Redacts: Authorization, X-API-Key, X-AGENTIC-ALLY-TOKEN, cookies, etc.
 *
 * @param headers - HTTP headers object
 * @returns Safe headers object for logging
 *
 * @example
 * ```typescript
 * const safeHeaders = maskHeaders({
 *   'authorization': 'Bearer secret-token',
 *   'user-agent': 'Mozilla/5.0'
 * });
 * // Result: { authorization: '[REDACTED_AUTHORIZATION]', 'user-agent': 'Mozilla/5.0' }
 * ```
 */
export function maskHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const sensitiveHeaderPatterns = [
    'authorization',
    'x-api-key',
    'x-agentic-ally-token',
    'x-company-id',
    'x-base-api-url',
    'x-correlation-id',
    'cookie',
    'set-cookie',
    'x-auth-token',
    'x-access-token',
  ];

  const masked: Record<string, string | string[] | undefined> = {};

  for (const [key, value] of Object.entries(headers)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveHeaderPatterns.some(pattern => keyLower.includes(pattern));

    if (isSensitive) {
      masked[key] = `[REDACTED_${key.toUpperCase()}]`;
    } else {
      masked[key] = value;
    }
  }

  return masked;
}