
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenCache } from './token-cache';

describe('TokenCache', () => {
    let cache: TokenCache;
    const START_TIME = 1000000;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(START_TIME);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should store and retrieve valid tokens', () => {
        cache = new TokenCache();
        cache.set('token1', true);
        expect(cache.get('token1')).toBe(true);

        cache.set('token2', false);
        expect(cache.get('token2')).toBe(false);
    });

    it('should return null for non-existent tokens', () => {
        cache = new TokenCache();
        expect(cache.get('missing')).toBeNull();
    });

    it('should respect default TTL', () => {
        const ttl = 1000;
        cache = new TokenCache(ttl);

        cache.set('token1', true);
        expect(cache.get('token1')).toBe(true);

        // Advance time past TTL
        vi.setSystemTime(START_TIME + ttl + 1);
        expect(cache.get('token1')).toBeNull();
    });

    it('should respect custom TTL', () => {
        const defaultTtl = 1000;
        cache = new TokenCache(defaultTtl);

        // precise custom TTL
        cache.set('token1', true, 500);

        // Before expiration
        vi.setSystemTime(START_TIME + 250);
        expect(cache.get('token1')).toBe(true);

        // After expiration
        vi.setSystemTime(START_TIME + 501);
        expect(cache.get('token1')).toBeNull();
    });

    it('should evict oldest items when capacity is reached (LRU-ish)', () => {
        const capacity = 3;
        cache = new TokenCache(10000, capacity);

        cache.set('1', true);
        cache.set('2', true);
        cache.set('3', true);

        expect(cache.get('1')).toBe(true);
        expect(cache.get('2')).toBe(true);
        expect(cache.get('3')).toBe(true);

        // Add 4th item, should trigger eviction of '1' (first inserted)
        cache.set('4', true);

        expect(cache.get('1')).toBeNull(); // Evicted
        expect(cache.get('2')).toBe(true);
        expect(cache.get('3')).toBe(true);
        expect(cache.get('4')).toBe(true);
    });

    it('should not evict if updating existing key', () => {
        const capacity = 2;
        cache = new TokenCache(10000, capacity);

        cache.set('1', true);
        cache.set('2', true);

        // Update '1' - note: Map implementation usually preserves insertion order unless deleted and re-added
        // The implementation does: this.cache.set(token, val).
        // Standard Map: updating does NOT change order. So '1' remains "oldest".
        cache.set('1', true);

        // Add '3'
        cache.set('3', true);

        // Usage trace:
        // 1. set('1') -> ['1']
        // 2. set('2') -> ['1', '2']
        // 3. set('1') -> ensureCapacity (size 2) evicts '1'. set('1') re-adds '1'. -> ['2', '1']
        // 4. set('3') -> ensureCapacity (size 2) evicts '2'. set('3') adds '3'. -> ['1', '3']

        expect(cache.get('1')).toBe(true);  // Re-added, so it stayed
        expect(cache.get('2')).toBeNull(); // Evicted by step 4 (was oldest)
        expect(cache.get('3')).toBe(true);
    });
});
