import { describe, it, expect } from 'vitest';
import {
  maskSensitiveField,
  maskEmail,
  maskPhone,
  maskUrlParams,
  deepRedact,
  maskHeaders
} from './security-utils';

/**
 * Test Suite: Security Utilities
 * Tests for sensitive data masking in logging and error messages
 * Covers: Token masking, email masking, phone masking, URL params, recursive redaction, header masking
 */

describe('security-utils', () => {
  describe('maskSensitiveField', () => {
    it('should fully redact token field with [REDACTED_FIELDNAME] format', () => {
      const payload = { id: '123', token: 'secret-token-abc123xyz' };
      const result = maskSensitiveField(payload, 'token');

      expect(result.token).toBe('[REDACTED_TOKEN]');
    });

    it('should preserve other fields unchanged', () => {
      const payload = { id: '123', name: 'John', token: 'secret123' };
      const result = maskSensitiveField(payload, 'token');

      expect(result.id).toBe('123');
      expect(result.name).toBe('John');
    });

    it('should return new object (not mutate original)', () => {
      const payload = { id: '123', token: 'secret-token' };
      const result = maskSensitiveField(payload, 'token');

      expect(result).not.toBe(payload);
      expect(payload.token).toBe('secret-token');
    });

    it('should work with accessToken field', () => {
      const payload = { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' };
      const result = maskSensitiveField(payload, 'accessToken');

      expect(result.accessToken).toBe('[REDACTED_ACCESSTOKEN]');
    });

    it('should work with apiKey field', () => {
      const payload = { apiKey: 'sk-1234567890abcdefgh' };
      const result = maskSensitiveField(payload, 'apiKey');

      expect(result.apiKey).toBe('[REDACTED_APIKEY]');
    });

    it('should work with password field', () => {
      const payload = { password: 'MySecurePassword123!' };
      const result = maskSensitiveField(payload, 'password');

      expect(result.password).toBe('[REDACTED_PASSWORD]');
    });

    it('should preserve generic object properties', () => {
      const payload = {
        userId: '123',
        email: 'user@example.com',
        token: 'secret-token-abc123xyz',
        role: 'admin'
      };

      const result = maskSensitiveField(payload, 'token');

      expect(result.userId).toBe('123');
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe('admin');
      expect(result.token).toBe('[REDACTED_TOKEN]');
    });

    it('should be deterministic', () => {
      const token = 'secret-token-abc123xyz';
      const payload = { token };

      const result1 = maskSensitiveField(payload, 'token');
      const result2 = maskSensitiveField(payload, 'token');

      expect(result1.token).toBe(result2.token);
      expect(result1.token).toBe('[REDACTED_TOKEN]');
    });

    it('should create independent objects', () => {
      const originalPayload = { id: '123', token: 'secret-token-abc123xyz' };
      const result = maskSensitiveField(originalPayload, 'token');

      result.id = '456';

      expect(originalPayload.id).toBe('123');
      expect(result.id).toBe('456');
    });

    it('should uppercase field name in redaction', () => {
      const payload = { mySecretField: 'value' };
      const result = maskSensitiveField(payload, 'mySecretField');

      expect(result.mySecretField).toBe('[REDACTED_MYSECRETFIELD]');
    });

    it('should ignore _value parameter (kept for backward compatibility)', () => {
      const payload = { token: 'secret-token' };
      const result = maskSensitiveField(payload, 'token', 'ignored-value');

      expect(result.token).toBe('[REDACTED_TOKEN]');
    });
  });

  describe('maskEmail', () => {
    it('should mask email showing domain only', () => {
      const result = maskEmail('john.doe@company.com');

      expect(result).toBe('[REDACTED_EMAIL@company.com]');
    });

    it('should handle multiple dots in domain', () => {
      const result = maskEmail('user@mail.subdomain.company.co.uk');

      expect(result).toBe('[REDACTED_EMAIL@mail.subdomain.company.co.uk]');
    });

    it('should handle plus addressing', () => {
      const result = maskEmail('user+tag@example.com');

      expect(result).toBe('[REDACTED_EMAIL@example.com]');
    });

    it('should return fully redacted for invalid email (no @)', () => {
      const result = maskEmail('invalid-email');

      expect(result).toBe('[REDACTED_EMAIL]');
    });

    it('should return fully redacted for empty string', () => {
      const result = maskEmail('');

      expect(result).toBe('[REDACTED_EMAIL]');
    });

    it('should handle common domains', () => {
      expect(maskEmail('test@gmail.com')).toBe('[REDACTED_EMAIL@gmail.com]');
      expect(maskEmail('user@outlook.com')).toBe('[REDACTED_EMAIL@outlook.com]');
      expect(maskEmail('admin@example.org')).toBe('[REDACTED_EMAIL@example.org]');
    });
  });

  describe('maskPhone', () => {
    it('should show country code and last 2 digits', () => {
      const result = maskPhone('+1-555-123-4567');

      expect(result).toBe('+1-[REDACTED]-67');
    });

    it('should handle standard 10 digit US format', () => {
      const result = maskPhone('555-123-4567');

      expect(result).toBe('55-[REDACTED]-67');
    });

    it('should handle international format', () => {
      const result = maskPhone('+44-20-7946-0958');

      expect(result).toBe('+4-[REDACTED]-58');
    });

    it('should return fully redacted for short numbers', () => {
      const result = maskPhone('123');

      expect(result).toBe('[REDACTED_PHONE]');
    });

    it('should return fully redacted for empty string', () => {
      const result = maskPhone('');

      expect(result).toBe('[REDACTED_PHONE]');
    });

    it('should handle number with extension', () => {
      const result = maskPhone('555-1234-5678-9999');

      expect(result).toBe('55-[REDACTED]-99');
    });
  });

  describe('maskUrlParams', () => {
    it('should redact query parameters', () => {
      const result = maskUrlParams('https://api.example.com/path?token=secret&key=value');

      expect(result).toBe('https://api.example.com/path?[REDACTED_PARAMS]');
    });

    it('should return URL unchanged if no query params', () => {
      const result = maskUrlParams('https://api.example.com/path');

      expect(result).toBe('https://api.example.com/path');
    });

    it('should handle multiple params', () => {
      const result = maskUrlParams('https://example.com/api?id=123&token=abc&secret=xyz');

      expect(result).toBe('https://example.com/api?[REDACTED_PARAMS]');
    });

    it('should handle complex URLs with fragments', () => {
      const result = maskUrlParams('https://example.com/path?token=secret#fragment');

      expect(result).toBe('https://example.com/path?[REDACTED_PARAMS]');
    });

    it('should handle URL with path and params', () => {
      const result = maskUrlParams('https://api.example.com/v1/users/123?apiKey=secret');

      expect(result).toBe('https://api.example.com/v1/users/123?[REDACTED_PARAMS]');
    });

    it('should handle localhost URLs', () => {
      const result = maskUrlParams('http://localhost:3000/api?token=test');

      expect(result).toBe('http://localhost:3000/api?[REDACTED_PARAMS]');
    });
  });

  describe('deepRedact', () => {
    it('should recursively redact sensitive keys', () => {
      const obj = {
        user: { email: 'john@example.com', apiKey: 'secret' },
        token: 'abc123xyz'
      };

      const result = deepRedact(obj, ['apiKey', 'token', 'email']);

      expect(result.user.email).toBe('[REDACTED_EMAIL]');
      expect(result.user.apiKey).toBe('[REDACTED_APIKEY]');
      expect(result.token).toBe('[REDACTED_TOKEN]');
    });

    it('should preserve non-sensitive fields', () => {
      const obj = {
        userId: '123',
        userName: 'john',
        token: 'secret'
      };

      const result = deepRedact(obj, ['token']);

      expect(result.userId).toBe('123');
      expect(result.userName).toBe('john');
      expect(result.token).toBe('[REDACTED_TOKEN]');
    });

    it('should use default sensitive keys if not provided', () => {
      const obj = {
        token: 'secret1',
        apiKey: 'secret2',
        password: 'secret3'
      };

      const result = deepRedact(obj);

      expect(result.token).toBe('[REDACTED_TOKEN]');
      expect(result.apiKey).toBe('[REDACTED_APIKEY]');
      expect(result.password).toBe('[REDACTED_PASSWORD]');
    });

    it('should handle nested arrays', () => {
      const obj = {
        users: [
          { token: 'secret1' },
          { token: 'secret2' }
        ]
      };

      const result = deepRedact(obj, ['token']);

      expect(result.users[0].token).toBe('[REDACTED_TOKEN]');
      expect(result.users[1].token).toBe('[REDACTED_TOKEN]');
    });

    it('should handle deep nesting', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              secret: 'value'
            }
          }
        }
      };

      const result = deepRedact(obj, ['secret']);

      expect(result.level1.level2.level3.secret).toBe('[REDACTED_SECRET]');
    });

    it('should be case-insensitive for key matching', () => {
      const obj = {
        TOKEN: 'secret1',
        token: 'secret2',
        Token: 'secret3'
      };

      const result = deepRedact(obj, ['token']);

      expect(result.TOKEN).toBe('[REDACTED_TOKEN]');
      expect(result.token).toBe('[REDACTED_TOKEN]');
      expect(result.Token).toBe('[REDACTED_TOKEN]');
    });

    it('should handle null and undefined values', () => {
      const obj = {
        token: null,
        apiKey: undefined,
        password: 'secret'
      };

      const result = deepRedact(obj, ['token', 'apiKey', 'password']);

      // All sensitive fields are masked, even null/undefined ones
      expect(result.token).toBe('[REDACTED_TOKEN]');
      expect(result.apiKey).toBe('[REDACTED_APIKEY]');
      expect(result.password).toBe('[REDACTED_PASSWORD]');
    });

    it('should not mutate original object', () => {
      const original = { token: 'secret', id: '123' };
      const result = deepRedact(original, ['token']);

      expect(original.token).toBe('secret');
      expect(result.token).toBe('[REDACTED_TOKEN]');
    });
  });

  describe('maskHeaders', () => {
    it('should mask Authorization header', () => {
      const headers = {
        'authorization': 'Bearer secret-token',
        'user-agent': 'Mozilla/5.0'
      };

      const result = maskHeaders(headers);

      expect(result.authorization).toBe('[REDACTED_AUTHORIZATION]');
      expect(result['user-agent']).toBe('Mozilla/5.0');
    });

    it('should mask X-API-Key header', () => {
      const headers = {
        'x-api-key': 'sk-secret-key',
        'content-type': 'application/json'
      };

      const result = maskHeaders(headers);

      expect(result['x-api-key']).toBe('[REDACTED_X-API-KEY]');
      expect(result['content-type']).toBe('application/json');
    });

    it('should mask X-AGENTIC-ALLY-TOKEN header', () => {
      const headers = {
        'x-agentic-ally-token': 'secret-token-123',
        'accept': '*/*'
      };

      const result = maskHeaders(headers);

      expect(result['x-agentic-ally-token']).toBe('[REDACTED_X-AGENTIC-ALLY-TOKEN]');
      expect(result.accept).toBe('*/*');
    });

    it('should mask cookie headers', () => {
      const headers = {
        'cookie': 'sessionId=abc123; userId=user456',
        'set-cookie': 'sessionId=new123'
      };

      const result = maskHeaders(headers);

      expect(result.cookie).toBe('[REDACTED_COOKIE]');
      expect(result['set-cookie']).toBe('[REDACTED_SET-COOKIE]');
    });

    it('should be case-insensitive for header names', () => {
      const headers = {
        'Authorization': 'Bearer token',
        'authorization': 'Bearer token',
        'AUTHORIZATION': 'Bearer token'
      };

      const result = maskHeaders(headers);

      expect(result.Authorization).toBe('[REDACTED_AUTHORIZATION]');
      expect(result.authorization).toBe('[REDACTED_AUTHORIZATION]');
      expect(result.AUTHORIZATION).toBe('[REDACTED_AUTHORIZATION]');
    });

    it('should handle undefined header values', () => {
      const headers = {
        'authorization': undefined,
        'user-agent': 'Mozilla/5.0'
      };

      const result = maskHeaders(headers);

      // Undefined sensitive headers are still masked to prevent data leakage
      expect(typeof result.authorization).toBe('string');
      expect(result.authorization).toContain('REDACTED');
      expect(result['user-agent']).toBe('Mozilla/5.0');
    });

    it('should handle array header values', () => {
      const headers = {
        'set-cookie': ['sessionId=abc123', 'userId=user456'],
        'accept-encoding': ['gzip', 'deflate']
      };

      const result = maskHeaders(headers);

      expect(result['set-cookie']).toBe('[REDACTED_SET-COOKIE]');
      expect(result['accept-encoding']).toEqual(['gzip', 'deflate']);
    });

    it('should preserve non-sensitive headers', () => {
      const headers = {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'Node.js',
        'x-request-id': 'req-123'
      };

      const result = maskHeaders(headers);

      expect(result['content-type']).toBe('application/json');
      expect(result.accept).toBe('application/json');
      expect(result['user-agent']).toBe('Node.js');
      expect(result['x-request-id']).toBe('req-123');
    });

    it('should mask all standard auth headers', () => {
      const headers = {
        'authorization': 'Bearer token',
        'x-auth-token': 'secret',
        'x-access-token': 'token123',
        'x-api-key': 'key456'
      };

      const result = maskHeaders(headers);

      expect(result.authorization).toBe('[REDACTED_AUTHORIZATION]');
      expect(result['x-auth-token']).toBe('[REDACTED_X-AUTH-TOKEN]');
      expect(result['x-access-token']).toBe('[REDACTED_X-ACCESS-TOKEN]');
      expect(result['x-api-key']).toBe('[REDACTED_X-API-KEY]');
    });
  });

  describe('Integration Tests', () => {
    it('should safely log tool payload with multiple masking', () => {
      const payload = {
        requestId: 'req-123',
        accessToken: 'secret-token-abc123xyz',
        apiKey: 'sk-1234567890abcdefgh'
      };

      let result = maskSensitiveField(payload, 'accessToken');
      result = maskSensitiveField(result, 'apiKey');

      expect(result.requestId).toBe('req-123');
      expect(result.accessToken).toBe('[REDACTED_ACCESSTOKEN]');
      expect(result.apiKey).toBe('[REDACTED_APIKEY]');
    });

    it('should safe log headers from request', () => {
      const headers = {
        'authorization': 'Bearer secret-token',
        'x-api-key': 'sk-secret',
        'user-agent': 'Node.js',
        'content-type': 'application/json'
      };

      const maskedHeaders = maskHeaders(headers);
      const logString = JSON.stringify(maskedHeaders);

      expect(logString).not.toContain('secret-token');
      expect(logString).not.toContain('sk-secret');
      expect(logString).toContain('user-agent');
      expect(logString).toContain('content-type');
    });

    it('should deeply redact nested auth structures', () => {
      const payload = {
        user: {
          email: 'user@example.com',
          password: 'secret123'
        },
        credentials: {
          token: 'token-secret',
          apiKey: 'key-secret'
        }
      };

      const result = deepRedact(payload, ['email', 'password', 'token', 'apiKey']);

      expect(result.user.email).toBe('[REDACTED_EMAIL]');
      expect(result.user.password).toBe('[REDACTED_PASSWORD]');
      expect(result.credentials.token).toBe('[REDACTED_TOKEN]');
      expect(result.credentials.apiKey).toBe('[REDACTED_APIKEY]');
    });
  });

  describe('Security - No Visible Characters', () => {
    it('should not show any visible characters from token', () => {
      const payload = { token: 'super-secret-token-123-abc-xyz' };
      const result = maskSensitiveField(payload, 'token');

      expect(result.token).not.toContain('super');
      expect(result.token).not.toContain('secret');
      expect(result.token).not.toContain('token');
      expect(result.token).not.toContain('123');
      expect(result.token).toBe('[REDACTED_TOKEN]');
    });

    it('should not show any visible characters from deep redact', () => {
      const obj = { password: 'MyP@ssw0rd!Secret' };
      const result = deepRedact(obj, ['password']);

      expect(result.password).not.toContain('MyP');
      expect(result.password).not.toContain('ssw0rd');
      expect(result.password).not.toContain('Secret');
      expect(result.password).toBe('[REDACTED_PASSWORD]');
    });

    it('should not show email local part', () => {
      const email = 'secret.user@company.com';
      const result = maskEmail(email);

      expect(result).not.toContain('secret');
      expect(result).not.toContain('user');
      expect(result).toContain('company.com');
    });

    it('should not show phone area codes or first digits', () => {
      const phone = '555-123-4567';
      const result = maskPhone(phone);

      expect(result).not.toContain('555');
      expect(result).not.toContain('123');
      expect(result).not.toContain('456');
    });
  });
});
