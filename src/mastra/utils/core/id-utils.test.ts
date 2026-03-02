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

    it('should handle non-string and nullish inputs safely', () => {
      expect(isSafeId(undefined as any)).toBe(false);
      expect(isSafeId(null as any)).toBe(false);
      expect(isSafeId(123 as any)).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isSafeId('')).toBe(false);
    });

    it('should return true for exactly 3 alphanumeric chars', () => {
      expect(isSafeId('abc')).toBe(true);
      expect(isSafeId('123')).toBe(true);
    });

    it('should return false for strings with special chars', () => {
      expect(isSafeId('test@')).toBe(false);
      expect(isSafeId('test#id')).toBe(false);
      expect(isSafeId('test id')).toBe(false);
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

    it('should normalize non-string values when resulting id is safe', () => {
      expect(normalizeSafeId(123)).toBe('123');
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
      const topic = 'Phishing 101: Basic Concepts';
      const slugId = generateSlugId(topic);

      expect(slugId).toMatch(/^phishing-101-basic-concepts-[0-9a-f]{8}$/);
    });

    it('should generate unique slugs for same topic', () => {
      const topic = 'Test Topic';
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

    it('should collapse repeated spaces/hyphens in slug text', () => {
      const slugId = generateSlugId('A   B---C');
      expect(slugId).toMatch(/^a-b-c-[0-9a-f]{8}$/);
    });

    it('should still return UUID suffix even when slug becomes empty', () => {
      const slugId = generateSlugId('!!!@@@');
      expect(slugId).toMatch(/^-[0-9a-f]{8}$/);
    });

    it('should truncate long topics', () => {
      const longTopic = 'a'.repeat(100);
      const slugId = generateSlugId(longTopic);
      // 50 chars from topic + 1 hyphen + 8 chars from uuid = 59 chars
      expect(slugId.length).toBe(59);
    });
  });

  describe('isSafeId edge cases', () => {
    it('should accept ids with hyphens and underscores', () => {
      expect(isSafeId('my-id_123')).toBe(true);
      expect(isSafeId('abc')).toBe(true);
    });

    it('should reject ids shorter than 3 chars', () => {
      expect(isSafeId('ab')).toBe(false);
      expect(isSafeId('a')).toBe(false);
    });

    it('should reject ids with special characters', () => {
      expect(isSafeId('test@user')).toBe(false);
      expect(isSafeId('test.user')).toBe(false);
      expect(isSafeId('test user')).toBe(false);
    });
  });

  describe('normalizeSafeId edge cases', () => {
    it('should return undefined for empty string', () => {
      expect(normalizeSafeId('')).toBeUndefined();
    });

    it('should trim whitespace before validation', () => {
      expect(normalizeSafeId('  valid-id  ')).toBe('valid-id');
    });
  });

  describe('generateSlugId edge cases', () => {
    it('should handle empty string', () => {
      const slugId = generateSlugId('');
      expect(slugId).toMatch(/^-[0-9a-f]{8}$/);
    });

    it('should strip unicode and special chars', () => {
      const slugId = generateSlugId('Café & Bar™');
      expect(slugId).toMatch(/^caf-bar-[0-9a-f]{8}$/);
    });
  });
});
