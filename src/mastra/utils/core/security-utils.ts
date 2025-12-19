/**
 * Security Utilities
 * 
 * Utilities for secure logging and data masking to prevent sensitive information
 * from appearing in logs or being exposed in error messages.
 * 
 * Usage:
 * ```typescript
 * const maskedPayload = maskSensitiveField(payload, 'accessToken', token);
 * logger.debug('Payload prepared', { payload: maskedPayload });
 * ```
 */

/**
 * Masks a sensitive field in an object for safe logging
 * Shows first 8 characters and last 4 characters, with "..." in between
 * 
 * @param payload - The object containing the sensitive field
 * @param fieldName - Name of the sensitive field to mask (e.g., 'accessToken', 'apiKey')
 * @param value - The actual sensitive value (if not provided, field will be undefined in masked object)
 * @returns New object with the sensitive field masked
 * 
 * @example
 * ```typescript
 * const payload = { id: '123', accessToken: 'secret-token-abc123xyz' };
 * const masked = maskSensitiveField(payload, 'accessToken', payload.accessToken);
 * // Result: { id: '123', accessToken: 'secret-t...xyz' }
 * ```
 */
export function maskSensitiveField<T extends Record<string, any>>(
  payload: T,
  fieldName: string,
  value?: string
): T {
  if (!value) {
    return {
      ...payload,
      [fieldName]: undefined,
    };
  }

  if (value.length <= 12) {
    // If value is too short, just show asterisks
    return {
      ...payload,
      [fieldName]: '***',
    };
  }

  return {
    ...payload,
    [fieldName]: `${value.substring(0, 8)}...${value.substring(value.length - 4)}`,
  };
}