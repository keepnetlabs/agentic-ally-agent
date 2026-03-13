import { describe, it, expect } from 'vitest';
import { generateBatchId } from './short-id';

describe('generateBatchId', () => {
  const ALPHANUMERIC = /^[A-Za-z0-9]+$/;

  it('should return a 12-character string by default', () => {
    const id = generateBatchId();
    expect(id).toHaveLength(12);
    expect(id).toMatch(ALPHANUMERIC);
  });

  it('should return only URL-safe alphanumeric characters', () => {
    for (let i = 0; i < 5; i++) {
      const id = generateBatchId();
      expect(id).toMatch(ALPHANUMERIC);
      expect(id).not.toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('should accept custom length', () => {
    expect(generateBatchId(6)).toHaveLength(6);
    expect(generateBatchId(20)).toHaveLength(20);
    expect(generateBatchId(1)).toHaveLength(1);
  });

  it('should produce different IDs on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ids.add(generateBatchId());
    }
    expect(ids.size).toBe(20);
  });
});
