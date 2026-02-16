// Deep merge utility - handles nested objects properly
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T> | Record<string, unknown> | null | undefined
): T {
  if (!source || typeof source !== 'object') return target;

  const result = JSON.parse(JSON.stringify(target)) as T;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const srcVal = source[key];
      if (typeof srcVal === 'object' && srcVal !== null && !Array.isArray(srcVal)) {
        const existing = (result as Record<string, unknown>)[key];
        // Merging object into primitive (number, string, etc.) would assign to primitive - throw
        if (existing !== null && existing !== undefined && typeof existing !== 'object') {
          throw new TypeError(`Cannot merge object into primitive at key "${key}"`);
        }
        // Use existing as base when it's object/array; otherwise {}
        const base = typeof existing === 'object' && existing !== null ? existing : {};
        (result as Record<string, unknown>)[key] = deepMerge(
          base as Record<string, unknown>,
          srcVal as Record<string, unknown>
        );
      } else {
        (result as Record<string, unknown>)[key] = srcVal;
      }
    }
  }

  return result;
}
