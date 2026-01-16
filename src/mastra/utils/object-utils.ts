// Deep merge utility - handles nested objects properly
export function deepMerge<T>(target: T, source: any): T {
    if (!source) return target;

    const result = JSON.parse(JSON.stringify(target)); // Deep clone

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                // Recursive merge for nested objects

                result[key] = deepMerge((result as any)[key] || {}, source[key]);
            } else {
                // Direct assignment for primitives and arrays

                (result as any)[key] = source[key];
            }
        }
    }

    return result;
}
