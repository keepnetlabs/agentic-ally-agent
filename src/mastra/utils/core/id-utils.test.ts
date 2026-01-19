import { describe, it, expect } from 'vitest';
import { isSafeId, normalizeSafeId, generateUniqueId, generateSlugId } from './id-utils';

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

    describe('generateUniqueId', () => {
        it('should generate a valid UUID', () => {
            const uuid1 = generateUniqueId();
            const uuid2 = generateUniqueId();

            // Basic UUID format check
            expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('generateSlugId', () => {
        it('should generate a valid slug format', () => {
            const topic = "Phishing 101: Basic Concepts";
            const slugId = generateSlugId(topic);

            expect(slugId).toMatch(/^phishing-101-basic-concepts-[0-9a-f]{8}$/);
        });

        it('should generate unique slugs for same topic', () => {
            const topic = "Test Topic";
            const id1 = generateSlugId(topic);
            const id2 = generateSlugId(topic);

            expect(id1).not.toBe(id2);
            expect(id1.startsWith('test-topic-')).toBe(true);
            expect(id2.startsWith('test-topic-')).toBe(true);
        });

        it('should handle special characters', () => {
            const topic = "What's Up! (Hello World)";
            const slugId = generateSlugId(topic);

            expect(slugId).toMatch(/^whats-up-hello-world-[0-9a-f]{8}$/);
        });

        it('should truncate long topics', () => {
            const longTopic = "a".repeat(100);
            const slugId = generateSlugId(longTopic);
            // 50 chars from topic + 1 hyphen + 8 chars from uuid = 59 chars
            expect(slugId.length).toBe(59);
        });
    });
});
