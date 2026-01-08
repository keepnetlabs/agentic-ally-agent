import { describe, it, expect } from 'vitest';
import { maskSensitiveField } from './security-utils';

describe('security-utils', () => {
  describe('maskSensitiveField', () => {
    it('should mask token showing first 8 and last 4 characters', () => {
      const payload = { id: '123', token: 'secret-token-abc123xyz' };
      const result = maskSensitiveField(payload, 'token', 'secret-token-abc123xyz');

      expect(result.token).toBe('secret-t...3xyz');
    });

    it('should preserve other fields unchanged', () => {
      const payload = { id: '123', name: 'John', token: 'secret123' };
      const result = maskSensitiveField(payload, 'token', 'secret123');

      expect(result.id).toBe('123');
      expect(result.name).toBe('John');
    });

    it('should return new object (not mutate original)', () => {
      const payload = { id: '123', token: 'secret-token' };
      const result = maskSensitiveField(payload, 'token', 'secret-token');

      expect(result).not.toBe(payload);
      expect(payload.token).toBe('secret-token');
    });

    it('should show asterisks for short values (12 chars or less)', () => {
      const payload = { id: '123', token: 'short' };
      const result = maskSensitiveField(payload, 'token', 'short');

      expect(result.token).toBe('***');
    });

    it('should handle exactly 12 character value', () => {
      const payload = { id: '123', apiKey: '123456789012' };
      const result = maskSensitiveField(payload, 'apiKey', '123456789012');

      expect(result.apiKey).toBe('***');
    });

    it('should handle 13 character value (just over threshold)', () => {
      const payload = { id: '123', apiKey: '1234567890123' };
      const result = maskSensitiveField(payload, 'apiKey', '1234567890123');

      expect(result.apiKey).toBe('12345678...0123');
    });

    it('should handle undefined value', () => {
      const payload = { id: '123', token: 'something' };
      const result = maskSensitiveField(payload, 'token', undefined);

      expect(result.token).toBeUndefined();
    });

    it('should handle empty string value', () => {
      const payload = { id: '123', token: 'something' };
      const result = maskSensitiveField(payload, 'token', '');

      expect(result.token).toBeUndefined();
    });

    it('should work with different field names', () => {
      const payload = { accessToken: 'secret1', refreshToken: 'secret2' };
      const result1 = maskSensitiveField(payload, 'accessToken', 'secret1');
      const result2 = maskSensitiveField(payload, 'refreshToken', 'secret2');

      expect(result1.accessToken).toBe('***');
      expect(result2.refreshToken).toBe('***');
    });

    it('should handle very long tokens', () => {
      const longToken = 'x'.repeat(100);
      const payload = { token: longToken };
      const result = maskSensitiveField(payload, 'token', longToken);

      expect(result.token).toBe('xxxxxxxx...xxxx');
      expect(result.token.length).toBe(15);
    });

    it('should preserve generic object properties', () => {
      const payload = {
        userId: '123',
        email: 'user@example.com',
        token: 'secret-token-abc123xyz',
        role: 'admin'
      };

      const result = maskSensitiveField(payload, 'token', payload.token);

      expect(result.userId).toBe('123');
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe('admin');
      expect(result.token).toBe('secret-t...3xyz');
    });

    it('should handle apiKey field', () => {
      const payload = { apiKey: 'sk-1234567890abcdefgh' };
      const result = maskSensitiveField(payload, 'apiKey', 'sk-1234567890abcdefgh');

      expect(result.apiKey).toBe('sk-12345...efgh');
    });

    it('should handle password field', () => {
      const payload = { password: 'MySecurePassword123!' };
      const result = maskSensitiveField(payload, 'password', 'MySecurePassword123!');

      expect(result.password).toBe('MySecure...123!');
    });

    it('should handle accessToken field', () => {
      const payload = { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' };
      const result = maskSensitiveField(payload, 'accessToken', payload.accessToken);

      expect(result.accessToken).toBe('eyJhbGci...VCJ9');
    });

    it('should handle numeric-like string values', () => {
      const payload = { creditCard: '1234567890123456' };
      const result = maskSensitiveField(payload, 'creditCard', '1234567890123456');

      expect(result.creditCard).toBe('12345678...3456');
    });

    it('should handle URL-like values', () => {
      const payload = { callbackUrl: 'https://example.com/callback?token=secret' };
      const result = maskSensitiveField(payload, 'callbackUrl', payload.callbackUrl);

      expect(result.callbackUrl).toBe('https://...cret');
    });

    it('should be deterministic', () => {
      const token = 'secret-token-abc123xyz';
      const payload = { token };

      const result1 = maskSensitiveField(payload, 'token', token);
      const result2 = maskSensitiveField(payload, 'token', token);

      expect(result1.token).toBe(result2.token);
    });

    it('should handle special characters in token', () => {
      const token = 'secret!@#$%^&*()_+-=[]{}';
      const payload = { token };
      const result = maskSensitiveField(payload, 'token', token);

      expect(result.token).toBe('secret!@...[]{}');
    });

    it('should handle unicode characters in token', () => {
      const token = 'secret-汉字-测试-token';
      const payload = { token };
      const result = maskSensitiveField(payload, 'token', token);

      expect(result.token).toContain('...');
    });

    it('should work with nested object payload', () => {
      const payload: any = {
        user: { id: '123' },
        token: 'secret-token-abc123xyz'
      };

      const result = maskSensitiveField(payload, 'token', 'secret-token-abc123xyz');

      expect(result.user.id).toBe('123');
      expect(result.token).toBe('secret-t...3xyz');
    });

    it('should handle multiple calls on same object', () => {
      const payload = {
        accessToken: 'access-secret-abc123xyz',
        refreshToken: 'refresh-secret-def456uvw'
      };

      const result1 = maskSensitiveField(
        payload,
        'accessToken',
        'access-secret-abc123xyz'
      );
      const result2 = maskSensitiveField(
        result1,
        'refreshToken',
        'refresh-secret-def456uvw'
      );

      expect(result2.accessToken).toBe('access-s...3xyz');
      expect(result2.refreshToken).toBe('refresh-...6uvw');
    });

    it('should maintain payload type generics', () => {
      interface UserPayload {
        userId: string;
        token: string;
      }

      const payload: UserPayload = {
        userId: '123',
        token: 'secret-token-abc123xyz'
      };

      const result = maskSensitiveField(payload, 'token', payload.token);

      expect(result.userId).toBe('123');
      expect(typeof result.token).toBe('string');
    });

    it('should handle masking same field multiple times', () => {
      const payload = { token: 'secret-token-abc123xyz' };

      const result1 = maskSensitiveField(payload, 'token', 'secret-token-abc123xyz');
      const result2 = maskSensitiveField(
        result1,
        'token',
        'secret-token-abc123xyz'
      );

      expect(result1.token).toBe(result2.token);
    });

    it('should create independent objects', () => {
      const originalPayload = { id: '123', token: 'secret-token-abc123xyz' };
      const result = maskSensitiveField(originalPayload, 'token', 'secret-token-abc123xyz');

      result.id = '456';

      expect(originalPayload.id).toBe('123');
      expect(result.id).toBe('456');
    });
  });

  describe('Integration Tests', () => {
    it('should mask multiple sensitive fields for logging', () => {
      const payload = {
        userId: 'user-123',
        email: 'user@example.com',
        accessToken: 'secret-token-abc123xyz',
        refreshToken: 'refresh-token-def456uvw'
      };

      let result = maskSensitiveField(
        payload,
        'accessToken',
        payload.accessToken
      );
      result = maskSensitiveField(
        result,
        'refreshToken',
        payload.refreshToken
      );

      expect(result.userId).toBe('user-123');
      expect(result.email).toBe('user@example.com');
      expect(result.accessToken).toBe('secret-t...3xyz');
      expect(result.refreshToken).toBe('refresh-...6uvw');
    });

    it('should be suitable for safe logging', () => {
      const payload = {
        requestId: 'req-123',
        apiKey: 'sk-1234567890abcdefgh'
      };

      const safePayload = maskSensitiveField(
        payload,
        'apiKey',
        payload.apiKey
      );

      const logMessage = JSON.stringify(safePayload);

      expect(logMessage).not.toContain('sk-1234567890abcdefgh');
      expect(logMessage).toContain('sk-12345...efgh');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character value', () => {
      const payload = { key: 'x' };
      const result = maskSensitiveField(payload, 'key', 'x');

      expect(result.key).toBe('***');
    });

    it('should handle exactly 8 character value', () => {
      const payload = { key: '12345678' };
      const result = maskSensitiveField(payload, 'key', '12345678');

      expect(result.key).toBe('***');
    });

    it('should handle whitespace in value', () => {
      const payload = { token: 'secret token with spaces' };
      const result = maskSensitiveField(payload, 'token', 'secret token with spaces');

      expect(result.token).toBe('secret t...aces');
    });

    it('should handle newlines in value', () => {
      const payload = { multilineKey: 'line1\nline2\nline3\nline4' };
      const result = maskSensitiveField(payload, 'multilineKey', 'line1\nline2\nline3\nline4');

      expect(result.multilineKey).toContain('...');
    });

    it('should handle null field name gracefully', () => {
      const payload = { id: '123', token: 'secret' };
      const result = maskSensitiveField(payload, 'null', 'secret');

      expect((result as any)['null']).toBe('***');
    });
  });
});
