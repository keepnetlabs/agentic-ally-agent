
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
        it('returns false by default (when no env vars set)', () => {
            delete process.env.NODE_ENV;
            delete process.env.BUILD_MODE;
            expect(isProduction()).toBe(false);
        });

        it('returns true when NODE_ENV is production', () => {
            process.env.NODE_ENV = 'production';
            expect(isProduction()).toBe(true);
        });

        it('returns true when BUILD_MODE is production', () => {
            process.env.BUILD_MODE = 'production';
            expect(isProduction()).toBe(true);
        });

        it('returns false when NODE_ENV is development', () => {
            process.env.NODE_ENV = 'development';
            expect(isProduction()).toBe(false);
        });

        it('is case insensitive', () => {
            process.env.NODE_ENV = 'Production';
            expect(isProduction()).toBe(true);
        });

        it('handles whitespace', () => {
            process.env.NODE_ENV = ' production ';
            expect(isProduction()).toBe(true);
        });
    });

    describe('isDevelopment', () => {
        it('returns true when isProduction is false', () => {
            delete process.env.NODE_ENV;
            expect(isDevelopment()).toBe(true);
        });

        it('returns false when isProduction is true', () => {
            process.env.NODE_ENV = 'production';
            expect(isDevelopment()).toBe(false);
        });
    });
});
