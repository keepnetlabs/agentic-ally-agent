import { describe, it, expect } from 'vitest';
import { isSafeId, normalizeSafeId } from './id-utils';

describe('id-utils', () => {
    describe('isSafeId', () => {
        it('should return true for valid IDs', () => {
            expect(isSafeId('abc')).toBe(true);
            expect(isSafeId('user-123')).toBe(true);
            expect(isSafeId('USER_TEST')).toBe(true);
        });

        it('should return false for invalid IDs', () => {
            expect(isSafeId('ab')).toBe(false); // Too short
            expect(isSafeId('test!')).toBe(false); // Invalid char
            expect(isSafeId('   ')).toBe(false); // Empty/Whitespace
        });

        it('should return false for unsafe patterns', () => {
            expect(isSafeId('[USER-123]')).toBe(false);
            expect(isSafeId('prefix-[USER-XX]')).toBe(false);
        });
    });

    describe('normalizeSafeId', () => {
        it('should return sanitized string for valid input', () => {
            expect(normalizeSafeId('  valid-id  ')).toBe('valid-id');
        });

        it('should return undefined for invalid input', () => {
            expect(normalizeSafeId('no')).toBeUndefined();
            expect(normalizeSafeId('')).toBeUndefined();
            expect(normalizeSafeId(null)).toBeUndefined();
        });
    });
});
