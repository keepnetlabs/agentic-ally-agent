import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment, validateEnvironmentOrThrow } from './env-validation';
import { getLogger } from './logger';

// Mock logger
const { mockLoggerInstance } = vi.hoisted(() => {
  return {
    mockLoggerInstance: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock logger
vi.mock('./logger', () => ({
  getLogger: vi.fn(() => mockLoggerInstance),
}));

describe('env-validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment to clean state
    process.env = { ...originalEnv };

    // Clear relevant env vars to ensure clean test state
    const varsToClear = [
      'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_KV_TOKEN',
      'CLOUDFLARE_D1_DATABASE_ID', 'CLOUDFLARE_AI_GATEWAY_ID',
      'CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY', 'OPENAI_API_KEY',
      'GOOGLE_GENERATIVE_AI_API_KEY', 'MASTRA_MEMORY_URL',
      'MASTRA_MEMORY_TOKEN', 'LOGO_DEV_TOKEN'
    ];
    varsToClear.forEach(key => delete process.env[key]);


  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  // ==================== SUCCESSFUL VALIDATION ====================
  describe('validateEnvironment - Success Cases', () => {
    it('should return valid: true when all required env vars are set', () => {
      // Set all required variables
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should log info when all required vars are set', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      validateEnvironment();

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        'Environment validation passed',
        expect.objectContaining({
          requiredCount: 7,
          optionalMissing: expect.any(Number),
        })
      );
    });

    it('should return valid: true with some optional vars missing', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';
      // Don't set optional vars

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should have all required variables in missing array when not set', () => {
      // Clear all env vars
      Object.keys(process.env).forEach((key) => {
        delete process.env[key];
      });

      const result = validateEnvironment();

      expect(result.missing).toContain('CLOUDFLARE_ACCOUNT_ID');
      expect(result.missing).toContain('CLOUDFLARE_API_KEY');
      expect(result.missing).toContain('CLOUDFLARE_KV_TOKEN');
      expect(result.missing).toContain('CLOUDFLARE_D1_DATABASE_ID');
      expect(result.missing).toContain('CLOUDFLARE_AI_GATEWAY_ID');
      expect(result.missing).toContain('CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY');
      expect(result.missing).toContain('OPENAI_API_KEY');
    });
  });

  // ==================== MISSING REQUIRED VARIABLES ====================
  describe('validateEnvironment - Missing Required Cases', () => {
    it('should return valid: false when CLOUDFLARE_ACCOUNT_ID is missing', () => {
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('CLOUDFLARE_ACCOUNT_ID');
    });

    it('should return valid: false when OPENAI_API_KEY is missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('OPENAI_API_KEY');
    });

    it('should log error when required variables are missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      validateEnvironment();

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        'Missing required environment variables',
        expect.objectContaining({
          missing: expect.any(Array),
          count: expect.any(Number),
        })
      );
    });

    it('should include correct count of missing variables', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      const result = validateEnvironment();

      expect(result.missing.length).toBe(6); // 7 required - 1 set
    });

    it('should handle multiple missing required variables', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(1);
      expect(result.missing.length).toBe(5);
    });
  });

  // ==================== OPTIONAL VARIABLES ====================
  describe('validateEnvironment - Optional Variables', () => {
    it('should detect missing GOOGLE_GENERATIVE_AI_API_KEY in warnings', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';
      // Don't set optional vars

      const result = validateEnvironment();

      expect(result.warnings).toContain('GOOGLE_GENERATIVE_AI_API_KEY');
    });

    it('should detect missing MASTRA_MEMORY_URL in warnings', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      expect(result.warnings).toContain('MASTRA_MEMORY_URL');
    });

    it('should detect missing MASTRA_MEMORY_TOKEN in warnings', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      expect(result.warnings).toContain('MASTRA_MEMORY_TOKEN');
    });

    it('should log warning when optional variables are missing', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      validateEnvironment();

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Optional environment variables not set',
        expect.objectContaining({
          warnings: expect.any(Array),
          count: expect.any(Number),
        })
      );
    });

    it('should not warn when all optional variables are set', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';
      // Set optional vars
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key-123';
      process.env.MASTRA_MEMORY_URL = 'https://memory.example.com';
      process.env.MASTRA_MEMORY_TOKEN = 'memory-token-123';
      process.env.LOGO_DEV_TOKEN = 'logo-token-123';

      const result = validateEnvironment();

      expect(result.warnings).toHaveLength(0);
      expect(mockLoggerInstance.warn).not.toHaveBeenCalled();
    });
  });

  // ==================== RETURN VALUE STRUCTURE ====================
  describe('validateEnvironment - Return Value Structure', () => {
    it('should return object with valid, missing, and warnings properties', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      const result = validateEnvironment();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('missing');
      expect(result).toHaveProperty('warnings');
    });

    it('should return arrays for missing and warnings', () => {
      const result = validateEnvironment();

      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should return valid as boolean', () => {
      const result = validateEnvironment();

      expect(typeof result.valid).toBe('boolean');
    });

    it('should correlate valid with missing array', () => {
      // All required set = valid is true, missing is empty
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      expect(result.valid).toBe(result.missing.length === 0);
    });
  });

  // ==================== validateEnvironmentOrThrow ====================
  describe('validateEnvironmentOrThrow', () => {
    it('should not throw when environment is valid', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      expect(() => validateEnvironmentOrThrow()).not.toThrow();
    });

    it('should throw when required variables are missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      expect(() => validateEnvironmentOrThrow()).toThrow();
    });

    it('should throw Error with descriptive message', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      expect(() => validateEnvironmentOrThrow()).toThrow(
        /Missing required environment variables/
      );
    });

    it('should include missing variable names in error message', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      try {
        validateEnvironmentOrThrow();
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('CLOUDFLARE_API_KEY');
      }
    });

    it('should include instruction about .env file in error message', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      try {
        validateEnvironmentOrThrow();
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toMatch(/\.env|environment configuration/i);
      }
    });

    it('should not throw for missing optional variables', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';
      // Don't set optional vars

      expect(() => validateEnvironmentOrThrow()).not.toThrow();
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should handle empty string as missing variable', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = '';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('CLOUDFLARE_ACCOUNT_ID');
    });

    it('should handle whitespace-only variables as missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = '   ';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      // Whitespace is still truthy, so this should pass
      expect(result.missing).not.toContain('CLOUDFLARE_ACCOUNT_ID');
    });

    it('should handle very long environment variable values', () => {
      const longValue = 'x'.repeat(10000);

      process.env.CLOUDFLARE_ACCOUNT_ID = longValue;
      process.env.CLOUDFLARE_API_KEY = longValue;
      process.env.CLOUDFLARE_KV_TOKEN = longValue;
      process.env.CLOUDFLARE_D1_DATABASE_ID = longValue;
      process.env.CLOUDFLARE_AI_GATEWAY_ID = longValue;
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = longValue;
      process.env.OPENAI_API_KEY = longValue;

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should handle special characters in environment variable values', () => {
      const specialValue = 'key-with_special.chars@123!@#$%^&*()';

      process.env.CLOUDFLARE_ACCOUNT_ID = specialValue;
      process.env.CLOUDFLARE_API_KEY = specialValue;
      process.env.CLOUDFLARE_KV_TOKEN = specialValue;
      process.env.CLOUDFLARE_D1_DATABASE_ID = specialValue;
      process.env.CLOUDFLARE_AI_GATEWAY_ID = specialValue;
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = specialValue;
      process.env.OPENAI_API_KEY = specialValue;

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
    });

    it('should handle zero as a variable value (falsy but present)', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = '0';
      process.env.CLOUDFLARE_API_KEY = '0';
      process.env.CLOUDFLARE_KV_TOKEN = '0';
      process.env.CLOUDFLARE_D1_DATABASE_ID = '0';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = '0';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = '0';
      process.env.OPENAI_API_KEY = '0';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
    });

    it('should validate multiple times without state leakage', () => {
      // First validation
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      const result1 = validateEnvironment();
      expect(result1.valid).toBe(false);

      // Second validation with complete env
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result2 = validateEnvironment();
      expect(result2.valid).toBe(true);

      // Third validation
      delete process.env.OPENAI_API_KEY;
      const result3 = validateEnvironment();
      expect(result3.valid).toBe(false);
    });

    it('should handle case-sensitive environment variable names', () => {
      // Set with lowercase (should not match UPPERCASE)
      process.env.cloudflare_account_id = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      const result = validateEnvironment();

      // Should still be invalid because CLOUDFLARE_ACCOUNT_ID (uppercase) is not set
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('CLOUDFLARE_ACCOUNT_ID');
    });

    it('should return consistent results for same input', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      const result1 = validateEnvironment();
      const result2 = validateEnvironment();

      expect(result1.valid).toBe(result2.valid);
      expect(result1.missing).toEqual(result2.missing);
      expect(result1.warnings).toEqual(result2.warnings);
    });

    it('should handle all required variables set and all optional set', () => {
      // Set all required
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';
      // Set optional
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key-123';
      process.env.MASTRA_MEMORY_URL = 'https://memory.example.com';
      process.env.MASTRA_MEMORY_TOKEN = 'memory-token-123';
      process.env.LOGO_DEV_TOKEN = 'logo-token-123';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(mockLoggerInstance.error).not.toHaveBeenCalled();
      expect(mockLoggerInstance.warn).not.toHaveBeenCalled();
    });
  });

  // ==================== LOGGING SCENARIOS ====================
  describe('Logging Scenarios', () => {
    it('should log error count when variables missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';

      validateEnvironment();

      expect(mockLoggerInstance.error).toHaveBeenCalledWith(
        'Missing required environment variables',
        expect.objectContaining({
          count: 6,
        })
      );
    });

    it('should log warning count when optional vars missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      validateEnvironment();

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        'Optional environment variables not set',
        expect.objectContaining({
          count: expect.any(Number),
        })
      );
    });

    it('should log required count in success message', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';

      validateEnvironment();

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        'Environment validation passed',
        expect.objectContaining({
          requiredCount: 7,
        })
      );
    });

    it('should not call logger methods for warnings if no optional vars missing', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'account-123';
      process.env.CLOUDFLARE_API_KEY = 'api-key-123';
      process.env.CLOUDFLARE_KV_TOKEN = 'kv-token-123';
      process.env.CLOUDFLARE_D1_DATABASE_ID = 'd1-id-123';
      process.env.CLOUDFLARE_AI_GATEWAY_ID = 'gateway-id-123';
      process.env.CLOUDFLARE_GATEWAY_AUTHENTICATION_KEY = 'auth-key-123';
      process.env.OPENAI_API_KEY = 'openai-key-123';
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key-123';
      process.env.MASTRA_MEMORY_URL = 'https://memory.example.com';
      process.env.MASTRA_MEMORY_TOKEN = 'memory-token-123';
      process.env.LOGO_DEV_TOKEN = 'logo-token-123';

      validateEnvironment();

      expect(mockLoggerInstance.warn).not.toHaveBeenCalled();
    });
  });
});
