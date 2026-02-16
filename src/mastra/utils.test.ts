import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isProduction, isDevelopment } from './utils';

describe('utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isProduction', () => {
    describe('Default Behavior', () => {
      it('returns false by default (when no env vars set)', () => {
        delete process.env.NODE_ENV;
        delete process.env.BUILD_MODE;
        expect(isProduction()).toBe(false);
      });

      it('returns false when both env vars are undefined', () => {
        process.env.NODE_ENV = undefined;
        process.env.BUILD_MODE = undefined;
        expect(isProduction()).toBe(false);
      });

      it('returns false when both env vars are empty strings', () => {
        process.env.NODE_ENV = '';
        process.env.BUILD_MODE = '';
        expect(isProduction()).toBe(false);
      });
    });

    describe('NODE_ENV Tests', () => {
      it('returns true when NODE_ENV is production', () => {
        process.env.NODE_ENV = 'production';
        expect(isProduction()).toBe(true);
      });

      it('returns true when NODE_ENV is PRODUCTION (uppercase)', () => {
        process.env.NODE_ENV = 'PRODUCTION';
        expect(isProduction()).toBe(true);
      });

      it('returns true when NODE_ENV is Production (mixed case)', () => {
        process.env.NODE_ENV = 'Production';
        expect(isProduction()).toBe(true);
      });

      it('returns true when NODE_ENV is PrOdUcTiOn (random case)', () => {
        process.env.NODE_ENV = 'PrOdUcTiOn';
        expect(isProduction()).toBe(true);
      });

      it('returns false when NODE_ENV is development', () => {
        process.env.NODE_ENV = 'development';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV is test', () => {
        process.env.NODE_ENV = 'test';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV is staging', () => {
        process.env.NODE_ENV = 'staging';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV is local', () => {
        process.env.NODE_ENV = 'local';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV is prod (not exact match)', () => {
        process.env.NODE_ENV = 'prod';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV is production-like', () => {
        process.env.NODE_ENV = 'production-staging';
        expect(isProduction()).toBe(false);
      });

      it('handles whitespace around NODE_ENV', () => {
        process.env.NODE_ENV = ' production ';
        expect(isProduction()).toBe(true);
      });

      it('handles leading whitespace in NODE_ENV', () => {
        process.env.NODE_ENV = '  production';
        expect(isProduction()).toBe(true);
      });

      it('handles trailing whitespace in NODE_ENV', () => {
        process.env.NODE_ENV = 'production  ';
        expect(isProduction()).toBe(true);
      });

      it('handles tabs and newlines in NODE_ENV', () => {
        process.env.NODE_ENV = '\tproduction\n';
        expect(isProduction()).toBe(true);
      });

      it('returns false when NODE_ENV is whitespace only', () => {
        process.env.NODE_ENV = '   ';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV is empty string', () => {
        process.env.NODE_ENV = '';
        expect(isProduction()).toBe(false);
      });
    });

    describe('BUILD_MODE Tests', () => {
      it('returns true when BUILD_MODE is production', () => {
        process.env.BUILD_MODE = 'production';
        expect(isProduction()).toBe(true);
      });

      it('returns true when BUILD_MODE is PRODUCTION (uppercase)', () => {
        process.env.BUILD_MODE = 'PRODUCTION';
        expect(isProduction()).toBe(true);
      });

      it('returns true when BUILD_MODE is Production (mixed case)', () => {
        process.env.BUILD_MODE = 'Production';
        expect(isProduction()).toBe(true);
      });

      it('returns false when BUILD_MODE is development', () => {
        process.env.BUILD_MODE = 'development';
        expect(isProduction()).toBe(false);
      });

      it('returns false when BUILD_MODE is test', () => {
        process.env.BUILD_MODE = 'test';
        expect(isProduction()).toBe(false);
      });

      it('returns false when BUILD_MODE is staging', () => {
        process.env.BUILD_MODE = 'staging';
        expect(isProduction()).toBe(false);
      });

      it('handles whitespace around BUILD_MODE', () => {
        process.env.BUILD_MODE = ' production ';
        expect(isProduction()).toBe(true);
      });

      it('handles leading whitespace in BUILD_MODE', () => {
        process.env.BUILD_MODE = '   production';
        expect(isProduction()).toBe(true);
      });

      it('handles trailing whitespace in BUILD_MODE', () => {
        process.env.BUILD_MODE = 'production   ';
        expect(isProduction()).toBe(true);
      });

      it('returns false when BUILD_MODE is empty string', () => {
        process.env.BUILD_MODE = '';
        expect(isProduction()).toBe(false);
      });

      it('returns false when BUILD_MODE is whitespace only', () => {
        process.env.BUILD_MODE = '  \t\n  ';
        expect(isProduction()).toBe(false);
      });
    });

    describe('Combined ENV Tests', () => {
      it('returns true when both NODE_ENV and BUILD_MODE are production', () => {
        process.env.NODE_ENV = 'production';
        process.env.BUILD_MODE = 'production';
        expect(isProduction()).toBe(true);
      });

      it('returns true when NODE_ENV is production and BUILD_MODE is development', () => {
        process.env.NODE_ENV = 'production';
        process.env.BUILD_MODE = 'development';
        expect(isProduction()).toBe(true);
      });

      it('returns true when NODE_ENV is development and BUILD_MODE is production', () => {
        process.env.NODE_ENV = 'development';
        process.env.BUILD_MODE = 'production';
        expect(isProduction()).toBe(true);
      });

      it('returns false when both are development', () => {
        process.env.NODE_ENV = 'development';
        process.env.BUILD_MODE = 'development';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV is test and BUILD_MODE is staging', () => {
        process.env.NODE_ENV = 'test';
        process.env.BUILD_MODE = 'staging';
        expect(isProduction()).toBe(false);
      });

      it('prioritizes NODE_ENV when both are set', () => {
        process.env.NODE_ENV = 'production';
        process.env.BUILD_MODE = 'test';
        expect(isProduction()).toBe(true);
      });

      it('falls back to BUILD_MODE when NODE_ENV is not production', () => {
        process.env.NODE_ENV = 'test';
        process.env.BUILD_MODE = 'production';
        expect(isProduction()).toBe(true);
      });

      it('handles both with mixed case', () => {
        process.env.NODE_ENV = 'Production';
        process.env.BUILD_MODE = 'PRODUCTION';
        expect(isProduction()).toBe(true);
      });

      it('handles both with whitespace', () => {
        process.env.NODE_ENV = ' production ';
        process.env.BUILD_MODE = '  production  ';
        expect(isProduction()).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('returns false when NODE_ENV is null (coerced to string)', () => {
        // @ts-ignore - Testing runtime behavior
        process.env.NODE_ENV = null;
        expect(isProduction()).toBe(false);
      });

      it('returns false when BUILD_MODE is null', () => {
        // @ts-ignore - Testing runtime behavior
        process.env.BUILD_MODE = null;
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV contains production with extra chars', () => {
        process.env.NODE_ENV = 'productionx';
        expect(isProduction()).toBe(false);
      });

      it('returns false when NODE_ENV has production in middle', () => {
        process.env.NODE_ENV = 'myproduction';
        expect(isProduction()).toBe(false);
      });

      it('handles very long string in NODE_ENV', () => {
        process.env.NODE_ENV = 'a'.repeat(10000);
        expect(isProduction()).toBe(false);
      });

      it('handles special characters in NODE_ENV', () => {
        process.env.NODE_ENV = 'production@#$%';
        expect(isProduction()).toBe(false);
      });

      it('handles unicode in NODE_ENV', () => {
        process.env.NODE_ENV = 'production你好';
        expect(isProduction()).toBe(false);
      });

      it('handles newline in middle of NODE_ENV', () => {
        process.env.NODE_ENV = 'prod\nuction';
        expect(isProduction()).toBe(false);
      });

      it('is consistent across multiple calls', () => {
        process.env.NODE_ENV = 'production';
        expect(isProduction()).toBe(true);
        expect(isProduction()).toBe(true);
        expect(isProduction()).toBe(true);
      });

      it('reflects changes to environment variables', () => {
        process.env.NODE_ENV = 'development';
        expect(isProduction()).toBe(false);

        process.env.NODE_ENV = 'production';
        expect(isProduction()).toBe(true);

        delete process.env.NODE_ENV;
        expect(isProduction()).toBe(false);
      });

      it('handles only BUILD_MODE set', () => {
        delete process.env.NODE_ENV;
        process.env.BUILD_MODE = 'production';
        expect(isProduction()).toBe(true);
      });

      it('handles only NODE_ENV set', () => {
        delete process.env.BUILD_MODE;
        process.env.NODE_ENV = 'production';
        expect(isProduction()).toBe(true);
      });
    });

    describe('Non-Production Values', () => {
      it('returns false for qa', () => {
        process.env.NODE_ENV = 'qa';
        expect(isProduction()).toBe(false);
      });

      it('returns false for uat', () => {
        process.env.NODE_ENV = 'uat';
        expect(isProduction()).toBe(false);
      });

      it('returns false for demo', () => {
        process.env.NODE_ENV = 'demo';
        expect(isProduction()).toBe(false);
      });

      it('returns false for preview', () => {
        process.env.NODE_ENV = 'preview';
        expect(isProduction()).toBe(false);
      });

      it('returns false for sandbox', () => {
        process.env.NODE_ENV = 'sandbox';
        expect(isProduction()).toBe(false);
      });

      it('returns false for dev', () => {
        process.env.NODE_ENV = 'dev';
        expect(isProduction()).toBe(false);
      });

      it('returns false for localhost', () => {
        process.env.NODE_ENV = 'localhost';
        expect(isProduction()).toBe(false);
      });
    });
  });

  describe('isDevelopment', () => {
    describe('Basic Behavior', () => {
      it('returns true when isProduction is false', () => {
        delete process.env.NODE_ENV;
        expect(isDevelopment()).toBe(true);
      });

      it('returns false when isProduction is true', () => {
        process.env.NODE_ENV = 'production';
        expect(isDevelopment()).toBe(false);
      });

      it('returns true by default', () => {
        delete process.env.NODE_ENV;
        delete process.env.BUILD_MODE;
        expect(isDevelopment()).toBe(true);
      });
    });

    describe('NODE_ENV Tests', () => {
      it('returns false when NODE_ENV is production', () => {
        process.env.NODE_ENV = 'production';
        expect(isDevelopment()).toBe(false);
      });

      it('returns false when NODE_ENV is PRODUCTION', () => {
        process.env.NODE_ENV = 'PRODUCTION';
        expect(isDevelopment()).toBe(false);
      });

      it('returns true when NODE_ENV is development', () => {
        process.env.NODE_ENV = 'development';
        expect(isDevelopment()).toBe(true);
      });

      it('returns true when NODE_ENV is test', () => {
        process.env.NODE_ENV = 'test';
        expect(isDevelopment()).toBe(true);
      });

      it('returns true when NODE_ENV is staging', () => {
        process.env.NODE_ENV = 'staging';
        expect(isDevelopment()).toBe(true);
      });

      it('returns true when NODE_ENV is empty', () => {
        process.env.NODE_ENV = '';
        expect(isDevelopment()).toBe(true);
      });

      it('returns false when NODE_ENV has whitespace around production', () => {
        process.env.NODE_ENV = '  production  ';
        expect(isDevelopment()).toBe(false);
      });
    });

    describe('BUILD_MODE Tests', () => {
      it('returns false when BUILD_MODE is production', () => {
        process.env.BUILD_MODE = 'production';
        expect(isDevelopment()).toBe(false);
      });

      it('returns false when BUILD_MODE is PRODUCTION', () => {
        process.env.BUILD_MODE = 'PRODUCTION';
        expect(isDevelopment()).toBe(false);
      });

      it('returns true when BUILD_MODE is development', () => {
        process.env.BUILD_MODE = 'development';
        expect(isDevelopment()).toBe(true);
      });

      it('returns true when BUILD_MODE is test', () => {
        process.env.BUILD_MODE = 'test';
        expect(isDevelopment()).toBe(true);
      });

      it('returns true when BUILD_MODE is empty', () => {
        process.env.BUILD_MODE = '';
        expect(isDevelopment()).toBe(true);
      });
    });

    describe('Combined ENV Tests', () => {
      it('returns false when both are production', () => {
        process.env.NODE_ENV = 'production';
        process.env.BUILD_MODE = 'production';
        expect(isDevelopment()).toBe(false);
      });

      it('returns false when NODE_ENV is production, BUILD_MODE is development', () => {
        process.env.NODE_ENV = 'production';
        process.env.BUILD_MODE = 'development';
        expect(isDevelopment()).toBe(false);
      });

      it('returns false when NODE_ENV is test, BUILD_MODE is production', () => {
        process.env.NODE_ENV = 'test';
        process.env.BUILD_MODE = 'production';
        expect(isDevelopment()).toBe(false);
      });

      it('returns true when both are development', () => {
        process.env.NODE_ENV = 'development';
        process.env.BUILD_MODE = 'development';
        expect(isDevelopment()).toBe(true);
      });

      it('returns true when both are test', () => {
        process.env.NODE_ENV = 'test';
        process.env.BUILD_MODE = 'test';
        expect(isDevelopment()).toBe(true);
      });

      it('returns true when both are empty', () => {
        process.env.NODE_ENV = '';
        process.env.BUILD_MODE = '';
        expect(isDevelopment()).toBe(true);
      });
    });

    describe('Inverse Relationship', () => {
      it('isDevelopment is always opposite of isProduction (production case)', () => {
        process.env.NODE_ENV = 'production';
        expect(isDevelopment()).toBe(!isProduction());
      });

      it('isDevelopment is always opposite of isProduction (development case)', () => {
        process.env.NODE_ENV = 'development';
        expect(isDevelopment()).toBe(!isProduction());
      });

      it('isDevelopment is always opposite of isProduction (empty case)', () => {
        delete process.env.NODE_ENV;
        delete process.env.BUILD_MODE;
        expect(isDevelopment()).toBe(!isProduction());
      });

      it('isDevelopment is always opposite of isProduction (mixed case)', () => {
        process.env.NODE_ENV = 'test';
        process.env.BUILD_MODE = 'staging';
        expect(isDevelopment()).toBe(!isProduction());
      });
    });

    describe('Consistency Tests', () => {
      it('returns consistent results across multiple calls', () => {
        process.env.NODE_ENV = 'development';
        expect(isDevelopment()).toBe(true);
        expect(isDevelopment()).toBe(true);
        expect(isDevelopment()).toBe(true);
      });

      it('reflects environment changes', () => {
        process.env.NODE_ENV = 'production';
        expect(isDevelopment()).toBe(false);

        process.env.NODE_ENV = 'development';
        expect(isDevelopment()).toBe(true);

        delete process.env.NODE_ENV;
        expect(isDevelopment()).toBe(true);
      });
    });
  });
});
