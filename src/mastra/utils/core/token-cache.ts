/**
 * Token Cache Configuration
 */
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes cache
const MAX_CACHE_SIZE = 1000; // Cap at 1000 active tokens

/**
 * TokenCache Service
 * Implements an in-memory LRU-like cache with TTL enforcement.
 */
export class TokenCache {
    private cache = new Map<string, { isValid: boolean, expiresAt: number }>();

    constructor(
        private readonly ttlMs: number = CACHE_TTL_MS,
        private readonly maxSize: number = MAX_CACHE_SIZE
    ) { }

    get(token: string): boolean | null {
        const entry = this.cache.get(token);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(token); // Lazy expiration
            return null;
        }

        return entry.isValid;
    }

    set(token: string, isValid: boolean, customTtl?: number): void {
        this.ensureCapacity();
        const expiresAt = Date.now() + (customTtl ?? this.ttlMs);
        this.cache.set(token, { isValid, expiresAt });
    }

    private ensureCapacity(): void {
        if (this.cache.size >= this.maxSize) {
            // Map keys iterate in insertion order, so the first one is the oldest (LRU-ish)
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
    }
}

// Export singleton instance
export const tokenCache = new TokenCache();
