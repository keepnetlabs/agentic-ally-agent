import { describe, it, expect } from 'vitest';
import { deepMerge } from './object-utils';

describe('object-utils', () => {
    describe('deepMerge', () => {
        it('should merge two simple objects', () => {
            const target = { a: 1 };
            const source = { b: 2 };
            const result = deepMerge(target, source);
            expect(result).toEqual({ a: 1, b: 2 });
        });

        it('should recursively merge nested objects', () => {
            const target = { a: { x: 1, y: 1 } };
            const source = { a: { y: 2, z: 2 } };
            const result = deepMerge(target, source);
            expect(result).toEqual({ a: { x: 1, y: 2, z: 2 } });
        });

        it('should overwrite primitives', () => {
            const target = { a: 1 };
            const source = { a: 2 };
            const result = deepMerge(target, source);
            expect(result).toEqual({ a: 2 });
        });

        it('should handle arrays by overwriting (not merging contents)', () => {
            // Implementation check: source code says "Direct assignment for primitives and arrays"
            const target = { a: [1, 2] };
            const source = { a: [3, 4] };
            const result = deepMerge(target, source);
            expect(result).toEqual({ a: [3, 4] });
        });

        it('should handle null values in source', () => {
            const target = { a: 1 };
            const source = { a: null };
            const result = deepMerge(target, source);
            expect(result).toEqual({ a: null });
        });

        it('should do nothing if source is invalid', () => {
            const target = { a: 1 };
            // @ts-ignore
            const result = deepMerge(target, null);
            expect(result).toEqual(target);
        });

        it('should not mutate original target', () => {
            const target = { a: { b: 1 } };
            const source = { a: { b: 2 } };
            const result = deepMerge(target, source);
            expect(target.a.b).toBe(1);
            expect(result.a.b).toBe(2);
        });
    });
});
